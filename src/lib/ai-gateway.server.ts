// Server-only helper connecting the AI SDK to the Google Gemini API.
// Google exposes an OpenAI-compatible endpoint, so we use @ai-sdk/openai-compatible
// to stream chat completions and generate structured objects with Gemini models.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "google-gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
