export const WALLET_MODES = {
  METAMASK: "metamask",
  READ_ONLY: "readOnly",
};

export function isMetaMaskAvailable() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export function requireMetaMaskProvider() {
  if (!isMetaMaskAvailable()) {
    throw new Error(
      "MetaMask is required. Install the browser extension and connect your wallet."
    );
  }
  return window.ethereum;
}

export async function connectMetaMask() {
  const provider = requireMetaMaskProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" });

  if (!accounts?.[0]) {
    throw new Error("MetaMask did not return an account.");
  }

  return accounts[0].toLowerCase();
}

export async function getConnectedAccount() {
  if (!isMetaMaskAvailable()) {
    return null;
  }

  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts?.[0]?.toLowerCase() ?? null;
}

export function assertAccountMatches(expectedAddress, actualAddress) {
  if (!expectedAddress || !actualAddress) {
    return;
  }

  if (expectedAddress.toLowerCase() !== actualAddress.toLowerCase()) {
    throw new Error(
      "Connected MetaMask account does not match the wallet shown in the app. Switch accounts in MetaMask or reconnect."
    );
  }
}

export function canSignSomniaTransactions(walletMode) {
  return walletMode === WALLET_MODES.METAMASK && isMetaMaskAvailable();
}

/**
 * Maps EIP-1193 / MetaMask errors to user-facing messages.
 */
export function formatWalletError(error) {
  if (!error) {
    return "Unknown wallet error.";
  }

  if (error.code === 4001) {
    return "Transaction rejected in MetaMask.";
  }

  if (error.code === 4902) {
    return "Somnia network is not configured in MetaMask.";
  }

  if (error.code === -32002) {
    return "MetaMask already has a pending request. Open MetaMask and try again.";
  }

  return error.message || "Wallet request failed.";
}
