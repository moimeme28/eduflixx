import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Film, Lock, Users, Calendar, ArrowLeft, Plus, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { getPublicListDetail, getMyListDetail, addListItem, removeListItem } from "@/lib/social.functions";
import { searchTitles } from "@/lib/tmdb.functions";
import { useAuth } from "@/hooks/useAuth";
import { FollowButton } from "@/components/FollowButton";
import { ListCard } from "@/components/ListCard";
import { TitleCard } from "@/components/TitleCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const publicFn = useServerFn(getPublicListDetail);
  const myFn = useServerFn(getMyListDetail);

  const publicQuery = useQuery({
    queryKey: ["list-detail", listId, "public"],
    queryFn: () => publicFn({ data: { listId } }),
    initialData: initial ?? undefined,
    enabled: !!initial,
  });

  const ownerQuery = useQuery({
    queryKey: ["list-detail", listId, "owner"],
    queryFn: () => myFn({ data: { listId } }),
    enabled: !initial && !!user,
  });

  const data = publicQuery.data ?? ownerQuery.data;
  const isLoading = publicQuery.isLoading || ownerQuery.isLoading;

  const queryClient = useQueryClient();
  const removeFn = useServerFn(removeListItem);
  const removeMut = useMutation({
    mutationFn: (itemId: string) => removeFn({ data: { listId, itemId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-detail", listId] });
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      toast.success("Removed from list");
    },
    onError: (err) => toast.error((err as Error).message || "Could not remove title"),
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

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Titles in this list</h2>
          {isOwner && <AddTitleDialog listId={listId} />}
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {isOwner ? "This list is empty — add the films you're talking about." : "This list is empty."}
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {items.map((item, idx) => (
              <div key={`${item.mediaType}-${item.id}`} className="relative">
                <TitleCard item={item} />
                {data.items[idx]?.note && (
                  <p className="mt-2 w-[150px] text-xs text-muted-foreground sm:w-[176px]">
                    {data.items[idx]!.note}
                  </p>
                )}
                {isOwner && (
                  <button
                    type="button"
                    aria-label={`Remove ${item.title}`}
                    onClick={() => removeMut.mutate(data.items[idx]!.id)}
                    disabled={removeMut.isPending}
                    className="absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

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

function AddTitleDialog({ listId }: { listId: string }) {
  const queryClient = useQueryClient();
  const searchFn = useServerFn(searchTitles);
  const addFn = useServerFn(addListItem);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");

  const results = useQuery({
    queryKey: ["list-add-search", query],
    queryFn: () => searchFn({ data: { query } }),
    enabled: open && query.trim().length > 1,
  });

  const addMut = useMutation({
    mutationFn: (item: TitleItem) =>
      addFn({
        data: {
          listId,
          tmdbId: item.id,
          mediaType: item.mediaType,
          title: item.title,
          poster: item.poster,
          year: item.year,
          rating: item.rating,
          note: note.trim() || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-detail", listId] });
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      setNote("");
      toast.success("Added to list");
    },
    onError: (err) => toast.error((err as Error).message || "Could not add title"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add a title
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a film or series</DialogTitle>
        </DialogHeader>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(term);
          }}
        >
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by title, e.g. Interstellar"
          />
          <Button type="submit" size="icon" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note — why this title matters"
        />

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {results.isFetching && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          )}
          {!results.isFetching && results.data?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No titles found.</p>
          )}
          {results.data?.map((item) => (
            <div
              key={`${item.mediaType}-${item.id}`}
              className="flex items-center gap-3 rounded-lg border border-border p-2"
            >
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
                {item.poster && <img src={item.poster} alt={item.title} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.mediaType === "tv" ? "Series" : "Film"} · {item.year || "—"}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={addMut.isPending}
                onClick={() => addMut.mutate(item)}
              >
                Add
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

