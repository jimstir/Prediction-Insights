import { encodeFunctionData } from "viem";
import { LLM_INFER_STRING_ABI } from "./llmAgentAbi";
import {
  getCandidateEventsForRecommendations,
  formatCandidatesAndPreferencesForLLM,
  buildLLMRecommendationPrompt,
} from "../somnia/candidateFormatting";

/**
 * Builds prompt/system inputs for the recommendations LLM call.
 *
 * Integrates:
 * - User preferences from database (categories, tags, liquidity, timeframes)
 * - Candidate events from Kalshi API (up to 200 events)
 * - Formatting for LLM to generate recommendations
 *
 * @param {object} context - Context containing: preferences, walletAddress, etc.
 * @param {Object} [context.preferences] - User preferences object
 * @param {string} [context.walletAddress] - User's wallet address
 * @param {number} [context.candidateLimit=200] - Max events to fetch from Kalshi
 * @returns {Promise<Object>} Inputs for LLM with enriched prompt
 */
export async function buildRecommendationsInferenceInputs(context = {}) {
  const preferences = context.preferences || {};
  const candidateLimit = context.candidateLimit ?? 200;

  let candidates = null;
  let candidateError = null;

  try {
    // Fetch candidate events from Kalshi
    candidates = await getCandidateEventsForRecommendations({
      limit: candidateLimit,
    });
  } catch (error) {
    candidateError = error.message;
    console.warn("Could not fetch Kalshi candidates:", error.message);
    // Continue with empty candidates rather than fail
    candidates = { events: [], totalEvents: 0, retrievedAt: new Date().toISOString() };
  }

  // Format candidates and preferences for LLM
  const llmContext = formatCandidatesAndPreferencesForLLM(
    candidates,
    preferences
  );

  // Build comprehensive prompt with candidates and preferences
  const prompt =
    context.prompt ?? buildLLMRecommendationPrompt(llmContext);

  return {
    prompt,
    system:
      context.system ??
      "You are a Kalshi prediction market recommendation assistant. Analyze the candidate events and user preferences. Recommend markets that match the user's interests. Return a JSON array of recommendations with eventTicker, title, and matchReason.",
    chainOfThought: context.chainOfThought ?? false,
    allowedValues: context.allowedValues ?? [],
    _meta: {
      candidatesFetched: candidates?.totalEvents ?? 0,
      candidateError,
      preferencesProvided: Boolean(preferences),
    },
  };
}

/**
 * Encodes inferString calldata for the Somnia LLM agent contract.
 * Returns both encodedPayload and callbackSelector for platform contract.
 * For frontend calls, we use a dummy callback selector since we poll for results via receipts.
 * @see https://docs.somnia.network/agents/base-agents/llm-inference#simple-inference
 */
export async function buildRecommendationsInferenceCalldata(context = {}) {
  const { prompt, system, chainOfThought, allowedValues } =
    await buildRecommendationsInferenceInputs(context);

  // Encode the LLM agent call (this becomes the payload for platform contract)
  const encodedPayload = encodeFunctionData({
    abi: LLM_INFER_STRING_ABI,
    functionName: "inferString",
    args: [prompt, system, chainOfThought, allowedValues],
  });

  // For frontend calls, we use a placeholder callback selector
  // The platform contract requires this parameter but we'll poll for results via receipts instead
  const callbackSelector = "0x00000000";

  return {
    encodedPayload,
    callbackSelector,
  };
}
