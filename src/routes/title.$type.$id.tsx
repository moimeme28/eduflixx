import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, Clock, Calendar, User, Film, GraduationCap, ArrowLeft } from "lucide-react";
import { getTitleDetails } from "@/lib/tmdb.functions";
import { FavoriteButton } from "@/components/FavoriteButton";
import { TitleCard } from "@/components/TitleCard";
import { StudyGuide } from "@/components/StudyGuide";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/title/$type/$id")({
  loader: ({ params }) => {
    if (params.type !== "movie" && params.type !== "tv") throw notFound();
    return { type: params.type as "movie" | "tv", id: Number(params.id) };
  },
  component: TitlePage,
});

function TitlePage() {
  const { type, id } = Route.useLoaderData();
  const detailsFn = useServerFn(getTitleDetails);
  // Detect the viewer's country after hydration so streaming availability
  // matches where they actually are (defaults to US on the server).
  const [region, setRegion] = useState("US");
  useEffect(() => {
    const locale = new Intl.Locale(navigator.language || "en-US");
    const detected = (locale as { region?: string }).region;
    if (detected) setRegion(detected.toUpperCase());
  }, []);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["title", type, id, region],
    queryFn: () => detailsFn({ data: { mediaType: type, id, region } }),
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
        <Skeleton className="h-[340px] w-full rounded-2xl" />
        <Skeleton className="mt-6 h-10 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Couldn’t load this title</h1>
        <p className="mt-2 text-muted-foreground">It may be unavailable or the data source is offline.</p>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          Back home
        </Link>
      </main>
    );
  }

  const runtimeLabel = data.runtime
    ? type === "tv"
      ? `${data.runtime} min / ep`
      : `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`
    : null;

  return (
    <main className="pb-24">
      {/* Backdrop */}
      <div className="relative h-[46vh] min-h-[320px] w-full overflow-hidden">
        {data.backdrop && (
          <img src={data.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
        )}
        <div className="absolute inset-0 bg-[image:var(--gradient-hero)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
        <Link
          to="/"
          className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-sm sm:left-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-8">
        <div className="relative z-10 -mt-40 flex flex-col gap-6 sm:flex-row">
          {data.poster && (
            <img
              src={data.poster}
              alt={data.title}
              className="relative z-10 w-40 shrink-0 rounded-2xl shadow-[var(--shadow-card)] sm:w-56"
            />
          )}
          <div className="relative z-10 flex-1 rounded-2xl bg-gradient-to-t from-background via-background/95 to-background/80 p-5 pt-6 shadow-[var(--shadow-card)] backdrop-blur-sm sm:pt-32">
            <h1 className="text-3xl font-bold drop-shadow-lg sm:text-4xl">{data.title}</h1>
            {data.tagline && <p className="mt-1 italic text-muted-foreground">{data.tagline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {data.rating > 0 && (
                <span className="flex items-center gap-1 text-accent">
                  <Star className="h-4 w-4 fill-current" /> {data.rating}
                </span>
              )}
              {data.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> {data.year}
                </span>
              )}
              {runtimeLabel && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {runtimeLabel}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Film className="h-4 w-4" /> {type === "tv" ? "Series" : "Film"}
              </span>
            </div>

            {data.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.genres.map((g) => (
                  <Badge key={g} variant="secondary" className="rounded-full">
                    {g}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-5">
              <FavoriteButton
                item={{
                  tmdbId: id,
                  mediaType: type,
                  title: data.title,
                  poster: data.poster,
                  year: data.year,
                  rating: data.rating,
                }}
              />
            </div>
          </div>
        </div>

        {/* Trailer + synopsis */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="mb-3 text-xl font-bold">Trailer</h2>
            {data.trailerKey ? (
              <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${data.trailerKey}`}
                  title={`${data.title} trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="grid aspect-video w-full place-items-center rounded-2xl border border-border bg-card text-muted-foreground">
                No trailer available
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="mb-2 text-xl font-bold">Synopsis</h2>
              <p className="text-sm leading-relaxed text-foreground/85">
                {data.overview || "No synopsis available."}
              </p>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
              <div className="flex items-center gap-2 text-primary">
                <GraduationCap className="h-5 w-5" />
                <h3 className="font-semibold">Educational value</h3>
              </div>
              <p className="mt-2 text-sm text-foreground/80">
                A great fit for exploring{" "}
                {data.genres.length ? data.genres.slice(0, 2).join(" & ").toLowerCase() : "the topic"}{" "}
                through story and real footage. AI-generated learning objectives and quizzes are coming
                soon.
              </p>
            </div>

            {data.director && (
              <p className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Director:</span> {data.director}
              </p>
            )}
          </div>
        </div>
        {/* AI Study Guide */}
        <StudyGuide
          title={data.title}
          mediaType={type}
          overview={data.overview}
          genres={data.genres}
          year={data.year}
        />

        {/* Cast */}

        {data.cast.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-bold">Cast</h2>
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
              {data.cast.map((c) => (
                <div key={c.name} className="w-24 shrink-0 text-center">
                  <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
                    {c.profile ? (
                      <img src={c.profile} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs font-medium">{c.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Similar */}
        {data.similar.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-bold">Similar recommendations</h2>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {data.similar.map((item) => (
                <TitleCard key={`${item.mediaType}-${item.id}`} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
