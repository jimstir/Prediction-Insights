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

  try {
    const hash = await walletClient.writeContract({
      account,
      address: SOMNIA_AGENTS_PLATFORM_ADDRESS,
      abi: SOMNIA_AGENTS_PLATFORM_ABI,
      functionName: "createRequest",
      args: [BigInt(SOMNIA_LLM_AGENT_ID), encodedPayload, callbackSelector],
      value: parseEther(SOMNIA_REQUEST_DEPOSIT_ETH),
      gas: SOMNIA_INFERENCE_GAS_LIMIT,
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

  const { encodedPayload, callbackSelector } =
    await buildRecommendationsInferenceCalldata(context);

  const txHash = await sendSomniaInferenceTransaction(
    encodedPayload,
    callbackSelector,
    context.walletAddress
  );

  const { requestId, blockNumber } = await waitForRequestCreated(txHash);

  await waitForRequestFinalized(requestId, blockNumber);

  const receipts = await fetchSomniaReceiptsWithRetry(requestId);
  const llmResponse = extractLLMResponseFromReceipts(receipts);

  return {
    response: llmResponse,
    requestId: requestId.toString(),
    transactionHash: txHash,
    receipts,
  };
}
