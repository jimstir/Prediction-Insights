import { describe, expect, it } from "vitest";
import {
  assertAccountMatches,
  canSignSomniaTransactions,
  formatWalletError,
  WALLET_MODES,
} from "../app/lib/wallet/ethereum.js";

describe("wallet/ethereum", () => {
  it("allows Somnia signing only for MetaMask mode", () => {
    expect(canSignSomniaTransactions(WALLET_MODES.METAMASK)).toBe(false);
    expect(canSignSomniaTransactions(WALLET_MODES.READ_ONLY)).toBe(false);
    expect(canSignSomniaTransactions(null)).toBe(false);
  });

  it("asserts matching wallet addresses", () => {
    expect(() =>
      assertAccountMatches(
        "0xAbCdEf0123456789012345678901234567890AbCd",
        "0xabcdef0123456789012345678901234567890abcd"
      )
    ).not.toThrow();

    expect(() =>
      assertAccountMatches(
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222"
      )
    ).toThrow(/does not match/);
  });

  it("formats MetaMask rejection code 4001", () => {
    const error = { code: 4001, message: "User rejected" };
    expect(formatWalletError(error)).toBe("Transaction rejected in MetaMask.");
  });

  it("formats unknown chain code 4902", () => {
    const error = { code: 4902, message: "Unrecognized chain" };
    expect(formatWalletError(error)).toBe(
      "Somnia network is not configured in MetaMask."
    );
  });
});
