import { vi } from "vitest";
import { SOMNIA_MAINNET_CHAIN_ID } from "../../app/lib/somnia/network.js";

/**
 * Minimal EIP-1193 provider mock for MetaMask-style wallet tests.
 */
export function createMockEthereumProvider({
  accounts = ["0x742d35Cc6634C0532925a3b844Bc2e7595f61f0E"],
  chainId = `0x${SOMNIA_MAINNET_CHAIN_ID.toString(16)}`,
  onRequest,
} = {}) {
  const request = vi.fn(async (args) => {
    if (onRequest) {
      return onRequest(args);
    }

    switch (args.method) {
      case "eth_requestAccounts":
      case "eth_accounts":
        return accounts;
      case "eth_chainId":
        return chainId;
      case "wallet_switchEthereumChain":
      case "wallet_addEthereumChain":
        return null;
      default:
        throw new Error(`Unhandled provider method: ${args.method}`);
    }
  });

  return { request, isMetaMask: true };
}
