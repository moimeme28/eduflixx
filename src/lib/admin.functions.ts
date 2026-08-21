import { requireAuthDb } from "@/lib/db-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AppRole = "student" | "teacher" | "admin";

export interface AdminUserRow {
  id: string;
  displayName: string | null;
  createdAt: string;
  roles: AppRole[];
}

export interface AdminClassRow {
  id: string;
  name: string;
  subject: string | null;
  teacherId: string;
  teacherName: string | null;
  createdAt: string;
  memberCount: number;
  assignmentCount: number;
}

export interface AdminOverview {
  isAdmin: boolean;
  adminExists: boolean;
  stats: { users: number; teachers: number; students: number; classes: number; assignments: number };
  users: AdminUserRow[];
  classes: AdminClassRow[];
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireAuthDb])
  .handler(async ({ context }): Promise<AdminOverview> => {
    const { data: myRoles } = await context.db
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (myRoles ?? []).some((r) => r.role === "admin");

    const { data: exists } = await context.db.rpc("admin_exists");
    const adminExists = Boolean(exists);

    const empty: AdminOverview = {
      isAdmin,
      adminExists,
      stats: { users: 0, teachers: 0, students: 0, classes: 0, assignments: 0 },
      users: [],
      classes: [],
    };
    if (!isAdmin) return empty;

    const [profRes, rolesRes, classRes, assignRes, memberRes] = await Promise.all([
      context.db.from("profiles").select("id, display_name, created_at").order("created_at", { ascending: false }),
      context.db.from("user_roles").select("user_id, role"),
      context.db.from("classes").select("id, name, subject, teacher_id, created_at").order("created_at", { ascending: false }),
      context.db.from("assignments").select("id, class_id"),
      context.db.from("class_members").select("id, class_id"),
    ]);

    const roleMap = new Map<string, AppRole[]>();
    for (const r of rolesRes.data ?? []) {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role as AppRole);
      roleMap.set(r.user_id, list);
    }

    const users: AdminUserRow[] = (profRes.data ?? []).map((p) => ({
      id: p.id,
      displayName: p.display_name,
      createdAt: p.created_at,
      roles: roleMap.get(p.id) ?? ["student"],
    }));

    const nameById = new Map(users.map((u) => [u.id, u.displayName]));
    const classes: AdminClassRow[] = (classRes.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      teacherId: c.teacher_id,
      teacherName: nameById.get(c.teacher_id) ?? null,
      createdAt: c.created_at,
      memberCount: (memberRes.data ?? []).filter((m) => m.class_id === c.id).length,
      assignmentCount: (assignRes.data ?? []).filter((a) => a.class_id === c.id).length,
    }));

    return {
      isAdmin,
      adminExists,
      stats: {
        users: users.length,
        teachers: users.filter((u) => u.roles.includes("teacher")).length,
        students: users.filter((u) => u.roles.includes("student")).length,
        classes: classes.length,
        assignments: (assignRes.data ?? []).length,
      },
      users,
      classes,
    };
  });

// First user to claim the console becomes admin; afterwards only an existing
// admin can change roles.
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const admins = await context.db.count("user_roles", { role: "admin" });
    if (admins > 0) return { ok: false };
    const { error } = await context.db
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["student", "teacher", "admin"]),
        grant: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    const callerIsAdmin =
      (await context.db.count("user_roles", { user_id: context.userId, role: "admin" })) > 0;
    if (!callerIsAdmin) throw new Error("Forbidden");

    const { error } = data.grant
      ? await context.db
          .from("user_roles")
          .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" })
      : await context.db
          .from("user_roles")
          .delete()
          .eq("user_id", data.userId)
          .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
