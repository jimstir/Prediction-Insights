import { createWalletClient, custom, parseEther, createPublicClient, http } from "viem";
import { buildRecommendationsInferenceCalldata } from "./buildRecommendationsInference";
import { somniaChain } from "./chain";
import {
  SOMNIA_REQUEST_DEPOSIT_ETH,
  SOMNIA_INFERENCE_GAS_LIMIT,
  SOMNIA_AGENTS_PLATFORM_ADDRESS,
  SOMNIA_LLM_AGENT_ID,
  SOMNIA_RECEIPTS_SERVICE_URL,
  SOMNIA_RECEIPTS_SERVICE_MAINNET_URL,
} from "./constants";
import { SOMNIA_AGENTS_PLATFORM_ABI } from "./platformAbi";

function getEthereumProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error(
      "No Web3 wallet found. Connect a browser wallet that supports Somnia."
    );
  }
  return window.ethereum;
}

function chainIdHex(chainId) {
  return `0x${chainId.toString(16)}`;
}

async function ensureSomniaNetwork() {
  const provider = getEthereumProvider();
  const chainIdHexValue = chainIdHex(somniaChain.id);

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHexValue }],
    });
  } catch (switchError) {
    if (switchError?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHexValue,
            chainName: somniaChain.name,
            nativeCurrency: somniaChain.nativeCurrency,
            rpcUrls: somniaChain.rpcUrls.default.http,
            blockExplorerUrls: [somniaChain.blockExplorers.default.url],
          },
        ],
      });
      return;
    }
    throw switchError;
  }
}

async function createConnectedWalletClient() {
  const provider = getEthereumProvider();
  const walletClient = createWalletClient({
    chain: somniaChain,
    transport: custom(provider),
  });
  const [account] = await walletClient.requestAddresses();
  if (!account) {
    throw new Error("Wallet did not return an account.");
  }
  return { walletClient, account };
}

function createPublicClientForChain() {
  return createPublicClient({
    chain: somniaChain,
    transport: http(somniaChain.rpcUrls.default.http[0]),
  });
}

/**
 * Sends a createRequest transaction to the SomniaAgents platform contract.
 * This replaces the old API-based approach with proper on-chain smart contract calls.
 */
export async function sendSomniaInferenceTransaction(
  encodedPayload,
  callbackSelector,
  accountOverride
) {
  await ensureSomniaNetwork();
  const { walletClient, account } = await createConnectedWalletClient();
  const from = accountOverride ?? account;

  const hash = await walletClient.writeContract({
    account: from,
    address: SOMNIA_AGENTS_PLATFORM_ADDRESS,
    abi: SOMNIA_AGENTS_PLATFORM_ABI,
    functionName: "createRequest",
    args: [BigInt(SOMNIA_LLM_AGENT_ID), encodedPayload, callbackSelector],
    value: parseEther(SOMNIA_REQUEST_DEPOSIT_ETH),
    gas: SOMNIA_INFERENCE_GAS_LIMIT,
  });

  return hash;
}

/**
 * Listens for RequestCreated event to get the requestId.
 */
export async function waitForRequestCreated(transactionHash) {
  const publicClient = createPublicClientForChain();
  
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
  });

  // Find RequestCreated event in logs
  const requestCreatedEvent = receipt.logs.find((log) => {
    try {
      const decoded = publicClient.decodeEventLog({
        abi: SOMNIA_AGENTS_PLATFORM_ABI,
        eventName: "RequestCreated",
        data: log.data,
        topics: log.topics,
      });
      return decoded !== null;
    } catch {
      return false;
    }
  });

  if (!requestCreatedEvent) {
    throw new Error("RequestCreated event not found in transaction receipt");
  }

  const decoded = publicClient.decodeEventLog({
    abi: SOMNIA_AGENTS_PLATFORM_ABI,
    eventName: "RequestCreated",
    data: requestCreatedEvent.data,
    topics: requestCreatedEvent.topics,
  });

  return decoded.requestId;
}

/**
 * Fetches receipts for a given requestId from Somnia receipts service.
 */
export async function fetchSomniaReceipts(requestId) {
  const receiptsUrl =
    somniaChain.id === 50312
      ? SOMNIA_RECEIPTS_SERVICE_URL
      : SOMNIA_RECEIPTS_SERVICE_MAINNET_URL;

  const response = await fetch(
    `${receiptsUrl}?contractAddress=${SOMNIA_AGENTS_PLATFORM_ADDRESS}&requestId=${requestId}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch receipts: ${response.status} ${response.statusText}`
    );
  }

  const manifest = await response.json();
  
  // Fetch individual receipt URLs from manifest
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
 * Extracts the LLM response from receipts.
 * Looks for the llm_response step output in the agentReceipt.
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
 * Full flow: build calldata → send createRequest transaction → wait for RequestCreated → fetch receipts → extract LLM response.
 */
export async function runSomniaRecommendationsInference(context = {}) {
  // Build calldata (async - fetches Kalshi candidates and user preferences)
  const { encodedPayload, callbackSelector } =
    await buildRecommendationsInferenceCalldata(context);

  // Send createRequest transaction to platform contract
  const txHash = await sendSomniaInferenceTransaction(
    encodedPayload,
    callbackSelector,
    context.walletAddress
  );

  // Wait for RequestCreated event to get requestId
  const requestId = await waitForRequestCreated(txHash);

  // Wait for consensus and finalization (typically 30-60 seconds)
  // In production, this should poll for RequestFinalized event
  await new Promise((resolve) => setTimeout(resolve, 45000));

  // Fetch receipts from Somnia receipts service
  const receipts = await fetchSomniaReceipts(requestId);

  // Extract LLM response from receipts
  const llmResponse = extractLLMResponseFromReceipts(receipts);

  return {
    response: llmResponse,
    requestId: requestId.toString(),
    transactionHash: txHash,
    receipts: receipts,
  };
}
