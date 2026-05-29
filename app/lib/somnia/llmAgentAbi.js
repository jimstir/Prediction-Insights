/** inferString ABI from Somnia LLM Inference agent docs. */
export const LLM_INFER_STRING_ABI = [
  {
    type: "function",
    name: "inferString",
    inputs: [
      { name: "prompt", type: "string" },
      { name: "system", type: "string" },
      { name: "chainOfThought", type: "bool" },
      { name: "allowedValues", type: "string[]" },
    ],
    outputs: [{ name: "response", type: "string" }],
  },
];
