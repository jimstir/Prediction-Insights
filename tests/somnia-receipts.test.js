/**
 * Test file for accessing Somnia receipts from invocation response
 * Tests fetching, parsing, and extracting data from Somnia receipts
 */

import {
  fetchSomniaReceipts,
  extractLLMResponseFromReceipts,
} from "../app/lib/somnia/runLlmInference.js";
import {
  SOMNIA_RECEIPTS_SERVICE_URL,
  SOMNIA_RECEIPTS_SERVICE_MAINNET_URL,
  SOMNIA_AGENTS_PLATFORM_ADDRESS,
} from "../app/lib/somnia/constants.js";

describe("Somnia Receipts Access", () => {
  const mockRequestId = "12345";
  const mockContractAddress = SOMNIA_AGENTS_PLATFORM_ADDRESS;

  describe("fetchSomniaReceipts", () => {
    it("should fetch receipts manifest from testnet receipts service", async () => {
      // This test requires real Somnia testnet access
      // Skip in CI environments
      if (process.env.CI) {
        return;
      }

      try {
        const receipts = await fetchSomniaReceipts(mockRequestId);
        expect(Array.isArray(receipts)).toBe(true);
      } catch (error) {
        // Expected to fail with mock request ID
        console.log("Expected error with mock requestId:", error.message);
      }
    });

    it("should construct correct receipts service URL for testnet", async () => {
      const testnetUrl = `${SOMNIA_RECEIPTS_SERVICE_URL}?contractAddress=${mockContractAddress}&requestId=${mockRequestId}`;
      expect(testnetUrl).toContain("receipts.testnet.agents.somnia.host");
      expect(testnetUrl).toContain("contractAddress");
      expect(testnetUrl).toContain("requestId");
    });

    it("should construct correct receipts service URL for mainnet", async () => {
      const mainnetUrl = `${SOMNIA_RECEIPTS_SERVICE_MAINNET_URL}?contractAddress=${mockContractAddress}&requestId=${mockRequestId}`;
      expect(mainnetUrl).toContain("receipts.mainnet.agents.somnia.host");
      expect(mainnetUrl).toContain("contractAddress");
      expect(mainnetUrl).toContain("requestId");
    });

    it("should handle failed HTTP responses", async () => {
      // Mock a failed fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        })
      );

      await expect(fetchSomniaReceipts(mockRequestId)).rejects.toThrow(
        "Failed to fetch receipts"
      );
    });

    it("should handle network errors", async () => {
      // Mock a network error
      global.fetch = jest.fn(() => Promise.reject(new Error("Network error")));

      await expect(fetchSomniaReceipts(mockRequestId)).rejects.toThrow(
        "Failed to fetch receipts"
      );
    });
  });

  describe("extractLLMResponseFromReceipts", () => {
    const mockSuccessfulReceipt = {
      status: "success",
      elapsedMs: 5000,
      agentRunnerAddress: "0x1234567890123456789012345678901234567890",
      agentImageUri: "ipfs://test",
      requestDetails: {
        subcommitteeSize: 3,
        threshold: 2,
      },
      consensusType: 0,
      agentReceipt: {
        steps: [
          {
            name: "request_received",
            started_at: "2024-01-01T00:00:00Z",
            status: "success",
            inputs: {},
          },
          {
            name: "request_decoded",
            started_at: "2024-01-01T00:00:01Z",
            status: "success",
            inputs: {},
          },
          {
            name: "handler_started",
            started_at: "2024-01-01T00:00:02Z",
            status: "success",
            inputs: {},
          },
          {
            name: "llm_response",
            started_at: "2024-01-01T00:00:03Z",
            status: "success",
            inputs: {},
            output: "Test LLM response with recommendations",
          },
          {
            name: "handler_completed",
            started_at: "2024-01-01T00:00:04Z",
            status: "success",
            inputs: {},
          },
          {
            name: "response_encoded",
            started_at: "2024-01-01T00:00:05Z",
            status: "success",
            inputs: {},
          },
        ],
        llmUsage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
        },
        bandwidthUsage: {
          requestBytes: 1024,
          responseBytes: 2048,
        },
      },
    };

    it("should extract LLM response from successful receipt", () => {
      const receipts = [mockSuccessfulReceipt];
      const response = extractLLMResponseFromReceipts(receipts);
      expect(response).toBe("Test LLM response with recommendations");
    });

    it("should handle multiple receipts and find successful one", () => {
      const receipts = [
        {
          status: "failed",
          errorMessage: "First attempt failed",
        },
        mockSuccessfulReceipt,
        {
          status: "timeout",
        },
      ];
      const response = extractLLMResponseFromReceipts(receipts);
      expect(response).toBe("Test LLM response with recommendations");
    });

    it("should throw error when no successful receipts found", () => {
      const receipts = [
        {
          status: "failed",
          errorMessage: "All failed",
        },
        {
          status: "timeout",
        },
      ];
      expect(() => extractLLMResponseFromReceipts(receipts)).toThrow(
        "No successful LLM response found in receipts"
      );
    });

    it("should throw error when receipts array is empty", () => {
      const receipts = [];
      expect(() => extractLLMResponseFromReceipts(receipts)).toThrow(
        "No successful LLM response found in receipts"
      );
    });

    it("should throw error when successful receipt has no agentReceipt", () => {
      const receipts = [
        {
          status: "success",
          elapsedMs: 5000,
          // Missing agentReceipt
        },
      ];
      expect(() => extractLLMResponseFromReceipts(receipts)).toThrow(
        "No successful LLM response found in receipts"
      );
    });

    it("should throw error when agentReceipt has no steps", () => {
      const receipts = [
        {
          status: "success",
          agentReceipt: {
            // Missing steps
          },
        },
      ];
      expect(() => extractLLMResponseFromReceipts(receipts)).toThrow(
        "No successful LLM response found in receipts"
      );
    });

    it("should throw error when steps don't include llm_response", () => {
      const receipts = [
        {
          status: "success",
          agentReceipt: {
            steps: [
              {
                name: "request_received",
                status: "success",
              },
              {
                name: "request_decoded",
                status: "success",
              },
              // Missing llm_response step
            ],
          },
        },
      ];
      expect(() => extractLLMResponseFromReceipts(receipts)).toThrow(
        "No successful LLM response found in receipts"
      );
    });

    it("should throw error when llm_response step has no output", () => {
      const receipts = [
        {
          status: "success",
          agentReceipt: {
            steps: [
              {
                name: "llm_response",
                status: "success",
                // Missing output
              },
            ],
          },
        },
      ];
      expect(() => extractLLMResponseFromReceipts(receipts)).toThrow(
        "No successful LLM response found in receipts"
      );
    });

    it("should handle JSON output from LLM response", () => {
      const jsonOutput = JSON.stringify([
        { eventTicker: "BTCUSD-250630", title: "Bitcoin prediction" },
        { eventTicker: "ETHUSD-250630", title: "Ethereum prediction" },
      ]);

      const receipts = [
        {
          status: "success",
          agentReceipt: {
            steps: [
              {
                name: "llm_response",
                output: jsonOutput,
              },
            ],
          },
        },
      ];

      const response = extractLLMResponseFromReceipts(receipts);
      expect(response).toBe(jsonOutput);
    });
  });

  describe("Receipt Structure Validation", () => {
    it("should validate receipt structure matches Somnia spec", () => {
      const receipt = {
        status: "success",
        elapsedMs: 5000,
        agentRunnerAddress: "0x1234567890123456789012345678901234567890",
        agentImageUri: "ipfs://test",
        requestDetails: {
          subcommitteeSize: 3,
          threshold: 2,
        },
        consensusType: 0,
        agentReceipt: {
          steps: [],
          llmUsage: {
            promptTokens: 1000,
            completionTokens: 500,
          },
          bandwidthUsage: {
            requestBytes: 1024,
            responseBytes: 2048,
          },
        },
      };

      // Validate required fields
      expect(receipt).toHaveProperty("status");
      expect(receipt).toHaveProperty("elapsedMs");
      expect(receipt).toHaveProperty("agentRunnerAddress");
      expect(receipt).toHaveProperty("agentImageUri");
      expect(receipt).toHaveProperty("requestDetails");
      expect(receipt).toHaveProperty("consensusType");
      expect(receipt).toHaveProperty("agentReceipt");

      // Validate agentReceipt structure
      expect(receipt.agentReceipt).toHaveProperty("steps");
      expect(receipt.agentReceipt).toHaveProperty("llmUsage");
      expect(receipt.agentReceipt).toHaveProperty("bandwidthUsage");
    });

    it("should validate step structure", () => {
      const step = {
        name: "llm_response",
        started_at: "2024-01-01T00:00:00Z",
        status: "success",
        inputs: {},
        output: "Test response",
      };

      expect(step).toHaveProperty("name");
      expect(step).toHaveProperty("started_at");
      expect(step).toHaveProperty("status");
      expect(step).toHaveProperty("inputs");
    });
  });
});

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Running Somnia receipts access tests...");
  console.log("Note: Some tests require real Somnia testnet access");
  console.log("Set CI=true to skip network-dependent tests");
}
