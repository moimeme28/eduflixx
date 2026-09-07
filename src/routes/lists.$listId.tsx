import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Film, Lock, Users, Calendar, ArrowLeft } from "lucide-react";
import { getPublicListDetail } from "@/lib/social.functions";
import { useAuth } from "@/hooks/useAuth";
import { FollowButton } from "@/components/FollowButton";
import { ListCard } from "@/components/ListCard";
import { TitleCard } from "@/components/TitleCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TitleItem } from "@/lib/tmdb.functions";

export const Route = createFileRoute("/lists/$listId")({
  loader: async ({ params }) => {
    const fn = getPublicListDetail;
    try {
      return await fn({ data: { listId: params.listId } });
    } catch {
      return null;
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.list.name} — EduFlix` : "List — EduFlix" },
      { name: "description", content: loaderData?.list.description || "A curated EduFlix list of educational films and series." },
      { property: "og:title", content: loaderData ? `${loaderData.list.name} — EduFlix` : "List — EduFlix" },
      { property: "og:description", content: loaderData?.list.description || "A curated EduFlix list of educational films and series." },
    ],
  }),
  component: ListDetailPage,
  errorComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">List not found</h1>
      <p className="mt-2 text-muted-foreground">This list may be private or has been removed.</p>
      <Button asChild className="mt-6">
        <Link to="/community">Browse community lists</Link>
      </Button>
    </main>
  ),
});

function ListDetailPage() {
  const { user } = useAuth();
  const initial = Route.useLoaderData();
  const listId = Route.useParams().listId;

  const { data, isLoading } = useQuery({
    queryKey: ["list-detail", listId],
    queryFn: () => getPublicListDetail({ data: { listId } }),
    initialData: initial ?? undefined,
    enabled: !!initial,
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-4 h-40 w-full" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">List not found</h1>
        <p className="mt-2 text-muted-foreground">This list may be private or has been removed.</p>
        <Button asChild className="mt-6">
          <Link to="/community">Browse community lists</Link>
        </Button>
      </main>
    );
  }

  const isOwner = user?.id === data.list.userId;
  const items: TitleItem[] = data.items.map((i) => ({
    id: i.tmdbId,
    mediaType: i.mediaType,
    title: i.title,
    overview: "",
    poster: i.poster,
    backdrop: "",
    year: i.year ?? "",
    rating: i.rating ?? 0,
  }));


  return (
    <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
      <Button asChild variant="ghost" className="mb-4 gap-2 pl-0">
        <Link to="/community">
          <ArrowLeft className="h-4 w-4" /> Community
        </Link>
      </Button>

      <div className="rounded-2xl border border-border bg-card/50 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{data.list.name}</h1>
              {!data.list.isPublic && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {data.list.description || "No description yet."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {data.list.subject && <Badge variant="secondary">{data.list.subject}</Badge>}
              <span className="flex items-center gap-1">
                <Film className="h-4 w-4" /> {items.length} titles
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Updated {new Date(data.list.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <FollowButton userId={data.list.userId} />
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">
              <Link to="/users/$userId" params={{ userId: data.list.userId }} className="hover:text-primary">
                {data.owner.displayName || "Unknown learner"}
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">List curator</p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          This list is empty.
        </div>
      ) : (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Titles in this list</h2>
          <div className="flex flex-wrap gap-4">
            {items.map((item) => (
              <TitleCard key={`${item.mediaType}-${item.id}`} item={item} />
            ))}
          </div>
        </section>
      )}

      {isOwner && (
        <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/10 p-5 text-sm text-foreground/80">
          This is your list. You can manage your lists from{" "}
          <Link to="/lists" className="font-semibold text-primary hover:underline">
            My Lists
          </Link>
          .
        </div>
      )}
    </main>
  );
}
