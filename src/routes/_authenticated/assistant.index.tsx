import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createThread } from "@/lib/assistant.functions";
import { Button } from "@/components/ui/button";
import assistantAvatar from "@/assets/assistant-avatar.png";

export const Route = createFileRoute("/_authenticated/assistant/")({
  component: AssistantIndex,
});

const PROMPTS = [
  "I'm studying photosynthesis for biology — what should I watch?",
  "Explain the French Revolution through a documentary",
  "Help me understand quantum physics basics",
  "Recommend a series about the human immune system",
];

function AssistantIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createThread);

  const createMut = useMutation({
    mutationFn: () => createFn(),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["assistant-threads"] });
      navigate({
        to: "/assistant/$threadId",
        params: { threadId: thread.id },
        search: { q: pendingRef.current ?? undefined },
      });
    },
  });

  // hold a chosen prompt across the async create
  const pendingRef = { current: null as string | null };

  useEffect(() => {
    pendingRef.current = null;
  }, []);

  function start(prompt?: string) {
    pendingRef.current = prompt ?? null;
    createMut.mutate();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <img src={assistantAvatar} alt="EduFlix assistant" width={96} height={96} className="h-24 w-24" loading="lazy" />
      <h1 className="mt-4 text-2xl font-bold">What do you want to learn?</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Tell me a topic or study goal and I'll recommend educational films, documentaries and series — and explain exactly why each one fits.
      </p>
      <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => start(p)}
            disabled={createMut.isPending}
            className="rounded-xl border border-border bg-card/50 p-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent"
          >
            {p}
          </button>
        ))}
      </div>
      <Button onClick={() => start()} disabled={createMut.isPending} className="mt-6">
        {createMut.isPending ? "Starting…" : "Start a blank conversation"}
      </Button>
    </div>
  );
}
