/** SomniaAgents platform contract ABI matching official documentation examples */
export const SOMNIA_AGENTS_PLATFORM_ABI = [
  {
    type: "function",
    name: "createRequest",
    inputs: [
      { type: "uint256", name: "agentId" },
      { type: "address", name: "callbackAddress" },
      { type: "bytes4", name: "callbackSelector" },
      { type: "bytes", name: "payload" }
    ],
    outputs: [{ type: "uint256", name: "requestId" }],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "getRequestDeposit",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getRequest",
    inputs: [{ type: "uint256", name: "requestId" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { type: "uint256", name: "id" },
          { type: "address", name: "requester" },
          { type: "address", name: "callbackAddress" },
          { type: "bytes4", name: "callbackSelector" },
          { type: "address[]", name: "subcommittee" },
          {
            type: "tuple[]",
            name: "responses",
            components: [
              { type: "address", name: "validator" },
              { type: "bytes", name: "result" },
              { type: "uint8", name: "status" },
              { type: "uint256", name: "receipt" },
              { type: "uint256", name: "timestamp" },
              { type: "uint256", name: "executionCost" }
            ]
          },
          { type: "uint256", name: "responseCount" },
          { type: "uint256", name: "failureCount" },
          { type: "uint256", name: "threshold" },
          { type: "uint256", name: "createdAt" },
          { type: "uint256", name: "deadline" },
          { type: "uint8", name: "status" },
          { type: "uint8", name: "consensusType" },
          { type: "uint256", name: "remainingBudget" },
          { type: "uint256", name: "perAgentBudget" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "RequestCreated",
    inputs: [
      { type: "uint256", name: "requestId", indexed: true },
      { type: "uint256", name: "agentId", indexed: true },
      { type: "uint256", name: "perAgentBudget", indexed: false },
      { type: "bytes", name: "payload", indexed: false },
      { type: "address[]", name: "subcommittee", indexed: false }
    ]
  },
  {
    type: "event",
    name: "RequestFinalized",
    inputs: [
      { type: "uint256", name: "requestId", indexed: true },
      { type: "uint8", name: "status", indexed: false }
    ]
  },
  {
    type: "error",
    name: "RequestNotFound",
    inputs: [{ name: "requestId", type: "uint256" }]
  }
];
