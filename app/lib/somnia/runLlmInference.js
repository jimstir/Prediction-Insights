import {
  createWalletClient,
  custom,
  parseEther,
  createPublicClient,
  http,
  decodeEventLog,
} from "viem";
import { buildRecommendationsInferenceCalldata } from "./buildRecommendationsInference";
import { somniaChain } from "./chain";
import {
  SOMNIA_REQUEST_DEPOSIT_ETH,
  SOMNIA_INFERENCE_GAS_LIMIT,
  SOMNIA_AGENTS_PLATFORM_ADDRESS,
  SOMNIA_LLM_AGENT_ID,
} from "./constants";
import { ensureSomniaNetwork, getReceiptsServiceUrl } from "./network";
import { SOMNIA_AGENTS_PLATFORM_ABI } from "./platformAbi";
import {
  assertAccountMatches,
  formatWalletError,
  getConnectedAccount,
  requireMetaMaskProvider,
} from "../wallet/ethereum";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createConnectedWalletClient() {
  const provider = requireMetaMaskProvider();
  const walletClient = createWalletClient({
    chain: somniaChain,
    transport: custom(provider),
  });
  const [account] = await walletClient.requestAddresses();
  if (!account) {
    throw new Error("Wallet did not return an account.");
  }
  return { walletClient, account: account.toLowerCase() };
}

function createPublicClientForChain() {
  return createPublicClient({
    chain: somniaChain,
    transport: http(somniaChain.rpcUrls.default.http[0]),
  });
}

/**
 * Sends a createRequest transaction to the SomniaAgents platform contract.
 */
export async function sendSomniaInferenceTransaction(
  encodedPayload,
  callbackSelector,
  expectedAddress
) {
  const provider = requireMetaMaskProvider();
  await ensureSomniaNetwork(provider, somniaChain);
  const { walletClient, account } = await createConnectedWalletClient();

  assertAccountMatches(expectedAddress, account);

  // Read deposit floor dynamic reserve from contract
  const publicClient = createPublicClientForChain();
  let reserve = 0n;
  try {
    reserve = await publicClient.readContract({
      address: SOMNIA_AGENTS_PLATFORM_ADDRESS,
      abi: SOMNIA_AGENTS_PLATFORM_ABI,
      functionName: "getRequestDeposit",
    });
  } catch (err) {
    console.warn("Could not read contract request deposit floor; using 0 fallback", err);
  }

  // reward = 0.07 SOMI * 3 = 0.21 SOMI (as per documentation specification)
  const reward = 70000000000000000n * 3n;
  const deposit = reserve + reward;
  console.log("SENDING SOMNIA INFERENCE TX:", {
    address: SOMNIA_AGENTS_PLATFORM_ADDRESS,
    agentId: SOMNIA_LLM_AGENT_ID,
    agentIdBigInt: BigInt(SOMNIA_LLM_AGENT_ID).toString(),
    callbackSelector,
    payloadLength: encodedPayload.length,
    deposit: deposit.toString()
  });

  try {
    const hash = await walletClient.writeContract({
      account,
      address: SOMNIA_AGENTS_PLATFORM_ADDRESS,
      abi: SOMNIA_AGENTS_PLATFORM_ABI,
      functionName: "createRequest",
      args: [
        BigInt(SOMNIA_LLM_AGENT_ID),
        "0x0000000000000000000000000000000000000000", // no callback address
        callbackSelector, // callback selector (usually 0x00000000)
        encodedPayload, // payload bytes containing agent function inputs
      ],
      value: deposit,
    });

    return hash;
  } catch (error) {
    const walletError = new Error(formatWalletError(error));
    walletError.cause = error;
    throw walletError;
  }
}

/**
 * Waits for the transaction receipt and extracts requestId from RequestCreated.
 */
export async function waitForRequestCreated(transactionHash) {
  const publicClient = createPublicClientForChain();

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
  });

  // Try standard decoding of RequestCreated event
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: SOMNIA_AGENTS_PLATFORM_ABI,
        eventName: "RequestCreated",
        data: log.data,
        topics: log.topics,
      });

      return {
        requestId: decoded.args.requestId,
        blockNumber: receipt.blockNumber,
      };
    } catch {
      continue;
    }
  }

  // Debug block: If not found, log details of the receipt logs to help diagnose ABI or mismatch issues
  console.error(`RequestCreated event not found in transaction receipt for hash ${transactionHash}`);
  console.error(`Transaction status: ${receipt.status}`);
  console.error(`Number of logs in receipt: ${receipt.logs.length}`);
  
  receipt.logs.forEach((log, index) => {
    console.error(`Log #${index}: address=${log.address}, topics=${JSON.stringify(log.topics)}, data=${log.data}`);
    // Try to decode against any event in ABI to see what actually matched
    try {
      const decodedAny = decodeEventLog({
        abi: SOMNIA_AGENTS_PLATFORM_ABI,
        data: log.data,
        topics: log.topics,
      });
      console.error(`Successfully decoded log #${index} as event "${decodedAny.eventName}":`, decodedAny.args);
    } catch (err) {
      console.error(`Failed to decode log #${index} against platform ABI: ${err.message}`);
    }
  });

  throw new Error("RequestCreated event not found in transaction receipt");
}

