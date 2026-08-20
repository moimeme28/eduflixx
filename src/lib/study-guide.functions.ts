import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export interface StudyGuide {
  summary: string;
  keyConcepts: { term: string; definition: string }[];
  discussionQuestions: string[];
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }[];
  scenePointers: { label: string; why: string }[];
}

const schema = z.object({
  summary: z.string().describe("2-3 sentence learning-focused summary."),
  keyConcepts: z
    .array(z.object({ term: z.string(), definition: z.string() }))
    .min(3)
    .max(6),
  discussionQuestions: z.array(z.string()).min(3).max(5),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        answerIndex: z.number().int().min(0).max(3),
        explanation: z.string(),
      }),
    )
    .min(3)
    .max(5),
  scenePointers: z
    .array(z.object({ label: z.string(), why: z.string() }))
    .min(2)
    .max(4)
    .describe("Approximate scenes or episodes worth studying (e.g. '~Ep.3, 14:20–19:10')."),
});

export const generateStudyGuide = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      title: string;
      mediaType: "movie" | "tv";
      overview: string;
      genres: string[];
      year: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<StudyGuide> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const provider = createLovableAiGatewayProvider(key);
    const model = provider("google/gemini-2.5-flash");

    const prompt = [
      `Create a concise study guide for students about the ${data.mediaType === "tv" ? "series" : "film"} "${data.title}" (${data.year || "n/a"}).`,
      `Genres: ${data.genres.join(", ") || "unknown"}.`,
      `Synopsis: ${data.overview || "(none provided)"}`,
      ``,
      `Focus on real educational value: what a student can learn, key vocabulary,`,
      `open-ended discussion prompts, and a short multiple-choice quiz.`,
      `For scenePointers, suggest approximate timestamps or episodes worth studying`,
      `(clearly marked as approximate, e.g. "~14:20–19:10" or "~Ep.3").`,
    ].join("\n");

    const { object } = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.5,
    });
    return object;
  });
