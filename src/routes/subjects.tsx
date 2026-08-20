import { createFileRoute, Link } from "@tanstack/react-router";
import { SUBJECTS, SUBJECT_GROUPS } from "@/lib/subjects";

export const Route = createFileRoute("/subjects")({
  head: () => ({
    meta: [
      { title: "Browse subjects — EduFlix" },
      {
        name: "description",
        content: "Browse educational subjects from biology to history and pick what you want to learn.",
      },
    ],
  }),
  component: Subjects,
});

function Subjects() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold sm:text-4xl">Explore subjects</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Choose a subject to find documentaries, films and series that teach it — then narrow by
        topic, level and format.
      </p>

      <div className="mt-10 space-y-12">
        {SUBJECT_GROUPS.map((group) => {
          const subjects = SUBJECTS.filter((s) => s.group === group);
          if (subjects.length === 0) return null;
          return (
            <section key={group}>
              <h2 className="mb-4 text-lg font-bold text-muted-foreground">{group}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {subjects.map((s) => (
                  <Link
                    key={s.slug}
                    to="/subject/$slug"
                    params={{ slug: s.slug }}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/60 hover:shadow-[var(--shadow-glow)]"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary transition-transform group-hover:scale-110">
                      <s.icon className="h-6 w-6" />
                    </span>
                    <p className="mt-4 text-lg font-semibold">{s.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.blurb}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {s.topics.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
