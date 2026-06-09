/**
 * ERC-8004 Identity Registry Utility
 * Manages agent identity registration and agentId assignment for wallet addresses
 */

import { getPrisma } from "../prisma";

/**
 * ERC-8004 Registration Metadata
 */
export const ERC8004_REGISTRATION = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "Prediction Market Recommendation Agent",
  description:
    "Generates personalized prediction market recommendations using on-chain LLM inference.",
  image: "https://prediction-insights.xyz/agent-avatar.png",
  active: true,
  x402Support: true,
  registrations: [
    {
      agentId: null, // Will be populated per user
      agentRegistry: null, // Will be set to registry contract address
    },
  ],
  supportedTrust: ["reputation"],
  capabilities: ["recommendations", "engagement-tracking", "profile-scoring"],
};

/**
 * Assign or retrieve agentId for a wallet address
 * Each wallet gets a unique agentId for on-chain identity
 *
 * @param {string} walletAddress - Wallet address to assign agentId to
 * @returns {Promise<number>} agentId assigned to wallet
 */
export async function getOrCreateAgentId(walletAddress) {
  if (!walletAddress) {
    throw new Error("Wallet address required");
  }

  const normalizedAddress = walletAddress.toLowerCase();

  try {
    const prisma = getPrisma();

    // Check if preference record exists with agentId
    let preference = await prisma.preference.findUnique({
      where: { wallet: normalizedAddress },
    });

    if (!preference) {
      throw new Error("Preference record not found. Create profile first.");
    }

    // If agentId not set, assign a new one
    if (!preference.agentId) {
      // Get the next available agentId
      const maxAgentId = await prisma.preference.findFirst({
        where: { agentId: { not: null } },
        orderBy: { agentId: "desc" },
        select: { agentId: true },
      });

      const nextAgentId = (maxAgentId?.agentId || 0) + 1;

      preference = await prisma.preference.update({
        where: { wallet: normalizedAddress },
        data: {
          agentId: nextAgentId,
          agentRegisteredAt: new Date(),
        },
      });
    }

    return preference.agentId;
  } catch (error) {
    console.error("Error getting/creating agentId:", error);
    throw error;
  }
}

/**
 * Get agentId for a wallet address (read-only)
 *
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<number|null>} agentId if assigned, null otherwise
 */
export async function getAgentId(walletAddress) {
  if (!walletAddress) {
    throw new Error("Wallet address required");
  }

  try {
    const prisma = getPrisma();
    const normalizedAddress = walletAddress.toLowerCase();

    const preference = await prisma.preference.findUnique({
      where: { wallet: normalizedAddress },
      select: { agentId: true },
    });

    return preference?.agentId || null;
  } catch (error) {
    console.error("Error getting agentId:", error);
    return null;
  }
}

/**
 * Create ERC-8004 registration metadata for a wallet's agent
 *
 * @param {string} walletAddress - Wallet address
 * @param {string} registryAddress - Agent registry contract address
 * @returns {Promise<Object>} ERC-8004 compliant registration object
 */
export async function createAgentRegistration(walletAddress, registryAddress) {
  const agentId = await getOrCreateAgentId(walletAddress);

  return {
    ...ERC8004_REGISTRATION,
    registrations: [
      {
        agentId,
        agentRegistry: registryAddress,
      },
    ],
    wallet: walletAddress,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verify agent registration on-chain (requires contract interaction)
 *
 * @param {string} walletAddress - Wallet address
 * @param {string} registryContractAddress - Agent registry contract address
 * @param {Object} provider - ethers.js provider
 * @returns {Promise<boolean>} Whether agent is registered
 */
export async function verifyAgentRegistration(
  walletAddress,
  registryContractAddress,
  provider
) {
  if (!walletAddress || !registryContractAddress) {
    throw new Error("Wallet and registry address required");
  }

  try {
    const agentId = await getAgentId(walletAddress);

    if (!agentId) {
      console.log("Agent not registered locally:", walletAddress);
      return false;
    }

    // Note: Actual on-chain verification would require contract interaction
    // This would call: AgentRegistry.isAgentRegistered(agentId)
    // For now, returning true if local record exists
    return true;
  } catch (error) {
    console.error("Error verifying agent registration:", error);
    return false;
  }
}

/**
 * Export agent registration as JSON file
 * Can be stored locally or submitted to registry
 *
 * @param {string} walletAddress - Wallet address
 * @param {string} registryAddress - Agent registry contract address
 * @returns {Promise<string>} JSON string of registration
 */
export async function exportAgentRegistration(walletAddress, registryAddress) {
  const registration = await createAgentRegistration(walletAddress, registryAddress);
  return JSON.stringify(registration, null, 2);
}
