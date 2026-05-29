import { encodeFunctionData } from "viem";
import { LLM_INFER_STRING_ABI } from "./llmAgentAbi";

/**
 * Builds prompt/system inputs for the recommendations LLM call.
 * Prompt construction (preferences, positions, markets) will be added here later.
 *
 * @param {object} context - Future context: walletAddress, preferences, positions, etc.
 */
export function buildRecommendationsInferenceInputs(context = {}) {
  return {
    prompt:
      context.prompt ??
      "Generate personalized prediction market recommendations for this user.",
    system:
      context.system ??
      "You are a prediction market recommendation assistant. Return concise, actionable market suggestions.",
    chainOfThought: context.chainOfThought ?? false,
    allowedValues: context.allowedValues ?? [],
  };
}

/**
 * Encodes inferString calldata for the Somnia LLM agent contract.
 * @see https://docs.somnia.network/agents/base-agents/llm-inference#simple-inference
 */
export function buildRecommendationsInferenceCalldata(context = {}) {
  const { prompt, system, chainOfThought, allowedValues } =
    buildRecommendationsInferenceInputs(context);

  return encodeFunctionData({
    abi: LLM_INFER_STRING_ABI,
    functionName: "inferString",
    args: [prompt, system, chainOfThought, allowedValues],
  });
}
