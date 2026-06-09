import { defineChain } from "viem";
import { SOMNIA_CHAIN_ID } from "./constants";
import {
  isSomniaTestnet,
  SOMNIA_MAINNET_CHAIN_ID,
  SOMNIA_TESTNET_CHAIN_ID,
} from "./network";

export const somniaChain = defineChain({
  id: SOMNIA_CHAIN_ID,
  name: isSomniaTestnet(SOMNIA_CHAIN_ID) ? "Somnia Testnet" : "Somnia Mainnet",
  nativeCurrency: {
    name: "SOMI",
    symbol: "SOMI",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        isSomniaTestnet(SOMNIA_CHAIN_ID)
          ? "https://api.testnet.somnia.network/"
          : "https://api.infra.mainnet.somnia.network/",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url: isSomniaTestnet(SOMNIA_CHAIN_ID)
        ? "https://explorer.testnet.somnia.network"
        : "https://explorer.somnia.network",
    },
  },
});

export { SOMNIA_MAINNET_CHAIN_ID, SOMNIA_TESTNET_CHAIN_ID };
