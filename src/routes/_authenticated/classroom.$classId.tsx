import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Mail,
  UserPlus,
  Trash2,
  Loader2,
  Plus,
  Film,
  Tv,
  Search,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getClassDetail,
  inviteStudent,
  revokeInvite,
  removeMember,
  createAssignment,
  deleteAssignment,
  setAssignmentProgress,
} from "@/lib/classroom.functions";
import { searchTitles } from "@/lib/tmdb.functions";

export const Route = createFileRoute("/_authenticated/classroom/$classId")({
  component: ClassDetail,
});

function ClassDetail() {
  const { classId } = Route.useParams();
  const detailFn = useServerFn(getClassDetail);
  const q = useQuery({
    queryKey: ["class-detail", classId],
    queryFn: () => detailFn({ data: { classId } }),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: (query) => query.state.data?.isTeacher ? 15_000 : false,
  });

  if (q.isLoading) {
    return <p className="mx-auto max-w-[1000px] px-4 py-10 text-sm text-muted-foreground">Loading…</p>;
  }
  if (q.error || !q.data) {
    return <p className="mx-auto max-w-[1000px] px-4 py-10 text-sm text-destructive">Class not found.</p>;
  }
  const d = q.data;

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-8">
      <Link to="/classroom" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All classes
      </Link>
      <h1 className="text-2xl font-bold sm:text-3xl">{d.cls.name}</h1>
      {d.cls.subject && <div className="mt-1 text-sm uppercase tracking-wide text-primary">{d.cls.subject}</div>}
      {d.cls.description && <p className="mt-2 text-muted-foreground">{d.cls.description}</p>}

      <div className="mt-2 text-xs text-muted-foreground">
        {d.isTeacher ? "You teach this class" : "You are enrolled"}
      </div>

      {/* Assignments */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Assignments</h2>
          {d.isTeacher && <NewAssignmentButton classId={classId} />}
        </div>

        {d.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {d.isTeacher ? "No assignments yet. Add a movie or episode with a scene range." : "No assignments yet."}
          </p>
        ) : (
          <div className="grid gap-3">
            {d.assignments.map((a) => (
              <AssignmentRow
                key={a.id}
                a={a}
                isTeacher={d.isTeacher}
                classId={classId}
                members={d.members}
                progress={d.progressMatrix?.[a.id] ?? {}}
              />
            ))}
          </div>

        )}
      </section>

      {/* Members */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">Students ({d.members.length})</h2>
        {d.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card/50">
            {d.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{m.displayName || "Student"}</span>
                {d.isTeacher && <RemoveMemberButton memberId={m.id} classId={classId} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invites (teacher only) */}
      {d.isTeacher && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Invite students</h2>
          <InviteForm classId={classId} />
          {d.invites.length > 0 && (
            <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card/50">
              {d.invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {i.email}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${i.status === "accepted" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {i.status}
                    </span>
                  </span>
                  <RevokeInviteButton inviteId={i.id} classId={classId} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

function InviteForm({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const inviteFn = useServerFn(inviteStudent);
  const [email, setEmail] = useState("");
  const mut = useMutation({
    mutationFn: () => inviteFn({ data: { classId, email } }),
    onSuccess: () => {
      toast.success("Invitation added");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["class-detail", classId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email.trim()) mut.mutate();
      }}
      className="flex gap-2"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="student@school.edu"
        className="flex-1 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm outline-none ring-primary/50 focus:ring-2"
      />
      <Button type="submit" disabled={mut.isPending} className="gap-1">
        <UserPlus className="h-4 w-4" /> Invite
      </Button>
    </form>
  );
}

function RevokeInviteButton({ inviteId, classId }: { inviteId: string; classId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(revokeInvite);
  const mut = useMutation({
    mutationFn: () => fn({ data: { inviteId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["class-detail", classId] }),
  });
  return (
    <Button size="icon" variant="ghost" onClick={() => mut.mutate()} aria-label="Revoke">
      <X className="h-4 w-4" />
    </Button>
  );
}

function RemoveMemberButton({ memberId, classId }: { memberId: string; classId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(removeMember);
  const mut = useMutation({
    mutationFn: () => fn({ data: { memberId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["class-detail", classId] }),
  });
  return (
    <Button size="icon" variant="ghost" onClick={() => mut.mutate()} aria-label="Remove">
      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
    </Button>
  );
}

function NewAssignmentButton({ classId }: { classId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1">
        <Plus className="h-4 w-4" /> New assignment
      </Button>
      {open && <NewAssignmentModal classId={classId} onClose={() => setOpen(false)} />}
    </>
  );
}

function NewAssignmentModal({ classId, onClose }: { classId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const searchFn = useServerFn(searchTitles);
  const createFn = useServerFn(createAssignment);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{
    id: number;
    mediaType: "movie" | "tv";
    title: string;
    poster: string | null;
  } | null>(null);
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [sceneStart, setSceneStart] = useState("");
  const [sceneEnd, setSceneEnd] = useState("");
  const [episodeInfo, setEpisodeInfo] = useState("");
  const [dueDate, setDueDate] = useState("");

  const searchQ = useQuery({
    queryKey: ["assignment-search", query],
    queryFn: () => searchFn({ data: { query } }),
    enabled: query.trim().length > 1,
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (!picked) throw new Error("Pick a title first");
      return createFn({
        data: {
          classId,
          tmdbId: picked.id,
          mediaType: picked.mediaType,
          title: picked.title,
          poster: picked.poster,
          subject: subject.trim() || undefined,
          note: note.trim() || undefined,
          sceneStart: sceneStart.trim() || undefined,
          sceneEnd: sceneEnd.trim() || undefined,
          episodeInfo: episodeInfo.trim() || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Assignment created");
      qc.invalidateQueries({ queryKey: ["class-detail", classId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">New assignment</h3>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!picked ? (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies or series…"
                className="w-full rounded-full border border-border bg-background/60 py-2 pl-9 pr-4 text-sm outline-none ring-primary/50 focus:ring-2"
              />
            </div>
            <div className="mt-3 grid gap-2">
              {searchQ.isLoading && query.length > 1 && (
                <p className="text-sm text-muted-foreground">Searching…</p>
              )}
              {(searchQ.data ?? []).slice(0, 10).map((r) => (
                <button
                  key={`${r.mediaType}-${r.id}`}
                  onClick={() =>
                    setPicked({
                      id: r.id,
                      mediaType: r.mediaType,
                      title: r.title,
                      poster: r.poster,
                    })
                  }
                  className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-2 text-left hover:border-primary"
                >
                  {r.poster ? (
                    <img src={r.poster} alt="" className="h-16 w-11 rounded object-cover" />
                  ) : (
                    <div className="grid h-16 w-11 place-items-center rounded bg-muted">
                      {r.mediaType === "tv" ? <Tv className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.mediaType === "tv" ? "Series" : "Film"} · {r.year || "—"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3 rounded-lg border border-border bg-background/40 p-2">
              {picked.poster ? (
                <img src={picked.poster} alt="" className="h-20 w-14 rounded object-cover" />
              ) : (
                <div className="grid h-20 w-14 place-items-center rounded bg-muted">
                  {picked.mediaType === "tv" ? <Tv className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                </div>
              )}
              <div className="flex-1">
                <div className="font-semibold">{picked.title}</div>
                <button
                  onClick={() => setPicked(null)}
                  className="mt-1 text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Change
                </button>
              </div>
            </div>

            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject / topic (e.g. Photosynthesis)"
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What to look for / study notes"
              rows={3}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
            />
            {picked.mediaType === "tv" && (
              <input
                value={episodeInfo}
                onChange={(e) => setEpisodeInfo(e.target.value)}
                placeholder="Episode (e.g. S1E3)"
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                value={sceneStart}
                onChange={(e) => setSceneStart(e.target.value)}
                placeholder="Scene start (14:20)"
                className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
              />
              <input
                value={sceneEnd}
                onChange={(e) => setSceneEnd(e.target.value)}
                placeholder="Scene end (19:10)"
                className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
              />
            </div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
            />
            <div className="flex gap-2 pt-2">
              <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="gap-1">
                {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create assignment
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
] as const;

function statusLabel(s: string | null | undefined) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? "Not started";
}

function AssignmentRow({
  a,
  isTeacher,
  classId,
  members,
  progress,
}: {
  a: {
    id: string;
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
  };
  isTeacher: boolean;
  classId: string;
  members: { id: string; studentId: string; displayName: string | null }[];
  progress: Record<string, string>;
}) {
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteAssignment);
  const progressFn = useServerFn(setAssignmentProgress);
  const [showRoster, setShowRoster] = useState(false);
  const del = useMutation({
    mutationFn: () => deleteFn({ data: { id: a.id } }),
    onSuccess: () => {
      toast.success("Assignment deleted");
      qc.invalidateQueries({ queryKey: ["class-detail", classId] });
    },
  });
  const status = a.progressStatus ?? "not_started";
  const setProg = useMutation({
    mutationFn: (s: string) => progressFn({ data: { assignmentId: a.id, status: s } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["class-detail", classId] }),
  });
  const doneCount = members.filter((m) => progress[m.studentId] === "completed").length;


  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card/50 p-3">
      <Link to="/title/$type/$id" params={{ type: a.mediaType, id: String(a.tmdbId) }} className="shrink-0">
        {a.poster ? (
          <img src={a.poster} alt={a.title} className="h-28 w-20 rounded-lg object-cover" />
        ) : (
          <div className="grid h-28 w-20 place-items-center rounded-lg bg-muted">
            {a.mediaType === "tv" ? <Tv className="h-5 w-5" /> : <Film className="h-5 w-5" />}
          </div>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/title/$type/$id"
            params={{ type: a.mediaType, id: String(a.tmdbId) }}
            className="font-semibold hover:text-primary"
          >
            {a.title}
          </Link>
          {a.subject && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase text-primary">
              {a.subject}
            </span>
          )}
        </div>
        {(a.sceneStart || a.sceneEnd || a.episodeInfo) && (
          <div className="mt-1 text-xs text-accent">
            {a.episodeInfo && <>Ep. {a.episodeInfo} · </>}
            {a.sceneStart && <>Scene {a.sceneStart}{a.sceneEnd ? `–${a.sceneEnd}` : ""}</>}
          </div>
        )}
        {a.note && <p className="mt-1 text-sm text-foreground/80">{a.note}</p>}
        {a.dueDate && (
          <div className="mt-1 text-xs text-muted-foreground">Due {new Date(a.dueDate).toLocaleDateString()}</div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!isTeacher && (
            <>
              <span className="text-xs text-muted-foreground">My status</span>
              <select
                value={status}
                onChange={(e) => setProg.mutate(e.target.value)}
                disabled={setProg.isPending}
                className="rounded-lg border border-border bg-background/60 px-2 py-1 text-xs outline-none ring-primary/50 focus:ring-2"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {status === "completed" && <CheckCircle2 className="h-4 w-4 text-accent" />}
            </>
          )}
          {isTeacher && (
            <>
              <button
                type="button"
                onClick={() => setShowRoster((v) => !v)}
                className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium hover:border-primary"
              >
                {doneCount}/{members.length} students completed {showRoster ? "▲" : "▼"}
              </button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Delete this assignment?")) del.mutate();
                }}
                className="ml-auto gap-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </>
          )}
        </div>
        {isTeacher && showRoster && (
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-background/40">
            {members.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">No students enrolled yet.</li>
            ) : (
              members.map((m) => {
                const s = progress[m.studentId] ?? "not_started";
                const tone =
                  s === "completed"
                    ? "bg-accent/15 text-accent"
                    : s === "in_progress"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground";
                return (
                  <li key={m.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span>{m.displayName || "Student"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${tone}`}>
                      {statusLabel(s)}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        )}

      </div>
    </div>
  );
}
