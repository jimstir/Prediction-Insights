import { defineChain } from "viem";
import { SOMNIA_CHAIN_ID } from "./constants";

export const somniaChain = defineChain({
  id: SOMNIA_CHAIN_ID,
  name: SOMNIA_CHAIN_ID === 50312 ? "Somnia Testnet" : "Somnia Mainnet",
  nativeCurrency: {
    name: "SOMI",
    symbol: "SOMI",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        SOMNIA_CHAIN_ID === 50312
          ? "https://api.testnet.somnia.network/"
          : "https://api.infra.mainnet.somnia.network/",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url:
        SOMNIA_CHAIN_ID === 50312
          ? "https://explorer.testnet.somnia.network"
          : "https://explorer.somnia.network",
    },
  },
});
