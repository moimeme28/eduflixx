import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  GraduationCap,
  Users,
  Plus,
  BookOpen,
  Clock,
  CheckCircle2,
  Loader2,
  Trash2,
  Film,
  Tv,
  ClipboardList,
  Presentation,
  Target,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import {
  listMyClasses,
  createClass,
  deleteClass,
  acceptMyInvites,
  listMyAssignments,
  setAssignmentProgress,
  type ClassRow,
} from "@/lib/classroom.functions";

export const Route = createFileRoute("/_authenticated/classroom/")({
  component: ClassroomHub,
  head: () => ({
    meta: [
      { title: "Classroom — EduFlix" },
      { name: "description", content: "Teachers create classes and assign educational scenes. Students track their study assignments." },
    ],
  }),
});

function ClassroomHub() {
  const { role, isLoading } = useRole();
  const acceptFn = useServerFn(acceptMyInvites);
  const qc = useQueryClient();

  useEffect(() => {
    acceptFn()
      .then((r) => {
        if (r.joined > 0) {
          toast.success(`Joined ${r.joined} class${r.joined === 1 ? "" : "es"}`);
          qc.invalidateQueries({ queryKey: ["my-classes"] });
        }
      })
      .catch(() => {});
  }, [acceptFn, qc]);

  if (isLoading) {
    return <p className="mx-auto max-w-[1200px] px-4 py-16 text-sm text-muted-foreground">Loading…</p>;
  }

  return role === "teacher" ? <TeacherDashboard /> : <StudentDashboard />;
}

/* ------------------------------- TEACHER ------------------------------- */

function TeacherDashboard() {
  const listFn = useServerFn(listMyClasses);
  const classesQ = useQuery({
    queryKey: ["my-classes"],
    queryFn: () => listFn(),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 15_000,
  });
  const teaching = classesQ.data?.teaching ?? [];

  const totalClasses = teaching.length;

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[image:var(--gradient-primary)] p-6 text-primary-foreground sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <Presentation className="h-7 w-7" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-white/80">Teacher workspace</div>
            <h1 className="text-2xl font-bold sm:text-3xl">Your classroom control center</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">
              Build classes, invite students by email, and assign scene-level study material.
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard icon={Users} label="Classes" value={totalClasses} />
        <StatCard
          icon={Target}
          label="Total students"
          value={teaching.reduce((s, c) => s + ((c as ClassRow).memberCount ?? 0), 0)}
        />
        <StatCard icon={ClipboardList} label="Role" value="Teacher" />
      </div>

      <TeacherClassesSection teaching={teaching} loading={classesQ.isLoading} />

      {/* Tips */}
      <section className="mt-10 rounded-2xl border border-border bg-card/50 p-5">
        <h3 className="font-semibold">Quick tips for teachers</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• Invite students by email — they auto-join on next sign-in.</li>
          <li>• Pin exact scenes (e.g. <span className="text-accent">14:20–19:10</span>) to focus study time.</li>
          <li>• Add a due date and note so students know what to look for.</li>
        </ul>
      </section>
    </main>
  );
}

