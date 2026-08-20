import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Play, Info, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rail } from "@/components/Rail";
import {
  getTrendingDocumentaries,
  getEducationalSeries,
  getRecentlyAdded,
  type TitleItem,
} from "@/lib/tmdb.functions";
import { SUBJECTS } from "@/lib/subjects";

export const Route = createFileRoute("/")({
  component: Home,
});

function Hero({ item }: { item: TitleItem }) {
  return (
    <section className="relative h-[62vh] min-h-[440px] w-full overflow-hidden">
      {item.backdrop && (
        <img
          src={item.backdrop}
          alt={item.title}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      )}
      <div className="absolute inset-0 bg-[image:var(--gradient-hero)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
      <div className="relative mx-auto flex h-full max-w-[1600px] flex-col justify-end px-4 pb-14 sm:px-8">
        <span className="mb-3 flex w-fit items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Featured educational pick
        </span>
        <h1 className="max-w-2xl text-3xl font-bold sm:text-5xl">{item.title}</h1>
        <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{item.year}</span>
          {item.rating > 0 && (
            <span className="flex items-center gap-1 text-accent">
              <Star className="h-4 w-4 fill-current" /> {item.rating}
            </span>
          )}
          <span className="rounded bg-secondary px-2 py-0.5 text-xs uppercase">Documentary</span>
        </div>
        <p className="mt-4 line-clamp-3 max-w-xl text-sm text-foreground/80 sm:text-base">
          {item.overview}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/title/$type/$id" params={{ type: item.mediaType, id: String(item.id) }}>
              <Play className="h-5 w-5 fill-current" /> Start learning
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="rounded-full">
            <Link to="/title/$type/$id" params={{ type: item.mediaType, id: String(item.id) }}>
              <Info className="h-5 w-5" /> Details
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SubjectStrip() {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-4 sm:px-8">
        <h2 className="text-lg font-bold sm:text-xl">Popular subjects</h2>
        <Link to="/subjects" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 sm:px-8">
        {SUBJECTS.slice(0, 12).map((s) => (
          <Link
            key={s.slug}
            to="/subject/$slug"
            params={{ slug: s.slug }}
            className="group flex w-[190px] shrink-0 flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary transition-transform group-hover:scale-110">
              <s.icon className="h-5 w-5" />
            </span>
            <div className="mt-6">
              <p className="font-semibold">{s.name}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Home() {
  const trendingFn = useServerFn(getTrendingDocumentaries);
  const seriesFn = useServerFn(getEducationalSeries);
  const recentFn = useServerFn(getRecentlyAdded);

  const trending = useQuery({ queryKey: ["trending-docs"], queryFn: () => trendingFn() });
  const series = useQuery({ queryKey: ["edu-series"], queryFn: () => seriesFn() });
  const recent = useQuery({ queryKey: ["recent"], queryFn: () => recentFn() });

  const hero = trending.data?.[0];
  const missingKey =
    trending.isError && String(trending.error).includes("TMDB_API_KEY");

  return (
    <main className="pb-20">
      {hero ? (
        <Hero item={hero} />
      ) : (
        <div className="relative h-[52vh] min-h-[380px] overflow-hidden bg-[image:var(--gradient-hero)]">
          <div className="mx-auto flex h-full max-w-[1600px] flex-col justify-center px-4 sm:px-8">
            <h1 className="max-w-2xl text-3xl font-bold sm:text-5xl">
              Turn screen time into <span className="text-gradient">study time</span>
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Discover documentaries, films and series matched to exactly what you want to learn.
            </p>
            {missingKey && (
              <p className="mt-4 max-w-xl rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
                Add your TMDB API key to load live content.
              </p>
            )}
            <Button asChild size="lg" className="mt-6 w-fit rounded-full">
              <Link to="/subjects">Explore subjects</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="mx-auto -mt-6 max-w-[1600px] space-y-10">
        <SubjectStrip />
        <Rail
          title="Trending documentaries"
          items={trending.data?.slice(1)}
          isLoading={trending.isLoading}
        />
        <Rail
          title="Educational series"
          items={series.data}
          isLoading={series.isLoading}
        />
        <Rail title="Recently added" items={recent.data} isLoading={recent.isLoading} />
      </div>
    </main>
  );
}
