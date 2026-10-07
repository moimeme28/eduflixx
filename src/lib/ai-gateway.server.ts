// Server-only helper connecting the AI SDK to the Google Gemini API.
//
// Uses the native @ai-sdk/google provider instead of the OpenAI-compat
// shim so that Gemini's `thought_signature` round-trip works correctly.
// Without it, follow-up turns after a tool call fail with
// "Function call is missing a thought_signature" (400).
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function createLovableAiGatewayProvider(apiKey: string) {
  const google = createGoogleGenerativeAI({ apiKey });
  // gemini-flash-lite-latest is the rolling alias that always points
  // to the current stable Flash-Lite model, which handles tool calls
  // and text responses well within the free-tier rate limits.
  return (modelId: string) => google(modelId);
}