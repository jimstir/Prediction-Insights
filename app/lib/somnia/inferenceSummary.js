import { somniaChain } from "./chain";
import { SOMNIA_REQUEST_DEPOSIT_ETH } from "./constants";

export function getSomniaInferenceTxSummary() {
  return {
    chainName: somniaChain.name,
    chainId: somniaChain.id,
    depositEth: SOMNIA_REQUEST_DEPOSIT_ETH,
    currency: somniaChain.nativeCurrency.symbol,
  };
}
