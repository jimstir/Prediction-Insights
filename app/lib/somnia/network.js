import {
  SOMNIA_RECEIPTS_SERVICE_MAINNET_URL,
  SOMNIA_RECEIPTS_SERVICE_URL,
} from "./constants";

export const SOMNIA_MAINNET_CHAIN_ID = 5031;
export const SOMNIA_TESTNET_CHAIN_ID = 50312;

export function chainIdHex(chainId) {
  return `0x${chainId.toString(16)}`;
}

export function isSomniaTestnet(chainId) {
  return chainId === SOMNIA_TESTNET_CHAIN_ID;
}

export function getReceiptsServiceUrl(chainId) {
  return isSomniaTestnet(chainId)
    ? SOMNIA_RECEIPTS_SERVICE_URL
    : SOMNIA_RECEIPTS_SERVICE_MAINNET_URL;
}

/**
 * Prompts the injected wallet (e.g. MetaMask) to switch to the Somnia chain.
 * Adds the network first if the wallet does not recognize it (EIP-3085).
 */
export async function ensureSomniaNetwork(provider, chain) {
  const chainIdHexValue = chainIdHex(chain.id);

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
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls.default.http,
            blockExplorerUrls: chain.blockExplorers
              ? [chain.blockExplorers.default.url]
              : undefined,
          },
        ],
      });
      return;
    }
    throw switchError;
  }
}
