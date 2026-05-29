import { defineChain } from "viem";
import { SOMNIA_CHAIN_ID } from "./constants";

export const somniaChain = defineChain({
  id: SOMNIA_CHAIN_ID,
  name: "Somnia",
  nativeCurrency: {
    name: "SOMI",
    symbol: "SOMI",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://api.infra.mainnet.somnia.network/"],
    },
  },
});
