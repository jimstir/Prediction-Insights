/** Somnia mainnet LLM inference defaults — override via env when needed. */
export const SOMNIA_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_SOMNIA_CHAIN_ID ?? "5031"
);

/** SomniaAgents platform contract address (for createRequest calls) */
export const SOMNIA_AGENTS_PLATFORM_ADDRESS =
  process.env.NEXT_PUBLIC_SOMNIA_AGENTS_PLATFORM_ADDRESS ??
  (SOMNIA_CHAIN_ID === 50312
    ? "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776"
    : "0x5E5205CF39E766118C01636bED000A54D93163E6");

/** Somnia receipts service URLs */
export const SOMNIA_RECEIPTS_SERVICE_URL =
  process.env.NEXT_PUBLIC_SOMNIA_RECEIPTS_SERVICE_URL ??
  "https://receipts.testnet.agents.somnia.host";

export const SOMNIA_RECEIPTS_SERVICE_MAINNET_URL =
  "https://receipts.mainnet.agents.somnia.host";

/** LLM Agent ID (for use with platform contract) */
export const SOMNIA_LLM_AGENT_ID =
  process.env.NEXT_PUBLIC_SOMNIA_LLM_AGENT_ID ?? "12847293847561029384";

/** Deposit amount for createRequest (in ether units, e.g. "0.1") */
export const SOMNIA_REQUEST_DEPOSIT_ETH =
  process.env.NEXT_PUBLIC_SOMNIA_REQUEST_DEPOSIT_ETH ?? "0.1";

export const SOMNIA_INFERENCE_GAS_LIMIT = 3000000n;