/**
 * Polls for RequestFinalized before fetching receipts.
 */
export async function waitForRequestFinalized(
  requestId,
  fromBlock,
  { timeoutMs = 120000, pollIntervalMs = 3000 } = {}
) {
  const publicClient = createPublicClientForChain();
  const deadline = Date.now() + timeoutMs;
  const id = BigInt(requestId);

  while (Date.now() < deadline) {
    const logs = await publicClient.getContractEvents({
      address: SOMNIA_AGENTS_PLATFORM_ADDRESS,
      abi: SOMNIA_AGENTS_PLATFORM_ABI,
      eventName: "RequestFinalized",
      args: { requestId: id },
      fromBlock,
      toBlock: "latest",
    });

    if (logs.length > 0) {
      return logs[0];
    }

    await sleep(pollIntervalMs);
  }

  console.warn(
    "RequestFinalized not observed within timeout; attempting receipts fetch anyway."
  );
  return null;
}

/**
 * Fetches receipts for a given requestId from Somnia receipts service.
 */
export async function fetchSomniaReceipts(requestId) {
  const receiptsUrl = getReceiptsServiceUrl(somniaChain.id);

  let response;
  try {
    response = await fetch(
      `${receiptsUrl}?contractAddress=${SOMNIA_AGENTS_PLATFORM_ADDRESS}&requestId=${requestId}`
    );
  } catch (error) {
    throw new Error(`Failed to fetch receipts: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch receipts: ${response.status} ${response.statusText}`
    );
  }

  const manifest = await response.json();

  const receipts = [];
  if (manifest.urls && Array.isArray(manifest.urls)) {
    for (const url of manifest.urls) {
      try {
        const receiptResponse = await fetch(url);
        if (receiptResponse.ok) {
          const receipt = await receiptResponse.json();
          receipts.push(receipt);
        }
      } catch (error) {
        console.warn(`Failed to fetch receipt from ${url}:`, error);
      }
    }
  }

  return receipts;
}

/**
 * Retries receipts fetch until LLM output is available or attempts are exhausted.
 */
export async function fetchSomniaReceiptsWithRetry(
  requestId,
  { maxAttempts = 12, delayMs = 5000 } = {}
) {
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const receipts = await fetchSomniaReceipts(requestId);
      if (receipts.length > 0) {
        extractLLMResponseFromReceipts(receipts);
        return receipts;
      }
      lastError = new Error("Receipt manifest returned no receipt documents yet.");
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  throw lastError || new Error("Failed to fetch Somnia receipts.");
}

/**
 * Extracts the LLM response from receipts.
 */
export function extractLLMResponseFromReceipts(receipts) {
  for (const receipt of receipts) {
    if (receipt.status === "success" && receipt.agentReceipt) {
      const steps = receipt.agentReceipt.steps || [];
      const llmResponseStep = steps.find(
        (step) => step.name === "llm_response"
      );
      if (llmResponseStep && llmResponseStep.output) {
        return llmResponseStep.output;
      }
    }
  }
  throw new Error("No successful LLM response found in receipts");
}

/**
 * Full flow: build calldata → MetaMask tx → wait for events → fetch receipts.
 */
