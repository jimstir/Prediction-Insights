/**
 * Recommendation Candidate Formatting
 *
 * This module prepares candidate events and user preferences
 * for LLM-based recommendation processing.
 */

import { fetchKalshiCandidateEvents } from "../kalshi";

/**
 * Fetch candidate events for recommendation processing
 *
 * @param {Object} options - Fetch options
 * @param {number} [options.limit=200] - Number of events to retrieve
 * @returns {Promise<Object>} Candidate events response
 */
export async function getCandidateEventsForRecommendations(options = {}) {
  try {
    if (typeof window !== "undefined") {
      // Browser environment: fetch via Next.js server proxy API to avoid CORS/mixed-content blocks
      const limit = options.limit ?? 200;
      let url = `/api/insights/candidates?limit=${limit}`;
      if (options.cursor) {
        url += `&cursor=${options.cursor}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch candidates from server proxy: ${res.statusText}`);
      }
      return await res.json();
    } else {
      // Server environment (or CLI/test runner): fetch directly from Kalshi
      const candidates = await fetchKalshiCandidateEvents(options);
      return candidates;
    }
  } catch (error) {
    console.error("Failed to get candidate events:", error);
    throw error;
  }
}

/**
 * Format candidate events and user preferences for LLM input
 *
 * This prepares a structured prompt context that matches the schema in agent/recommendation.md:
 * - User Profile (explicit_interests, topic_profiles, market_settings)
 * - Candidate Markets (enriched with similar markets matches)
 *
 * @param {Object} candidates - Candidate events from Kalshi
 * @param {Object} preferences - User preferences from database
 * @returns {Object} Formatted context for LLM
 */
export function formatCandidatesAndPreferencesForLLM(candidates, preferences) {
  // Parse inferred interests (topic profiles)
  let topicProfiles = {};
  if (preferences?.inferredInterests) {
    try {
      topicProfiles = typeof preferences.inferredInterests === "string"
        ? JSON.parse(preferences.inferredInterests)
        : preferences.inferredInterests;
    } catch (e) {
      topicProfiles = {};
    }
  }

  // Parse market settings
  let marketSettings = {};
  if (preferences?.marketSettings) {
    try {
      marketSettings = typeof preferences.marketSettings === "string"
        ? JSON.parse(preferences.marketSettings)
        : preferences.marketSettings;
    } catch (e) {
      marketSettings = {};
    }
  }

  // Build explicit interests
  const explicitInterests = {
    categories: preferences?.categories
      ? preferences.categories.split(",").map((c) => c.trim())
      : [],
    subCategories: preferences?.subCategories
      ? preferences.subCategories.split(",").map((c) => c.trim())
      : [],
    tags: preferences?.tags
      ? preferences.tags.split(",").map((c) => c.trim())
      : [],
    timeframes: preferences?.timeframes
      ? preferences.timeframes.split(",").map((c) => c.trim())
      : [],
    liquidityScale: preferences?.liquidityScale || "all",
  };

  // Format candidate markets as specified in recommendation.md (excluding similar_markets from LLM prompt)
  const formattedCandidates = (candidates.events || []).map((event) => ({
    id: event.eventTicker,
    event: event.eventTicker,
    question: event.title,
    description: event.subtitle || "",
    category: event.category || "uncategorized",
  }));

  return {
    userProfile: {
      explicit_interests: explicitInterests,
      topic_profiles: topicProfiles,
      market_settings: marketSettings,
    },
    candidateMarkets: formattedCandidates,
    metadata: {
      totalCandidates: candidates.totalEvents || 0,
      retrievedAt: candidates.retrievedAt,
    },
  };
}

/**
 * Build a prompt string for LLM recommendation engine
 *
 * @param {Object} context - Formatted context from formatCandidatesAndPreferencesForLLM
 * @returns {string} Prompt string for LLM
 */
export function buildLLMRecommendationPrompt(context) {
  const { userProfile, candidateMarkets, metadata } = context;

  let prompt = `## User Profile\n`;
  prompt += `\`\`\`json\n`;
  prompt += JSON.stringify(userProfile, null, 2);
  prompt += `\n\`\`\`\n\n`;

  prompt += `## Candidate Markets (${metadata.totalCandidates} total)\n`;
  prompt += `\`\`\`json\n`;
  prompt += JSON.stringify(candidateMarkets, null, 2);
  prompt += `\n\`\`\`\n\n`;

  return prompt;
}