function TeacherClassesSection({ teaching, loading }: { teaching: ClassRow[]; loading: boolean }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createClass);
  const deleteFn = useServerFn(deleteClass);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          subject: subject.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Class created");
      setName("");
      setDescription("");
      setSubject("");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["my-classes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (classId: string) => deleteFn({ data: { classId } }),
    onSuccess: () => {
      toast.success("Class deleted");
      qc.invalidateQueries({ queryKey: ["my-classes"] });
    },
  });

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Users className="h-5 w-5 text-primary" /> Your classes
        </h2>
        <Button size="sm" onClick={() => setCreating((v) => !v)} className="gap-1">
          <Plus className="h-4 w-4" /> New class
        </Button>
      </div>

      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createMut.mutate();
          }}
          className="mb-4 space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-4"
        >
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Class name (e.g. Biology 101)"
            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-primary/50 focus:ring-2"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (optional, e.g. Biology)"
            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-primary/50 focus:ring-2"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-primary/50 focus:ring-2"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create class"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : teaching.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
          <Presentation className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            You haven't created any classes yet. Create one to invite students and assign scenes.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {teaching.map((c) => (
            <TeacherClassCard
              key={c.id}
              cls={c}
              onDelete={() => {
                if (confirm(`Delete "${c.name}"? This removes all assignments and members.`)) {
                  deleteMut.mutate(c.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TeacherClassCard({ cls, onDelete }: { cls: ClassRow; onDelete: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-5 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
      <div className="absolute inset-x-0 top-0 h-1 bg-[image:var(--gradient-primary)]" />
      <div className="flex items-start justify-between gap-2">
        <Link to="/classroom/$classId" params={{ classId: cls.id }} className="flex-1 min-w-0">
          <div className="text-lg font-semibold">{cls.name}</div>
          {cls.subject && (
            <div className="mt-0.5 text-xs uppercase tracking-wide text-primary">{cls.subject}</div>
          )}
          {cls.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{cls.description}</p>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs font-medium">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {cls.memberCount ?? 0} student{(cls.memberCount ?? 0) === 1 ? "" : "s"}
            </span>
            <span className="text-primary">Manage class →</span>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
            <span className="font-medium text-foreground">
              {cls.completedCount ?? 0}/{cls.expectedCompletionCount ?? 0} assignment completions
            </span>
            <span className="text-muted-foreground">
              across {cls.assignmentCount ?? 0} assignment{(cls.assignmentCount ?? 0) === 1 ? "" : "s"}
            </span>
          </div>

        </Link>
        <Button
          size="icon"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete class"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- STUDENT ------------------------------- */

function StudentDashboard() {
  const listFn = useServerFn(listMyClasses);
  const assignmentsFn = useServerFn(listMyAssignments);
  const classesQ = useQuery({ queryKey: ["my-classes"], queryFn: () => listFn() });
  const assignmentsQ = useQuery({ queryKey: ["my-assignments"], queryFn: () => assignmentsFn() });

  const enrolled = classesQ.data?.enrolled ?? [];
  const assignments = assignmentsQ.data ?? [];
  const completed = assignments.filter((a) => a.progressStatus === "completed").length;
  const upcoming = assignments.filter((a) => a.progressStatus !== "completed");

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/20 via-primary/10 to-transparent p-6 sm:p-8">
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-accent/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/20 text-accent">
            <GraduationCap className="h-7 w-7" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-accent">Student workspace</div>
            <h1 className="text-2xl font-bold sm:text-3xl">Ready to study?</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Your enrolled classes and study assignments — with the exact scenes you need to watch.
            </p>
          </div>
        </div>
      </div>

      {/* Progress stats */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Classes joined" value={enrolled.length} tone="accent" />
        <StatCard icon={ClipboardList} label="Assignments" value={assignments.length} tone="accent" />
        <StatCard icon={TrendingUp} label="Completed" value={`${completed}/${assignments.length}`} tone="accent" />
      </div>

      {/* Upcoming assignments */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <CalendarDays className="h-5 w-5 text-accent" /> Up next to study
        </h2>
        {assignmentsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
            {assignments.length === 0
              ? "No assignments yet. When a teacher assigns a scene, it appears here."
              : "🎉 You're all caught up!"}
          </div>
        ) : (
          <div className="grid gap-3">
            {upcoming.map((a) => (
              <AssignmentCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      {/* Completed */}
      {completed > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" /> Completed ({completed})
          </h2>
          <div className="grid gap-3 opacity-75">
            {assignments
              .filter((a) => a.progressStatus === "completed")
              .map((a) => (
                <AssignmentCard key={a.id} a={a} />
              ))}
          </div>
        </section>
      )}

      {/* Classes */}
      <section className="mt-12">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <BookOpen className="h-5 w-5 text-accent" /> Your classes
        </h2>
        {enrolled.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
            You're not enrolled in any classes yet. Ask your teacher to invite you by email.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {enrolled.map((c) => (
              <StudentClassCard key={c.id} cls={c} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StudentClassCard({ cls }: { cls: ClassRow }) {
  return (
    <Link
      to="/classroom/$classId"
      params={{ classId: cls.id }}
      className="group flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4 transition-all hover:border-accent/50 hover:bg-card"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
        <BookOpen className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{cls.name}</div>
        {cls.subject && (
          <div className="mt-0.5 text-xs uppercase tracking-wide text-accent">{cls.subject}</div>
        )}
        {cls.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{cls.description}</p>
        )}
      </div>
    </Link>
  );
}

/* ------------------------------- SHARED ------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  tone?: "primary" | "accent";
}) {
  const color = tone === "accent" ? "text-accent bg-accent/15" : "text-primary bg-primary/15";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 p-4">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </div>
  );
}

function AssignmentCard({
  a,
}: {
  a: {
    id: string;
    classId: string;
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    poster: string | null;
    subject: string | null;
    note: string | null;
    sceneStart: string | null;
    sceneEnd: string | null;
    episodeInfo: string | null;
    dueDate: string | null;
    progressStatus?: string | null;
    className?: string;
  };
}) {
  const qc = useQueryClient();
  const progressFn = useServerFn(setAssignmentProgress);
  const mut = useMutation({
    mutationFn: (status: string) => progressFn({ data: { assignmentId: a.id, status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-assignments"] }),
  });

  const status = a.progressStatus ?? "not_started";
  const done = status === "completed";

  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card/50 p-3">
      <Link
        to="/title/$type/$id"
        params={{ type: a.mediaType, id: String(a.tmdbId) }}
        className="shrink-0"
      >
        {a.poster ? (
          <img src={a.poster} alt={a.title} className="h-28 w-20 rounded-lg object-cover" />
        ) : (
          <div className="grid h-28 w-20 place-items-center rounded-lg bg-muted text-muted-foreground">
            {a.mediaType === "tv" ? <Tv className="h-5 w-5" /> : <Film className="h-5 w-5" />}
          </div>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to="/title/$type/$id"
              params={{ type: a.mediaType, id: String(a.tmdbId) }}
              className="font-semibold hover:text-primary"
            >
              {a.title}
            </Link>
            {a.className && (
              <div className="text-xs text-muted-foreground">for {a.className}</div>
            )}
          </div>
          {a.subject && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
              {a.subject}
            </span>
          )}
        </div>
        {(a.sceneStart || a.sceneEnd || a.episodeInfo) && (
          <div className="mt-1 flex items-center gap-1 text-xs text-accent">
            <Clock className="h-3 w-3" />
            {a.episodeInfo && <>Ep. {a.episodeInfo} · </>}
            {a.sceneStart && <>Scene {a.sceneStart}{a.sceneEnd ? `–${a.sceneEnd}` : ""}</>}
          </div>
        )}
        {a.note && <p className="mt-1 text-sm text-foreground/80">{a.note}</p>}
        {a.dueDate && (
          <div className="mt-1 text-xs text-muted-foreground">Due {new Date(a.dueDate).toLocaleDateString()}</div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">My status</span>
          <select
            value={status}
            onChange={(e) => mut.mutate(e.target.value)}
            disabled={mut.isPending}
            className="rounded-lg border border-border bg-background/60 px-2 py-1 text-xs outline-none ring-accent/50 focus:ring-2"
          >
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
          {done && <CheckCircle2 className="h-4 w-4 text-accent" />}
        </div>

      </div>
    </div>
  );
}
