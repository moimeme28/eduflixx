import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { searchEducationalTitles } from "@/lib/tmdb.server";
import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SYSTEM_PROMPT = `You are EduFlix's AI learning assistant. Students tell you what they want to learn, and you recommend educational movies, documentaries, and series that teach it.

Rules:
- ALWAYS call the recommend_titles tool to find real titles before recommending anything. Never invent titles.
- Derive a concise search query from the student's learning goal (the core subject/topic), not their full sentence.
- After the tool returns, recommend the best 2-4 matches. For EACH one, explain WHY it fits the student's specific goal and which concepts it covers.
- When helpful for studying, point to the most relevant part — e.g. an approximate episode and timestamp range ("~Episode 3, around 14:00-19:00") where the concept is explained. Clearly label these as approximate study guides, since exact times vary by version.
- Be concise and use markdown (short intro, then a bullet or short paragraph per title). Address the student's goal directly.
- If the goal is unclear, ask one short clarifying question instead of guessing.`;

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (token.split(".").length !== 3) return null;
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_PUBLISHABLE_KEY! } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return { supabase, userId: data.claims.sub as string };
}

function messageText(m: UIMessage): string {
  return (m.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          messages?: UIMessage[];
          threadId?: string;
        };
        const messages = body.messages;
        const threadId = body.threadId;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const auth = await getUserFromRequest(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });

        // Persist the incoming user message + set the thread title if needed.
        if (threadId) {
          const lastUser = [...messages].reverse().find((m) => m.role === "user");
          if (lastUser) {
            await auth.supabase.from("assistant_messages").insert({
              thread_id: threadId,
              user_id: auth.userId,
              role: "user",
              parts: lastUser.parts,
            });
            const title = messageText(lastUser).slice(0, 60);
            if (title) {
              await auth.supabase
                .from("assistant_threads")
                .update({ title })
                .eq("id", threadId)
                .eq("user_id", auth.userId)
                .eq("title", "New conversation");
            }
          }
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(5),
          tools: {
            recommend_titles: tool({
              description:
                "Search EduFlix's catalog for educational movies, documentaries, and series that match a learning topic. Returns real titles with posters.",
              inputSchema: z.object({
                query: z.string().describe("The subject or topic to search for, e.g. 'photosynthesis' or 'french revolution'."),
                format: z
                  .string()
                  .optional()
                  .describe("Optional preferred format: 'Documentary', 'Movie', or 'TV Series'."),
              }),
              execute: async ({ query, format }) => {
                const titles = await searchEducationalTitles(query, format);
                return { query, titles };
              },
            }),
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            if (threadId && responseMessage) {
              await auth.supabase.from("assistant_messages").insert({
                thread_id: threadId,
                user_id: auth.userId,
                role: "assistant",
                parts: responseMessage.parts,
              });
              await auth.supabase
                .from("assistant_threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", threadId)
                .eq("user_id", auth.userId);
            }
          },
        });
      },
    },
  },
});
