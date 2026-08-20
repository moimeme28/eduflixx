import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Users, GraduationCap, BookOpen, Layers, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { claimAdmin, getAdminOverview, setUserRole, type AppRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel | EduFlix" },
      { name: "description", content: "Manage EduFlix users, roles, and classrooms from the admin control panel." },
      { property: "og:title", content: "Admin Panel | EduFlix" },
      { property: "og:description", content: "Manage EduFlix users, roles, and classrooms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const ROLES: AppRole[] = ["student", "teacher", "admin"];

function AdminPage() {
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getAdminOverview);
  const claim = useServerFn(claimAdmin);
  const setRole = useServerFn(setUserRole);
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
  });

  const claimMut = useMutation({
    mutationFn: () => claim(),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success("You are now an admin");
        qc.invalidateQueries({ queryKey: ["admin-overview"] });
        qc.invalidateQueries({ queryKey: ["my-role"] });
      } else {
        toast.error("An admin already exists — ask them to grant you access.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: AppRole; grant: boolean }) => setRole({ data: v }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = useMemo(() => {
    const list = data?.users ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((u) => (u.displayName ?? "").toLowerCase().includes(term) || u.id.includes(term));
  }, [data, q]);

  if (isLoading) {
    return <div className="mx-auto max-w-[1200px] px-4 py-16 text-muted-foreground sm:px-8">Loading admin panel…</div>;
  }

  if (!data?.isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-8">
        <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="text-2xl font-bold">Admin panel</h1>
        {data?.adminExists ? (
          <p className="mt-3 text-muted-foreground">
            You don't have admin access. Ask an existing admin to grant you the admin role.
          </p>
        ) : (
          <>
            <p className="mt-3 text-muted-foreground">
              No admin exists yet. As the first signed-in user you can claim admin access for this workspace.
            </p>
            <Button className="mt-6" onClick={() => claimMut.mutate()} disabled={claimMut.isPending}>
              {claimMut.isPending ? "Claiming…" : "Claim admin access"}
            </Button>
          </>
        )}
      </div>
    );
  }

  const s = data.stats;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
      <header className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-primary/15 p-2.5">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Admin control panel</h1>
          <p className="text-sm text-muted-foreground">Manage people, roles and classrooms across EduFlix.</p>
        </div>
      </header>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat icon={<Users className="h-4 w-4" />} label="Users" value={s.users} />
        <Stat icon={<GraduationCap className="h-4 w-4" />} label="Teachers" value={s.teachers} />
        <Stat icon={<Users className="h-4 w-4" />} label="Students" value={s.students} />
        <Stat icon={<Layers className="h-4 w-4" />} label="Classes" value={s.classes} />
        <Stat icon={<BookOpen className="h-4 w-4" />} label="Assignments" value={s.assignments} />
      </div>

      <section className="mb-12">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Users &amp; roles</h2>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="pl-9" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          {users.length === 0 && <p className="p-6 text-sm text-muted-foreground">No users found.</p>}
          {users.map((u) => (
            <div key={u.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium">{u.displayName ?? "Unnamed user"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Joined {new Date(u.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {u.roles.map((r) => (
                    <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => {
                  const has = u.roles.includes(r);
                  return (
                    <Button
                      key={r}
                      size="sm"
                      variant={has ? "secondary" : "outline"}
                      disabled={roleMut.isPending}
                      onClick={() => roleMut.mutate({ userId: u.id, role: r, grant: !has })}
                    >
                      {has ? `Remove ${r}` : `Make ${r}`}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Classrooms</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.classes.length === 0 && <p className="text-sm text-muted-foreground">No classes created yet.</p>}
          {data.classes.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border p-4">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {c.subject ?? "General"} · Teacher: {c.teacherName ?? "Unknown"}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {c.memberCount} students · {c.assignmentCount} assignments
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
