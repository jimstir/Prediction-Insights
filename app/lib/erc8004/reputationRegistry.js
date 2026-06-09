/**
 * ERC-8004 Reputation Registry Utility
 * Manages reputation attestations with engagement summaries and profile data
 */

import { getPrisma } from "../prisma";
import { getAgentId } from "./agentIdentity";

/**
 * Reputation Schema Format (per ERC-8004 spec)
 * References engagement summary and includes profile attestation
 */
export const REPUTATION_SCHEMA = {
  version: "1.0",
  format: "erc8004-reputation-v1",
  type: "engagement-summary-attestation",
};

/**
 * Create engagement summary for reputation attestation
 * Includes all relevant profile and engagement data to be attested
 *
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<Object>} Engagement summary object
 */
export async function createEngagementSummary(walletAddress) {
  if (!walletAddress) {
    throw new Error("Wallet address required");
  }

  const normalizedAddress = walletAddress.toLowerCase();

  try {
    const prisma = getPrisma();

    // Fetch preference (includes scores and settings)
    const preference = await prisma.preference.findUnique({
      where: { wallet: normalizedAddress },
    });

    if (!preference) {
      throw new Error("Preference record not found");
    }

    // Fetch engagement summary
    const engagements = await prisma.userEngagement.findMany({
      where: { walletId: normalizedAddress },
    });

    // Fetch favorites count
    const favoritesCount = await prisma.marketFavorite.count({
      where: { walletId: normalizedAddress },
    });

    // Calculate aggregated stats
    const totalClicks = engagements.reduce((sum, e) => sum + (e.clickCount || 0), 0);
    const totalTimeSpentMs = engagements.reduce((sum, e) => sum + (e.timeSpentMs || 0), 0);
    const watchlistedCount = engagements.filter((e) => e.isWatchlisted).length;
    const totalExposure = engagements.reduce((sum, e) => sum + (e.tradeExposure || 0), 0);
    const uniqueMarkets = engagements.length;

    const avgTimePerMarket = uniqueMarkets > 0 ? totalTimeSpentMs / uniqueMarkets : 0;
    const avgClicksPerMarket = uniqueMarkets > 0 ? totalClicks / uniqueMarkets : 0;

    return {
      schema: REPUTATION_SCHEMA,
      walletAddress: normalizedAddress,
      agentId: preference.agentId,
      timestamp: new Date().toISOString(),

      // Profile Information
      profile: {
        wins: preference.wins || 0,
        losses: preference.losses || 0,
        winRate: preference.wins && preference.losses
          ? preference.wins / (preference.wins + preference.losses)
          : 0,
        popularMarkets: preference.popularMarkets || "",
      },

      // Engagement Metrics
      engagement: {
        totalClicks,
        totalTimeSpentSeconds: Math.round(totalTimeSpentMs / 1000),
        totalTimeSpentMs,
        watchlistedCount,
        favoritesCount,
        totalMarketInteractions: uniqueMarkets,
        totalExposure,
        averageTimePerMarketSeconds: Math.round(avgTimePerMarket / 1000),
        averageClicksPerMarket: Math.round(avgClicksPerMarket * 100) / 100,
        lastEngagementTime: engagements.length > 0
          ? new Date(Math.max(...engagements.map(e => new Date(e.lastInteraction).getTime()))).toISOString()
          : null,
      },

      // Inferred Interests (if available)
      inferredInterests: preference.inferredInterests || {},

      // Market Settings
      marketSettings: preference.marketSettings || {},

      // Last Update
      lastUpdated: preference.lastScoringUpdate || preference.createdAt,
    };
  } catch (error) {
    console.error("Error creating engagement summary:", error);
    throw error;
  }
}

/**
 * Create reputation attestation file for storage or attestation
 * This file should be signed and submitted to reputation registry
 *
 * @param {string} walletAddress - Wallet address
 * @param {string} attestationId - Unique attestation identifier
 * @returns {Promise<string>} JSON string of attestation
 */
export async function createReputationAttestation(walletAddress, attestationId) {
  const engagementSummary = await createEngagementSummary(walletAddress);
  const agentId = await getOrCreateAgentId(walletAddress);

  const attestation = {
    id: attestationId || `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    walletAddress: walletAddress.toLowerCase(),
    engagementSummary,
    signature: null, // To be populated by signer
    timestamp: new Date().toISOString(),
    chainId: null, // To be populated when submitted
    blockNumber: null, // To be populated when confirmed
    txHash: null, // To be populated when submitted
    status: "pending", // pending, submitted, confirmed, failed
  };

  return attestation;
}

/**
 * Save reputation attestation locally
 * Can be retrieved later for on-chain submission
 *
 * @param {string} walletAddress - Wallet address
 * @param {Object} attestation - Attestation object
 * @returns {Promise<string>} Path where attestation was saved
 */
export async function saveReputationAttestation(walletAddress, attestation) {
  const normalizedAddress = walletAddress.toLowerCase();
  const filename = `attestation-${normalizedAddress}-${Date.now()}.json`;
  const dirPath = `./data/reputation-attestations`;

  try {
    // Note: In production, this should use a database or IPFS
    // For now, we'll prepare the data structure
    const attestationData = {
      ...attestation,
      savedAt: new Date().toISOString(),
      version: "1.0",
    };

    // This path would be used for local storage
    // In a real implementation, use fs module or database
    console.log(`Would save attestation to: ${dirPath}/${filename}`);

    return {
      filename,
      path: `${dirPath}/${filename}`,
      attestation: attestationData,
      status: "prepared",
    };
  } catch (error) {
    console.error("Error saving reputation attestation:", error);
    throw error;
  }
}

/**
 * Prepare attestation for on-chain submission
 * Returns data ready to be signed and submitted to reputation registry
 *
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<Object>} Attestation ready for signing
 */
export async function prepareAttestationForSubmission(walletAddress) {
  const attestation = await createReputationAttestation(walletAddress);

  return {
    attestation,
    message: JSON.stringify(attestation.engagementSummary),
    toSign: {
      agentId: attestation.agentId,
      engagementHash: hashEngagementData(attestation.engagementSummary),
      timestamp: attestation.timestamp,
      walletAddress: attestation.walletAddress,
    },
  };
}

/**
 * Hash engagement data for signing
 * Creates a deterministic hash of engagement summary for attestation
 *
 * @param {Object} engagementData - Engagement summary object
 * @returns {string} Hash of engagement data
 */
export function hashEngagementData(engagementData) {
  // In production, use ethers.js or similar
  // For now, create a simple deterministic hash
  const dataStr = JSON.stringify(engagementData);
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return "0x" + Math.abs(hash).toString(16);
}

/**
 * Log reputation event for tracking
 * Records when reputation attestations are created/submitted
 *
 * @param {string} walletAddress - Wallet address
 * @param {string} eventType - Type of event (created, submitted, confirmed, failed)
 * @param {Object} metadata - Additional metadata about event
 */
export async function logReputationEvent(walletAddress, eventType, metadata = {}) {
  const normalizedAddress = walletAddress.toLowerCase();
  const agentId = await getAgentId(normalizedAddress);

  const event = {
    timestamp: new Date().toISOString(),
    walletAddress: normalizedAddress,
    agentId,
    eventType,
    metadata,
  };

  // Log to console for now
  console.log("Reputation Event:", event);

  // In production, save to database or event log
  return event;
}
