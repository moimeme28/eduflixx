import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: JsonValue[];
}

export interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ThreadSummary[]> => {
    const { data, error } = await context.supabase
      .from("assistant_threads")
      .select("id, title, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((t) => ({ id: t.id, title: t.title, updatedAt: t.updated_at }));
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ThreadSummary> => {
    const { data, error } = await context.supabase
      .from("assistant_threads")
      .insert({ user_id: context.userId })
      .select("id, title, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, title: data.title, updatedAt: data.updated_at };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("assistant_threads")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getThreadMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string }) => input)
  .handler(async ({ data, context }): Promise<PersistedMessage[]> => {
    // Verify ownership of the thread first.
    const { data: thread } = await context.supabase
      .from("assistant_threads")
      .select("id")
      .eq("id", data.threadId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!thread) return [];

    const { data: rows, error } = await context.supabase
      .from("assistant_messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", data.threadId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      role: r.role as PersistedMessage["role"],
      parts: (r.parts ?? []) as JsonValue[],
    }));
  });
