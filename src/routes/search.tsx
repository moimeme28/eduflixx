import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SearchX } from "lucide-react";
import { searchTitles } from "@/lib/tmdb.functions";
import { TitleCard } from "@/components/TitleCard";
import { Skeleton } from "@/components/ui/skeleton";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Search — EduFlix" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const searchFn = useServerFn(searchTitles);
  const results = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchFn({ data: { query: q } }),
    enabled: q.trim().length > 0,
  });

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">
        {q ? (
          <>
            Results for <span className="text-gradient">“{q}”</span>
          </>
        ) : (
          "Search EduFlix"
        )}
      </h1>

      <div className="mt-8">
        {!q ? (
          <p className="text-muted-foreground">Type a subject, title, actor or keyword to begin.</p>
        ) : results.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" />
            ))}
          </div>
        ) : results.data && results.data.length > 0 ? (
          <div className="grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {results.data.map((item) => (
              <TitleCard key={`${item.mediaType}-${item.id}`} item={item} className="w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
            <SearchX className="h-10 w-10" />
            <p>No results found. Try another search.</p>
          </div>
        )}
      </div>
    </main>
  );
}
