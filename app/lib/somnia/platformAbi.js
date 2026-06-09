/** SomniaAgents platform contract ABI for createRequest and events */
export const SOMNIA_AGENTS_PLATFORM_ABI = [
  {
    type: "function",
    name: "createRequest",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "encodedPayload", type: "bytes" },
      { name: "callbackSelector", type: "bytes4" },
    ],
    outputs: [{ name: "requestId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "event",
    name: "RequestCreated",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "agentId", type: "uint256", indexed: false },
      { name: "callbackSelector", type: "bytes4", indexed: false },
      { name: "subcommitteeSize", type: "uint256", indexed: false },
      { name: "threshold", type: "uint256", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
      { name: "perAgentBudget", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RequestFinalized",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "status", type: "uint8", indexed: false },
      { name: "consensusValue", type: "bytes", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CallbackExecuted",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "target", type: "address", indexed: true },
      { name: "success", type: "bool", indexed: false },
    ],
  },
];
