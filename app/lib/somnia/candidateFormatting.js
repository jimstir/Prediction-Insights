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
    const candidates = await fetchKalshiCandidateEvents(options);
    return candidates;
  } catch (error) {
    console.error("Failed to get candidate events:", error);
    throw error;
  }
}

/**
 * Format candidate events and user preferences for LLM input
 *
 * This prepares a structured prompt context that includes:
 * - User preferences (categories, tags, timeframes, liquidity preferences)
 * - Candidate events from Kalshi
 * - Instructions for LLM to filter and rank events
 *
 * @param {Object} candidates - Candidate events from Kalshi
 * @param {Object} preferences - User preferences from database
 * @returns {Object} Formatted context for LLM
 */
export function formatCandidatesAndPreferencesForLLM(candidates, preferences) {
  // Format preferences for readability
  const formattedPreferences = {
    categories: preferences?.categories
      ? preferences.categories.split(",").map((c) => c.trim())
      : [],
    subCategories: preferences?.subCategories
      ? preferences.subCategories.split(",").map((c) => c.trim())
      : [],
    tags: preferences?.tags
      ? preferences.tags.split(",").map((c) => c.trim())
      : [],
    liquidityScale: preferences?.liquidityScale || "all",
    timeframes: preferences?.timeframes
      ? preferences.timeframes.split(",").map((c) => c.trim())
      : [],
  };

  // Build context object for LLM
  const context = {
    userPreferences: formattedPreferences,
    candidateEvents: candidates.events || [],
    metadata: {
      totalCandidates: candidates.totalEvents || 0,
      retrievedAt: candidates.retrievedAt,
    },
  };

  return context;
}

/**
 * Build a prompt string for LLM recommendation engine
 *
 * @param {Object} context - Formatted context from formatCandidatesAndPreferencesForLLM
 * @returns {string} Prompt string for LLM
 */
export function buildLLMRecommendationPrompt(context) {
  const { userPreferences, candidateEvents, metadata } = context;

  let prompt = `You are a recommendation engine for Kalshi prediction markets. Your task is to filter and rank candidate events based on the user's preferences.\n\n`;

  prompt += `## User Preferences\n`;
  if (userPreferences.categories.length > 0) {
    prompt += `- Interested Categories: ${userPreferences.categories.join(", ")}\n`;
  }
  if (userPreferences.subCategories.length > 0) {
    prompt += `- Sub-Categories: ${userPreferences.subCategories.join(", ")}\n`;
  }
  if (userPreferences.tags.length > 0) {
    prompt += `- Tags: ${userPreferences.tags.join(", ")}\n`;
  }
  if (userPreferences.timeframes.length > 0) {
    prompt += `- Preferred Timeframes: ${userPreferences.timeframes.join(", ")}\n`;
  }
  prompt += `- Liquidity Preference: ${userPreferences.liquidityScale}\n`;

  prompt += `\n## Candidate Events (${metadata.totalCandidates} total)\n`;
  prompt += `Retrieved at: ${metadata.retrievedAt}\n\n`;

  prompt += `\`\`\`json\n`;
  prompt += JSON.stringify(candidateEvents, null, 2);
  prompt += `\n\`\`\`\n\n`;

  prompt += `## Task\n`;
  prompt += `1. Identify events that match the user's preferences\n`;
  prompt += `2. Consider category, timeframe, and event characteristics\n`;
  prompt += `3. Return a JSON array of recommended events (or empty array if none match)\n`;
  prompt += `4. Format: { "eventTicker": "...", "title": "...", "matchReason": "..." }\n`;

  return prompt;
}
