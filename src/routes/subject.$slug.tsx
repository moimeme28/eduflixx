import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { getSubject, LEARNING_LEVELS, LEARNING_FORMATS } from "@/lib/subjects";
import { getEducationalByQuery } from "@/lib/tmdb.functions";
import { TitleCard } from "@/components/TitleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subject/$slug")({
  // Loader data must be serializable — return the slug only and look the
  // subject (which carries a React icon component) up during render.
  loader: ({ params }) => {
    const subject = getSubject(params.slug);
    if (!subject) throw notFound();
    return { slug: subject.slug };
  },
  head: ({ loaderData }) => {
    const subject = loaderData ? getSubject(loaderData.slug) : undefined;
    return {
      meta: subject
        ? [
            { title: `${subject.name} — EduFlix` },
            { name: "description", content: `Learn ${subject.name}: ${subject.blurb}` },
          ]
        : [{ title: "Subject — EduFlix" }],
    };
  },

  notFoundComponent: () => (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Subject not found</h1>
      <Link to="/subjects" className="mt-4 inline-block text-primary hover:underline">
        Browse all subjects
      </Link>
    </main>
  ),
  component: SubjectPage,
});

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SubjectPage() {
  const { slug } = Route.useLoaderData();
  const subject = getSubject(slug);
  if (!subject) throw notFound();

  const [topic, setTopic] = useState<string | null>(null);
  const [level, setLevel] = useState<string>("Beginner");
  const [format, setFormat] = useState<string | null>(null);

  const queryText = topic ? `${topic} ${subject.query}` : subject.query;
  const searchFn = useServerFn(getEducationalByQuery);

  const results = useQuery({
    queryKey: ["subject", subject.slug, topic, format],
    queryFn: () => searchFn({ data: { query: queryText, format: format ?? undefined } }),
  });

  return (
    <main className="pb-20">
      <div className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/subjects" className="hover:text-foreground">
              Subjects
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{subject.name}</span>
          </div>
          <div className="mt-4 flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
              <subject.icon className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">{subject.name}</h1>
              <p className="mt-1 max-w-2xl text-muted-foreground">{subject.blurb}</p>
            </div>
          </div>

          {/* Learning path summary */}
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl bg-secondary/60 p-3 text-sm">
            <span className="font-semibold">{subject.name}</span>
            {topic && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span>{topic}</span>
              </>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span>{level}</span>
            {format && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span>{format}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-8">
        {/* Topics */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topic</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={topic === null} onClick={() => setTopic(null)}>
              All topics
            </Chip>
            {subject.topics.map((t: string) => (
              <Chip key={t} active={topic === t} onClick={() => setTopic(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>

        {/* Level */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Level</p>
          <div className="flex flex-wrap gap-2">
            {LEARNING_LEVELS.map((l) => (
              <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                {l}
              </Chip>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Format</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={format === null} onClick={() => setFormat(null)}>
              Any format
            </Chip>
            {LEARNING_FORMATS.map((f) => (
              <Chip key={f} active={format === f} onClick={() => setFormat(f)}>
                {f}
              </Chip>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="pt-4">
          {results.isLoading ? (
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
            <p className="py-16 text-center text-muted-foreground">
              No matches for this combination. Try a different topic or format.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
