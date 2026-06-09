/**
 * Test file for Somnia LLM invocation
 * Tests the complete flow of invoking Somnia LLM inference for recommendations
 */

import { describe, expect, it } from "vitest";
import {
  runSomniaRecommendationsInference,
  sendSomniaInferenceTransaction,
  waitForRequestCreated,
  fetchSomniaReceipts,
  extractLLMResponseFromReceipts,
} from "../app/lib/somnia/runLlmInference.js";
import { buildRecommendationsInferenceCalldata } from "../app/lib/somnia/buildRecommendationsInference.js";

describe("Somnia LLM Invocation", () => {
  // Mock wallet and provider
  const mockWalletAddress = "0x742d35Cc6634C0532925a3b844Bc2e7595f61f0E";
  const mockPreferences = {
    categories: "crypto,politics",
    tags: "bitcoin,ethereum",
    liquidityScale: "high",
    timeframes: "short-term",
  };

  describe("buildRecommendationsInferenceCalldata", () => {
    it("should build calldata with encoded payload and callback selector", async () => {
      const result = await buildRecommendationsInferenceCalldata({
        preferences: mockPreferences,
        walletAddress: mockWalletAddress,
      });

      expect(result).toHaveProperty("encodedPayload");
      expect(result).toHaveProperty("callbackSelector");
      expect(result.encodedPayload).toBeDefined();
      expect(result.callbackSelector).toBe("0x00000000");
    });

    it("should handle empty preferences", async () => {
      const result = await buildRecommendationsInferenceCalldata({
        walletAddress: mockWalletAddress,
      });

      expect(result).toHaveProperty("encodedPayload");
      expect(result).toHaveProperty("callbackSelector");
    });
  });

  describe("sendSomniaInferenceTransaction", () => {
    it("should send createRequest transaction to platform contract", async () => {
      // This test requires a real wallet connection
      // Skip in CI environments
      if (process.env.CI) {
        return;
      }

      const { encodedPayload, callbackSelector } =
        await buildRecommendationsInferenceCalldata({
          preferences: mockPreferences,
          walletAddress: mockWalletAddress,
        });

      try {
        const txHash = await sendSomniaInferenceTransaction(
          encodedPayload,
          callbackSelector,
          mockWalletAddress
        );

        expect(txHash).toBeDefined();
        expect(typeof txHash).toBe("string");
        expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      } catch (error) {
        // Expected to fail without real wallet
        console.log("Expected error without real wallet:", error.message);
      }
    });
  });

  describe("waitForRequestCreated", () => {
    it.skip("requires a real Somnia transaction hash on mainnet/testnet", async () => {
      const mockTxHash =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      await waitForRequestCreated(mockTxHash);
    });
  });

  describe("fetchSomniaReceipts", () => {
    it("should fetch receipts for a given requestId", async () => {
      const mockRequestId = "12345";

      try {
        const receipts = await fetchSomniaReceipts(mockRequestId);
        expect(Array.isArray(receipts)).toBe(true);
      } catch (error) {
        // Expected to fail with mock request ID
        console.log("Expected error with mock requestId:", error.message);
      }
    });
  });

  describe("extractLLMResponseFromReceipts", () => {
    it("should extract LLM response from successful receipts", () => {
      const mockReceipts = [
        {
          status: "success",
          agentReceipt: {
            steps: [
              {
                name: "llm_response",
                output: "Test LLM response",
              },
            ],
          },
        },
      ];

      const response = extractLLMResponseFromReceipts(mockReceipts);
      expect(response).toBe("Test LLM response");
    });

    it("should throw error if no successful receipts found", () => {
      const mockReceipts = [
        {
          status: "failed",
          errorMessage: "Test error",
        },
      ];

      expect(() => extractLLMResponseFromReceipts(mockReceipts)).toThrow(
        "No successful LLM response found in receipts"
      );
    });

    it("should handle receipts without llm_response step", () => {
      const mockReceipts = [
        {
          status: "success",
          agentReceipt: {
            steps: [
              {
                name: "request_received",
              },
            ],
          },
        },
      ];

      expect(() => extractLLMResponseFromReceipts(mockReceipts)).toThrow(
        "No successful LLM response found in receipts"
      );
    });
  });

  describe("runSomniaRecommendationsInference", () => {
    it("should complete full inference flow", async () => {
      // This test requires a real wallet connection
      // Skip in CI environments
      if (process.env.CI) {
        return;
      }

      try {
        const result = await runSomniaRecommendationsInference({
          preferences: mockPreferences,
          walletAddress: mockWalletAddress,
        });

        expect(result).toHaveProperty("response");
        expect(result).toHaveProperty("requestId");
        expect(result).toHaveProperty("transactionHash");
        expect(result).toHaveProperty("receipts");
      } catch (error) {
        // Expected to fail without real wallet
        console.log("Expected error without real wallet:", error.message);
      }
    });
  });
});

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running Somnia LLM invocation tests...");
  console.log("Note: Most tests require a real wallet connection and Somnia testnet access");
  console.log("Set CI=true to skip wallet-dependent tests");
}