export async function runSomniaRecommendationsInference(context = {}) {
  const connectedAccount = await getConnectedAccount();
  if (!connectedAccount) {
    throw new Error(
      "Connect with MetaMask to sign Somnia transactions. Read-only addresses cannot invoke the LLM."
    );
  }

  assertAccountMatches(context.walletAddress, connectedAccount);

  const { encodedPayload, callbackSelector, _meta } =
    await buildRecommendationsInferenceCalldata(context);

  const txHash = await sendSomniaInferenceTransaction(
    encodedPayload,
    callbackSelector,
    context.walletAddress
  );

  const { requestId, blockNumber } = await waitForRequestCreated(txHash);

  const finalizationLog = await waitForRequestFinalized(requestId, blockNumber);

  let receipts = [];
  let llmResponse = "";

  try {
    // Attempt 1: Fetch receipts from off-chain receipts service (with 3 quick attempts)
    receipts = await fetchSomniaReceiptsWithRetry(requestId, { maxAttempts: 3, delayMs: 4000 });
    llmResponse = extractLLMResponseFromReceipts(receipts);
  } catch (error) {
    console.warn("Somnia receipts service failed or timed out. Fetching response directly from on-chain transaction calldata...", error);
    
    // Attempt 2: Retrieve response directly from blockchain finalization transaction calldata
    try {
      if (finalizationLog && finalizationLog.transactionHash) {
        const publicClient = createPublicClientForChain();
        const tx = await publicClient.getTransaction({ hash: finalizationLog.transactionHash });
        
        let rawText = "";
        const calldata = tx.input.slice(10); // Strip selector
        for (let i = 0; i < calldata.length; i += 2) {
          const charCode = parseInt(calldata.slice(i, i + 2), 16);
          if (charCode >= 32 && charCode <= 126) {
            rawText += String.fromCharCode(charCode);
          } else {
            rawText += " ";
          }
        }

        // Clean text and extract JSON or clean text
        const cleanedText = rawText.replace(/\s+/g, " ").trim();
        console.log("Raw on-chain extracted text:", cleanedText);
        
        // Scan for a valid JSON object or array by checking successive indices of '{' or '['
        let parsedJson = false;
        
        // Try parsing JSON object first
        let objStart = cleanedText.indexOf('{');
        while (objStart !== -1) {
          const objEnd = cleanedText.lastIndexOf('}');
          if (objEnd > objStart) {
            const candidate = cleanedText.slice(objStart, objEnd + 1);
            try {
              JSON.parse(candidate);
              llmResponse = candidate;
              parsedJson = true;
              console.log("On-chain response parsed successfully as JSON object.");
              break;
            } catch (e) {
              objStart = cleanedText.indexOf('{', objStart + 1);
            }
          } else {
            break;
          }
        }
        
        // If not found, try parsing JSON array
        if (!parsedJson) {
          let arrayStart = cleanedText.indexOf('[');
          while (arrayStart !== -1) {
            const arrayEnd = cleanedText.lastIndexOf(']');
            if (arrayEnd > arrayStart) {
              const candidate = cleanedText.slice(arrayStart, arrayEnd + 1);
              try {
                JSON.parse(candidate);
                llmResponse = candidate;
                parsedJson = true;
                console.log("On-chain response parsed successfully as JSON array.");
                break;
              } catch (e) {
                arrayStart = cleanedText.indexOf('[', arrayStart + 1);
              }
            } else {
              break;
            }
          }
        }

        if (!parsedJson) {
          // Fallback to sentence parsing or cleaned text if no valid JSON was found
          const llmMatch = cleanedText.match(/(?:I\s+am|[A-Z][a-z]+)[^.!?]+[.!?]/g);
          llmResponse = llmMatch ? llmMatch.join(" ") : cleanedText;
        }
        
        console.log("Decoded on-chain LLM Response:", llmResponse);
      } else {
        throw new Error("No finalization log transaction hash available to extract on-chain response.");
      }
    } catch (fallbackError) {
      console.error("Failed to extract response on-chain:", fallbackError);
      throw new Error(`Failed to retrieve LLM response from both receipts and on-chain logs: ${fallbackError.message}`);
    }
  }

  // Map and normalize recommendations using the candidates list metadata
  let mappedResponse = llmResponse;
  try {
    const parsed = JSON.parse(llmResponse);
    // Support both the recommendation.md schema: { recommendations: [ { market_id, reasoning, primary_topic } ] }
    // and direct arrays [ { eventTicker, title, matchReason } ]
    const recommendationsList = parsed.recommendations || (Array.isArray(parsed) ? parsed : null);
    
    if (recommendationsList && Array.isArray(recommendationsList)) {
      const candidatesList = _meta?.candidatesList || [];
      
      const mappedList = recommendationsList.map((rec) => {
        const marketId = rec.market_id || rec.eventTicker || rec.kalshiId || "";
        const candidate = candidatesList.find(
          (c) => c.eventTicker.toLowerCase() === marketId.toLowerCase()
        );
        
        return {
          eventTicker: marketId,
          kalshiId: marketId,
          title: candidate ? candidate.title : (rec.title || marketId),
          subtitle: candidate ? candidate.subtitle : "",
          category: rec.primary_topic || (candidate ? candidate.category : "uncategorized"),
          matchReason: Array.isArray(rec.reasoning) ? rec.reasoning.join(" ") : rec.reasoning || rec.matchReason || "",
          recommendationScore: rec.recommendation_score || 1.0,
          similar_markets: candidate ? candidate.similar_markets : [],
        };
      });
      
      mappedResponse = JSON.stringify(mappedList);
    }
  } catch (err) {
    console.warn("Failed to map/normalize LLM response:", err.message);
  }

  return {
    response: mappedResponse,
    requestId: requestId.toString(),
    transactionHash: txHash,
    receipts,
    candidatesList: _meta?.candidatesList || [],
  };
}
