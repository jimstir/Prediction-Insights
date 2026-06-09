/**
 * ERC-8004 Contract Configuration
 * Contains deployed contract addresses for different networks
 */

// Network configurations
export const NETWORKS = {
  hardhat: {
    chainId: 31337,
    name: "Hardhat Local",
    rpc: "http://127.0.0.1:8545",
  },
  localhost: {
    chainId: 31337,
    name: "Local Development",
    rpc: "http://127.0.0.1:8545",
  },
  somnia: {
    chainId: 55,
    name: "Somnia Mainnet",
    rpc: process.env.SOMNIA_RPC_URL || "https://somnia-mainnet.xyz/rpc",
  },
  somniaTestnet: {
    chainId: 57,
    name: "Somnia Testnet",
    rpc: process.env.SOMNIA_TESTNET_RPC_URL || "https://testnet-rpc.somnia.xyz",
  },
};

// Contract addresses by network
// Update these after deployment
export const CONTRACTS = {
  // Hardhat local - will be updated after deploy.js runs
  hardhat: {
    identityRegistry: process.env.AGENT_IDENTITY_REGISTRY || "",
    reputationRegistry: process.env.REPUTATION_REGISTRY || "",
  },

  // Somnia Mainnet
  somnia: {
    identityRegistry: process.env.AGENT_IDENTITY_REGISTRY || "",
    reputationRegistry: process.env.REPUTATION_REGISTRY || "",
  },

  // Somnia Testnet
  somniaTestnet: {
    identityRegistry: process.env.AGENT_IDENTITY_REGISTRY_TESTNET || "",
    reputationRegistry: process.env.REPUTATION_REGISTRY_TESTNET || "",
  },
};

/**
 * Get contract addresses for current network
 * @param {number} chainId - Network chain ID
 * @returns {Object} Contract addresses
 */
export function getContractsByChainId(chainId) {
  switch (chainId) {
    case 31337:
      return CONTRACTS.hardhat;
    case 55:
      return CONTRACTS.somnia;
    case 57:
      return CONTRACTS.somniaTestnet;
    default:
      console.warn(`Unknown chainId: ${chainId}, using Somnia mainnet`);
      return CONTRACTS.somnia;
  }
}

/**
 * Get network info by chain ID
 * @param {number} chainId - Network chain ID
 * @returns {Object} Network information
 */
export function getNetworkByChainId(chainId) {
  switch (chainId) {
    case 31337:
      return NETWORKS.localhost;
    case 55:
      return NETWORKS.somnia;
    case 57:
      return NETWORKS.somniaTestnet;
    default:
      return NETWORKS.somnia;
  }
}

/**
 * Get ABI for AgentIdentityRegistry contract
 */
export const AGENT_IDENTITY_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string", name: "metadataURI", type: "string" },
    ],
    name: "registerAgent",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "agentId", type: "uint256" }],
    name: "getAgent",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "agentId", type: "uint256" },
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "string", name: "name", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "string", name: "metadataURI", type: "string" },
          { internalType: "bool", name: "active", type: "bool" },
          { internalType: "uint256", name: "registeredAt", type: "uint256" },
          { internalType: "uint256", name: "updatedAt", type: "uint256" },
        ],
        internalType: "struct IAgentIdentityRegistry.AgentMetadata",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "agentId", type: "uint256" }],
    name: "isAgentRegistered",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
];

/**
 * Get ABI for ReputationRegistry contract
 */
export const REPUTATION_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "agentId", type: "uint256" },
      { internalType: "address", name: "wallet", type: "address" },
      { internalType: "string", name: "attestationURI", type: "string" },
      { internalType: "uint256", name: "engagementScore", type: "uint256" },
      { internalType: "uint256", name: "recommendationCount", type: "uint256" },
    ],
    name: "submitAttestation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "agentId", type: "uint256" }],
    name: "getAgentReputation",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "agentId", type: "uint256" },
          { internalType: "uint256", name: "totalAttestation", type: "uint256" },
          { internalType: "uint256", name: "averageScore", type: "uint256" },
          { internalType: "uint256", name: "lastUpdated", type: "uint256" },
        ],
        internalType: "struct IReputationRegistry.ReputationScore",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
