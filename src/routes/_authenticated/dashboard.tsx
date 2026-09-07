import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Star, Film, Tv, Trash2, Pencil, Check, Sparkles, X, ListVideo } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { updateFavoriteNote, type FavoriteItem } from "@/lib/favorites.functions";


export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "My Watchlist — EduFlix" },
      { name: "description", content: "Your saved educational films and series, with personal study notes." },
    ],
  }),
});

function Dashboard() {
  const { favorites, isLoading, error, remove } = useFavorites();

  const movies = favorites.filter((f) => f.mediaType === "movie");
  const series = favorites.filter((f) => f.mediaType === "tv");

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
            <Bookmark className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">My Watchlist</h1>
            <p className="text-sm text-muted-foreground">
              {favorites.length} saved {favorites.length === 1 ? "title" : "titles"} to study
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/lists">
            <ListVideo className="h-4 w-4" /> My lists
          </Link>
        </Button>
      </div>

      {error ? (

        <div className="mt-10 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">Your watchlist is temporarily unavailable.</p>
          <p className="mt-1 text-muted-foreground">
            The database connection needs attention. Your saved titles have not been changed.
          </p>
        </div>
      ) : isLoading ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">Loading your watchlist…</p>
      ) : favorites.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <Sparkles className="h-10 w-10 text-primary" />
          <div>
            <p className="text-lg font-semibold">Your watchlist is empty</p>
            <p className="text-sm text-muted-foreground">
              Browse subjects and tap the bookmark to save titles for later.
            </p>
          </div>
          <Button asChild>
            <Link to="/subjects">Explore subjects</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {movies.length > 0 && (
            <Section title="Films" icon={<Film className="h-5 w-5" />}>
              {movies.map((f) => (
                <FavoriteCard key={f.id} fav={f} onRemove={() => remove({ tmdbId: f.tmdbId, mediaType: f.mediaType })} />
              ))}
            </Section>
          )}
          {series.length > 0 && (
            <Section title="Series" icon={<Tv className="h-5 w-5" />}>
              {series.map((f) => (
                <FavoriteCard key={f.id} fav={f} onRemove={() => remove({ tmdbId: f.tmdbId, mediaType: f.mediaType })} />
              ))}
            </Section>
          )}
        </div>
      )}
    </main>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
        {icon} {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function FavoriteCard({ fav, onRemove }: { fav: FavoriteItem; onRemove: () => void }) {
  const queryClient = useQueryClient();
  const updateNoteFn = useServerFn(updateFavoriteNote);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(fav.note ?? "");

  const noteMut = useMutation({
    mutationFn: () => updateNoteFn({ data: { id: fav.id, note } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      setEditing(false);
      toast.success("Note saved");
    },
  });

  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-card/50 p-3">
      <Link
        to="/title/$type/$id"
        params={{ type: fav.mediaType, id: String(fav.tmdbId) }}
        className="shrink-0"
      >
        {fav.poster ? (
          <img src={fav.poster} alt={fav.title} className="h-36 w-24 rounded-lg object-cover" />
        ) : (
          <div className="grid h-36 w-24 place-items-center rounded-lg bg-muted text-muted-foreground">
            {fav.mediaType === "tv" ? <Tv className="h-6 w-6" /> : <Film className="h-6 w-6" />}
          </div>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to="/title/$type/$id"
          params={{ type: fav.mediaType, id: String(fav.tmdbId) }}
          className="font-semibold leading-tight hover:text-primary"
        >
          {fav.title}
        </Link>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{fav.year || "—"}</span>
          {fav.rating ? (
            <span className="flex items-center gap-0.5 text-accent">
              <Star className="h-3 w-3 fill-current" /> {fav.rating}
            </span>
          ) : null}
        </div>

        {editing ? (
          <div className="mt-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a study note…"
              rows={3}
              className="w-full rounded-lg border border-border bg-background/60 p-2 text-sm outline-none ring-primary/50 focus:ring-2"
            />
            <div className="mt-1 flex gap-2">
              <Button size="sm" onClick={() => noteMut.mutate()} disabled={noteMut.isPending} className="gap-1">
                <Check className="h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setNote(fav.note ?? ""); }}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-2 flex-1 text-sm text-foreground/80">
            {fav.note || <span className="italic text-muted-foreground">No study note yet.</span>}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2">
          {!editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="gap-1 text-muted-foreground">
              <Pencil className="h-3.5 w-3.5" /> {fav.note ? "Edit note" : "Add note"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="ml-auto gap-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
