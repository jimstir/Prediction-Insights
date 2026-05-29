import { createWalletClient, custom, parseEther } from "viem";
import { buildRecommendationsInferenceCalldata } from "./buildRecommendationsInference";
import { somniaChain } from "./chain";
import {
  SOMNIA_INFERENCE_FEE_ETH,
  SOMNIA_INFERENCE_GAS_LIMIT,
  SOMNIA_LLM_AGENT_ADDRESS,
  SOMNIA_LLM_INFERENCE_API_URL,
} from "./constants";

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

/**
 * Signs an inferString transaction for the Somnia LLM agent.
 * Calldata is built separately so prompt logic can evolve independently.
 */
export async function signSomniaInferenceTransaction(calldata, accountOverride) {
  await ensureSomniaNetwork();
  const { walletClient, account } = await createConnectedWalletClient();
  const from = accountOverride ?? account;

  const signedTx = await walletClient.signTransaction({
    account: from,
    chain: somniaChain,
    to: SOMNIA_LLM_AGENT_ADDRESS,
    data: calldata,
    value: parseEther(SOMNIA_INFERENCE_FEE_ETH),
    gas: SOMNIA_INFERENCE_GAS_LIMIT,
  });

  return signedTx;
}

/**
 * Submits a signed transaction to the Somnia LLM inference API.
 */
export async function submitSomniaInference(signedTx) {
  const response = await fetch(SOMNIA_LLM_INFERENCE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tx: signedTx }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Somnia inference request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

/**
 * Full flow: build calldata → sign tx → POST to Somnia inference API.
 */
export async function runSomniaRecommendationsInference(context = {}) {
  const calldata = buildRecommendationsInferenceCalldata(context);
  const signedTx = await signSomniaInferenceTransaction(
    calldata,
    context.walletAddress
  );
  return submitSomniaInference(signedTx);
}
