import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, BookOpen, MessageCircleQuestion, ListChecks, Clapperboard, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateStudyGuide, type StudyGuide as Guide } from "@/lib/study-guide.functions";

interface Props {
  title: string;
  mediaType: "movie" | "tv";
  overview: string;
  genres: string[];
  year: string;
}

export function StudyGuide(props: Props) {
  const fn = useServerFn(generateStudyGuide);
  const mut = useMutation({
    mutationFn: () => fn({ data: props }),
  });

  return (
    <section className="mt-12 rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-bold">AI Study Guide</h2>
            <p className="text-xs text-muted-foreground">
              Key concepts, quiz and scene pointers, generated for this title.
            </p>
          </div>
        </div>
        <Button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          size="sm"
          className="gap-1.5"
        >
          {mut.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
          ) : mut.data ? (
            "Regenerate"
          ) : (
            "Generate study guide"
          )}
        </Button>
      </div>

      {mut.isError && (
        <p className="mt-4 text-sm text-destructive">
          Couldn't generate — {(mut.error as Error).message}
        </p>
      )}

      {mut.data && <GuideContent guide={mut.data} />}
    </section>
  );
}

function GuideContent({ guide }: { guide: Guide }) {
  return (
    <div className="mt-5 space-y-6 text-sm">
      <p className="text-foreground/85">{guide.summary}</p>

      <Block icon={<BookOpen className="h-4 w-4" />} title="Key concepts">
        <ul className="space-y-2">
          {guide.keyConcepts.map((c) => (
            <li key={c.term} className="rounded-lg bg-background/50 p-3">
              <span className="font-semibold text-primary">{c.term}</span>
              <span className="text-muted-foreground"> — {c.definition}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block icon={<Clapperboard className="h-4 w-4" />} title="Scenes worth studying">
        <ul className="space-y-2">
          {guide.scenePointers.map((s, i) => (
            <li key={i} className="rounded-lg bg-background/50 p-3">
              <span className="font-semibold text-accent">{s.label}</span>
              <span className="text-muted-foreground"> — {s.why}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block icon={<MessageCircleQuestion className="h-4 w-4" />} title="Discussion questions">
        <ol className="ml-5 list-decimal space-y-1 text-foreground/85">
          {guide.discussionQuestions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      </Block>

      <Block icon={<ListChecks className="h-4 w-4" />} title="Quick quiz">
        <div className="space-y-4">
          {guide.quiz.map((q, i) => (
            <QuizItem key={i} index={i} q={q} />
          ))}
        </div>
      </Block>
    </div>
  );
}

function Block({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function QuizItem({
  index,
  q,
}: {
  index: number;
  q: Guide["quiz"][number];
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const revealed = picked !== null;
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <p className="font-medium">
        {index + 1}. {q.question}
      </p>
      <div className="mt-2 grid gap-1.5">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answerIndex;
          const isPicked = i === picked;
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => setPicked(i)}
              className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-left text-sm transition-colors ${
                revealed && isAnswer
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : revealed && isPicked
                    ? "border-destructive/40 bg-destructive/10 text-foreground"
                    : "border-border hover:border-primary/40"
              }`}
            >
              <span>{opt}</span>
              {revealed && isAnswer && <Check className="h-4 w-4 text-primary" />}
              {revealed && isPicked && !isAnswer && <X className="h-4 w-4 text-destructive" />}
            </button>
          );
        })}
      </div>
      {revealed && (
        <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
      )}
    </div>
  );
}
