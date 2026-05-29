/** Somnia mainnet LLM inference defaults — override via env when needed. */
export const SOMNIA_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_SOMNIA_CHAIN_ID ?? "50311"
);

export const SOMNIA_LLM_AGENT_ADDRESS =
  process.env.NEXT_PUBLIC_SOMNIA_LLM_AGENT_ADDRESS ??
  "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";

export const SOMNIA_LLM_INFERENCE_API_URL =
  process.env.NEXT_PUBLIC_SOMNIA_LLM_INFERENCE_API_URL ??
  "https://api.infra.mainnet.somnia.network/v1/agents/llm-inference";

/** STT/SOMI deposit fee for inferString (in ether units, e.g. "2.5"). */
export const SOMNIA_INFERENCE_FEE_ETH =
  process.env.NEXT_PUBLIC_SOMNIA_INFERENCE_FEE_ETH ?? "2.5";

export const SOMNIA_INFERENCE_GAS_LIMIT = 300000n;
