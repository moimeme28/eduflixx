import { createFileRoute } from "@tanstack/react-router";
import { AssistantChat } from "@/components/AssistantChat";

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { q } = Route.useSearch();
  return <AssistantChat key={threadId} threadId={threadId} initialQuery={q} />;
}
