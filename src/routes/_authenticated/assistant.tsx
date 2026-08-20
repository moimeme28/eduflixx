import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listThreads, createThread, deleteThread } from "@/lib/assistant.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, MessageSquare, LogOut } from "lucide-react";
import assistantAvatar from "@/assets/assistant-avatar.png";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: AssistantLayout,
  head: () => ({
    meta: [
      { title: "AI Learning Assistant — EduFlix" },
      { name: "description", content: "Ask what you want to learn and get educational film and series recommendations with reasons." },
    ],
  }),
});

function AssistantLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchThreads = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);

  const activeId = useParams({ strict: false }).threadId as string | undefined;

  const { data: threads = [] } = useQuery({
    queryKey: ["assistant-threads"],
    queryFn: () => fetchThreads(),
  });

  const createMut = useMutation({
    mutationFn: () => createFn(),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["assistant-threads"] });
      navigate({ to: "/assistant/$threadId", params: { threadId: thread.id } });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_r, id) => {
      queryClient.invalidateQueries({ queryKey: ["assistant-threads"] });
      if (id === activeId) navigate({ to: "/assistant" });
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-[1600px]">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/30 md:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <img src={assistantAvatar} alt="" width={32} height={32} className="h-8 w-8" loading="lazy" />
          <span className="font-semibold">Study Assistant</span>
        </div>
        <div className="px-3">
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" /> New conversation
          </Button>
        </div>
        <nav className="mt-3 flex-1 overflow-y-auto px-2">
          {threads.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No conversations yet.
            </p>
          )}
          {threads.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 rounded-lg px-2 ${
                t.id === activeId ? "bg-accent" : "hover:bg-accent/60"
              }`}
            >
              <button
                onClick={() => navigate({ to: "/assistant/$threadId", params: { threadId: t.id } })}
                className="flex flex-1 items-center gap-2 overflow-hidden py-2 text-left text-sm"
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{t.title}</span>
              </button>
              <button
                onClick={() => deleteMut.mutate(t.id)}
                aria-label="Delete conversation"
                className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
