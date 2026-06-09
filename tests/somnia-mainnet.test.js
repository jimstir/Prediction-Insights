/**
 * Somnia mainnet configuration and MetaMask wallet flow tests.
 *
 * Run only mainnet tests:
 *   npm run test:mainnet
 *
 * Optional live mainnet smoke test:
 *   RUN_SOMNIA_MAINNET_LIVE=true SOMNIA_MAINNET_REQUEST_ID=<id> npm run test:mainnet
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineChain } from "viem";
import { encodeFunctionData } from "viem";
import {
  SOMNIA_MAINNET_CHAIN_ID,
  SOMNIA_TESTNET_CHAIN_ID,
  chainIdHex,
  ensureSomniaNetwork,
  getReceiptsServiceUrl,
  isSomniaTestnet,
} from "../app/lib/somnia/network.js";
import {
  SOMNIA_AGENTS_PLATFORM_ADDRESS,
  SOMNIA_LLM_AGENT_ID,
  SOMNIA_RECEIPTS_SERVICE_MAINNET_URL,
  SOMNIA_REQUEST_DEPOSIT_ETH,
} from "../app/lib/somnia/constants.js";
import { SOMNIA_AGENTS_PLATFORM_ABI } from "../app/lib/somnia/platformAbi.js";
import { LLM_INFER_STRING_ABI } from "../app/lib/somnia/llmAgentAbi.js";
import { extractLLMResponseFromReceipts } from "../app/lib/somnia/runLlmInference.js";
import { createMockEthereumProvider } from "./helpers/mockEthereumProvider.js";

const somniaMainnetChain = defineChain({
  id: SOMNIA_MAINNET_CHAIN_ID,
  name: "Somnia Mainnet",
  nativeCurrency: { name: "SOMI", symbol: "SOMI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.infra.mainnet.somnia.network/"] },
  },
  blockExplorers: {
    default: { name: "Somnia Explorer", url: "https://explorer.somnia.network" },
  },
});

describe("Somnia mainnet configuration", () => {
  it("uses chain id 5031 for mainnet", () => {
    expect(SOMNIA_MAINNET_CHAIN_ID).toBe(5031);
    expect(SOMNIA_TESTNET_CHAIN_ID).toBe(50312);
    expect(isSomniaTestnet(SOMNIA_MAINNET_CHAIN_ID)).toBe(false);
    expect(isSomniaTestnet(SOMNIA_TESTNET_CHAIN_ID)).toBe(true);
  });

  it("encodes mainnet chain id as 0x13a7 for wallet_switchEthereumChain", () => {
    expect(chainIdHex(SOMNIA_MAINNET_CHAIN_ID)).toBe("0x13a7");
    expect(chainIdHex(SOMNIA_TESTNET_CHAIN_ID)).toBe("0xc488");
  });

  it("selects the mainnet receipts service URL", () => {
    const url = getReceiptsServiceUrl(SOMNIA_MAINNET_CHAIN_ID);
    expect(url).toBe(SOMNIA_RECEIPTS_SERVICE_MAINNET_URL);
    expect(url).toContain("receipts.mainnet.agents.somnia.host");
  });

  it("does not use testnet receipts URL on mainnet", () => {
    const url = getReceiptsServiceUrl(SOMNIA_MAINNET_CHAIN_ID);
    expect(url).not.toContain("receipts.testnet.agents.somnia.host");
  });

  it("builds a mainnet createRequest calldata shape", () => {
    const encodedPayload = encodeFunctionData({
      abi: LLM_INFER_STRING_ABI,
      functionName: "inferString",
      args: [
        "Recommend Kalshi markets for this user.",
        "You are a prediction market assistant.",
        false,
        [],
      ],
    });

    const createRequestData = encodeFunctionData({
      abi: SOMNIA_AGENTS_PLATFORM_ABI,
      functionName: "createRequest",
      args: [BigInt(SOMNIA_LLM_AGENT_ID), encodedPayload, "0x00000000"],
    });

    expect(createRequestData).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(SOMNIA_AGENTS_PLATFORM_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(SOMNIA_REQUEST_DEPOSIT_ETH).toBeDefined();
  });
});

describe("MetaMask → Somnia mainnet network switch", () => {
  it("calls wallet_switchEthereumChain with mainnet chain id 0x13a7", async () => {
    const provider = createMockEthereumProvider();

    await ensureSomniaNetwork(provider, somniaMainnetChain);

    expect(provider.request).toHaveBeenCalledWith({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x13a7" }],
    });
  });

  it("adds Somnia mainnet when the wallet returns error 4902", async () => {
    const provider = createMockEthereumProvider({
      onRequest: async ({ method }) => {
        if (method === "wallet_switchEthereumChain") {
          const error = new Error("Unrecognized chain");
          error.code = 4902;
          throw error;
        }
        if (method === "wallet_addEthereumChain") {
          return null;
        }
        return null;
      },
    });

    await ensureSomniaNetwork(provider, somniaMainnetChain);

    expect(provider.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "wallet_addEthereumChain",
        params: [
          expect.objectContaining({
            chainId: "0x13a7",
            chainName: "Somnia Mainnet",
            rpcUrls: ["https://api.infra.mainnet.somnia.network/"],
          }),
        ],
      })
    );
  });
});

describe("Somnia mainnet receipts parsing", () => {
  it("extracts LLM output from a mainnet-style receipt manifest", () => {
    const receipts = [
      {
        status: "success",
        agentReceipt: {
          steps: [
            {
              name: "llm_response",
              output: JSON.stringify([
                { eventTicker: "KXBTC-26JUN", title: "Bitcoin above 100k" },
              ]),
            },
          ],
        },
      },
    ];

    const response = extractLLMResponseFromReceipts(receipts);
    const parsed = JSON.parse(response);
    expect(parsed[0].eventTicker).toBe("KXBTC-26JUN");
  });
});

describe("Somnia mainnet live integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it.skipIf(process.env.RUN_SOMNIA_MAINNET_LIVE !== "true")(
    "fetches receipts manifest from mainnet service (smoke)",
    async () => {
      const requestId = process.env.SOMNIA_MAINNET_REQUEST_ID;
      if (!requestId) {
        console.warn(
          "Set SOMNIA_MAINNET_REQUEST_ID to run the live mainnet receipts smoke test."
        );
        return;
      }

      const url = `${getReceiptsServiceUrl(SOMNIA_MAINNET_CHAIN_ID)}?contractAddress=${SOMNIA_AGENTS_PLATFORM_ADDRESS}&requestId=${requestId}`;
      const response = await fetch(url);

      expect(response.ok).toBe(true);
      const manifest = await response.json();
      expect(manifest).toBeDefined();
    },
    30000
  );
});
