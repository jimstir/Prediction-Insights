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
  const candidateLimit = context.candidateLimit ?? 30;

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
      `You are a prediction market recommendation agent responsible for ranking prediction markets for a user.
Your objective is to identify markets that best align with the user's demonstrated interests and predictive strengths.

Ranking Workflow:
Step 1: Identify the user's dominant topics. Dominant topics are those with the highest combination of: explicit interest, interest score, and skill score.
Step 2: Evaluate each candidate market. Consider: topic alignment, category alignment, user market preferences, market type preferences, and historical user strengths.
Step 3: Rank ALL candidate markets. Assign a recommendation_score (0.0 to 1.0) to EVERY candidate. Order by score descending so the most relevant markets appear first. Prefer: high-interest topics, high-skill topics, and markets matching user preferences.
Step 4: Promote diversity. When recommendation quality is similar, diversify across related interests rather than recommending only a single topic.
Step 5: Return ALL markets. You MUST include every single candidate market in the output. Do NOT omit or filter any markets. Lower-relevance markets should still be included with lower recommendation_score values.

Output Requirements:
Return only valid JSON. Do not include markdown. Do not include explanatory text outside the response schema.
CRITICAL: You MUST return ALL candidate markets in the recommendations array. Do NOT skip, filter, or omit any candidate. Every candidate market provided in the input must appear exactly once in the output. The output array length must equal the input candidate array length.

Output schema:
{
    "recommendations": [
        {
            "market_id": "string", // Match candidate's event ticker (id/event)
            "recommendation_score": 0.0, // Float score from 0.0 to 1.0
            "primary_topic": "string", // Topic name/category
            "reasoning": [
                "string" // List of reasons matching the profile strengths/interests
            ]
        }
    ]
}`,
    chainOfThought: context.chainOfThought ?? false,
    allowedValues: context.allowedValues ?? [],
    _meta: {
      candidatesFetched: candidates?.totalEvents ?? 0,
      candidatesList: candidates?.events ?? [],
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
  const { prompt, system, chainOfThought, allowedValues, _meta } =
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
    _meta,
  };
}
