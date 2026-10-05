import { requireAuthDb } from "@/lib/db-middleware";
import { aggregateClassTotals } from "@/lib/classroom-progress";
import { createServerFn } from "@tanstack/react-start";
import { sendClassInviteEmail } from "@/lib/email.server";

export type Role = "student" | "teacher" | "admin";

export interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  teacherId: string;
  createdAt: string;
  memberCount?: number;
  assignmentCount?: number;
  completedCount?: number;
  expectedCompletionCount?: number;
}

export interface ClassMemberRow {
  id: string;
  studentId: string;
  displayName: string | null;
  email: string | null;
  joinedAt: string;
}

export interface InviteRow {
  id: string;
  email: string;
  status: string;
  createdAt: string;
}

export interface AssignmentRow {
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
  createdAt: string;
  progressStatus?: string | null;
  className?: string;
}

// --- role ---
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireAuthDb])
  .handler(async ({ context }): Promise<{ role: Role }> => {
    // Mongo has no signup trigger, so the profile row is ensured on first read.
    const email = (context.claims?.email as string | undefined) ?? null;
    await context.db.from("profiles").upsert(
      {
        id: context.userId,
        display_name: email ? email.split("@")[0] : null,
        email,
      },
      { onConflict: "id" },
    );

    const { data } = await context.db
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (data ?? []).map((r) => r.role as Role);
    if (roles.includes("admin")) return { role: "admin" };
    if (roles.includes("teacher")) return { role: "teacher" };

    // Persist the role selected during signup the first time this account is
    // loaded. This also repairs teacher accounts previously defaulted to a
    // student because their signup metadata had not been copied to MongoDB.
    const metadata = context.claims?.user_metadata;
    const signupRole =
      metadata && typeof metadata === "object" && "role" in metadata
        ? (metadata as { role?: unknown }).role
        : undefined;
    if (signupRole === "teacher" || roles.length === 0) {
      const role: Role = signupRole === "teacher" ? "teacher" : "student";
      const { error } = await context.db
        .from("user_roles")
        .upsert({ user_id: context.userId, role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
      return { role };
    }

    return { role: "student" };
  });

// --- classes ---
export const listMyClasses = createServerFn({ method: "GET" })
  .middleware([requireAuthDb])
  .handler(async ({ context }): Promise<{ teaching: ClassRow[]; enrolled: ClassRow[] }> => {
    const [teachRes, memRes] = await Promise.all([
      context.db
        .from("classes")
        .select("id, name, description, subject, teacher_id, created_at")
        .eq("teacher_id", context.userId)
        .order("created_at", { ascending: false }),
      context.db.from("class_members").select("class_id").eq("student_id", context.userId),
    ]);
    if (teachRes.error) throw new Error(teachRes.error.message);
    if (memRes.error) throw new Error(memRes.error.message);
    const teaching = (teachRes.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      subject: r.subject,
      teacherId: r.teacher_id,
      createdAt: r.created_at,
      memberCount: 0,
      assignmentCount: 0,
      completedCount: 0,
      expectedCompletionCount: 0,
    }));
    if (teaching.length > 0) {
      const classIds: string[] = teaching.map((c) => c.id);
      const [membersResult, assignmentsResult] = await Promise.all([
        context.db.from("class_members").select("class_id").in("class_id", classIds),
        context.db.from("assignments").select("id, class_id").in("class_id", classIds),
      ]);
      if (membersResult.error) throw new Error(membersResult.error.message);
      if (assignmentsResult.error) throw new Error(assignmentsResult.error.message);

      const assignments = assignmentsResult.data ?? [];
      let progress: { assignment_id: string; student_id: string; status: string }[] = [];
      if (assignments.length > 0) {
        const progressResult = await context.db
          .from("assignment_progress")
          .select("assignment_id, student_id, status")
          .in("assignment_id", assignments.map((a) => a.id))
          .eq("status", "completed");
        if (progressResult.error) throw new Error(progressResult.error.message);
        progress = (progressResult.data ?? []) as typeof progress;
      }

      const totals = aggregateClassTotals({
        classIds,
        members: (membersResult.data ?? []) as { class_id: string }[],
        assignments: assignments as { id: string; class_id: string }[],
        progress,
      });

      for (const c of teaching) {
        const t = totals[c.id];
        if (!t) continue;
        c.memberCount = t.memberCount;
        c.assignmentCount = t.assignmentCount;
        c.completedCount = t.completedCount;
        c.expectedCompletionCount = t.expectedCompletionCount;
      }
    }

    // The Mongo gateway doesn't support PostgREST-style embeds, so fetch
    // class details separately for each enrolled membership.
    const membershipRows = (memRes.data ?? []) as { class_id: string }[];
    const enrolledClassIds = membershipRows
      .map((m) => m.class_id)
      .filter((id): id is string => typeof id === "string");
    let enrolled: ClassRow[] = [];
    if (enrolledClassIds.length > 0) {
      const enrolledRes = await context.db
        .from("classes")
        .select("id, name, description, subject, teacher_id, created_at")
        .in("id", enrolledClassIds)
        .order("created_at", { ascending: false });
      enrolled = (enrolledRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        subject: c.subject,
        teacherId: c.teacher_id,
        createdAt: c.created_at,
        memberCount: 0,
        assignmentCount: 0,
        completedCount: 0,
        expectedCompletionCount: 0,
      }));
    }
    return { teaching, enrolled };
  });

export const createClass = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator((input: { name: string; description?: string; subject?: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    // Ensure teacher role
    const { data: roles } = await context.db
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "teacher");
    if (!roles || roles.length === 0) {
      // grant teacher role automatically for first class creation
      await context.db.from("user_roles").insert({ user_id: context.userId, role: "teacher" });
    }
    const { data: row, error } = await context.db
      .from("classes")
      .insert({
        teacher_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        subject: data.subject ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator((input: { classId: string }) => input)
  .handler(async ({ data, context }) => {
    // Mongo has no cascading deletes, so dependent documents are removed here.
    const { data: assignments } = await context.db
      .from("assignments")
      .select("id")
      .eq("class_id", data.classId);
    const assignmentIds = (assignments ?? []).map((a) => a.id as string);
    if (assignmentIds.length > 0) {
      await context.db.from("assignment_progress").delete().in("assignment_id", assignmentIds);
    }
    await context.db.from("assignments").delete().eq("class_id", data.classId);
    await context.db.from("class_members").delete().eq("class_id", data.classId);
    await context.db.from("class_invites").delete().eq("class_id", data.classId);
    const { error } = await context.db.from("classes").delete().eq("id", data.classId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getClassDetail = createServerFn({ method: "GET" })
  .middleware([requireAuthDb])
  .inputValidator((input: { classId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: cls, error } = await context.db
      .from("classes")
      .select("id, name, description, subject, teacher_id, created_at")
      .eq("id", data.classId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cls) throw new Error("Class not found");
    const isTeacher = cls.teacher_id === context.userId;

    const [membersRes, invitesRes, assignmentsRes, progressRes] = await Promise.all([
      context.db
        .from("class_members")
        .select("id, student_id, joined_at")
        .eq("class_id", data.classId),
      isTeacher
        ? context.db
            .from("class_invites")
            .select("id, email, status, created_at")
            .eq("class_id", data.classId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      context.db
        .from("assignments")
        .select("id, class_id, tmdb_id, media_type, title, poster, subject, note, scene_start, scene_end, episode_info, due_date, created_at")
        .eq("class_id", data.classId)
        .order("created_at", { ascending: false }),
      context.db
        .from("assignment_progress")
        .select("assignment_id, status, student_id")
        .eq("student_id", context.userId),
    ]);
    if (membersRes.error) throw new Error(membersRes.error.message);

    const progressMap = new Map<string, string>();
    for (const p of progressRes.data ?? []) progressMap.set(p.assignment_id, p.status);

    // No PostgREST relationship exists between class_members and profiles,
    // so names are fetched separately instead of via an embed.
    const memberRows = membersRes.data ?? [];
    const nameMap = new Map<string, string | null>();
    if (memberRows.length > 0) {
      const { data: profs } = await context.db
        .from("profiles")
        .select("id, display_name")
        .in("id", memberRows.map((m) => m.student_id));
      for (const p of profs ?? []) nameMap.set(p.id, p.display_name);
    }

    const members: ClassMemberRow[] = memberRows.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      displayName: nameMap.get(r.student_id) ?? null,
      email: null,
      joinedAt: r.joined_at,
    }));

    const assignments: AssignmentRow[] = (assignmentsRes.data ?? []).map((a) => ({
      id: a.id,
      classId: a.class_id,
      tmdbId: a.tmdb_id,
      mediaType: a.media_type as "movie" | "tv",
      title: a.title,
      poster: a.poster,
      subject: a.subject,
      note: a.note,
      sceneStart: a.scene_start,
      sceneEnd: a.scene_end,
      episodeInfo: a.episode_info,
      dueDate: a.due_date,
      createdAt: a.created_at,
      progressStatus: progressMap.get(a.id) ?? null,
    }));

    // Teacher-only: full progress matrix across every student in the class.
    const progressMatrix: Record<string, Record<string, string>> = {};
    if (isTeacher && assignments.length > 0) {
      const { data: allProg, error: allProgError } = await context.db
        .from("assignment_progress")
        .select("assignment_id, student_id, status")
        .in("assignment_id", assignments.map((a) => a.id));
      if (allProgError) throw new Error(allProgError.message);
      for (const p of allProg ?? []) {
        (progressMatrix[p.assignment_id] ??= {})[p.student_id] = p.status;
      }
    }

    const invites: InviteRow[] = ((invitesRes.data ?? []) as { id: string; email: string; status: string; created_at: string }[]).map((i) => ({
      id: i.id,
      email: i.email,
      status: i.status,
      createdAt: i.created_at,
    }));

    return {
      cls: {
        id: cls.id,
        name: cls.name,
        description: cls.description,
        subject: cls.subject,
        teacherId: cls.teacher_id,
        createdAt: cls.created_at,
      } as ClassRow,
      isTeacher,
      members,
      invites,
      assignments,
      progressMatrix,
    };
  });

// --- invites ---
export const inviteStudent = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator((input: { classId: string; email: string }) => input)
  .handler(async ({ data, context }) => {
    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Invalid email");
    const { error } = await context.db.from("class_invites").upsert(
      {
        class_id: data.classId,
        email,
        invited_by: context.userId,
        status: "pending",
      },
      { onConflict: "class_id,email" },
    );
    if (error) throw new Error(error.message);

    // Fetch class name + teacher display name for the email.
    const { data: cls } = await context.db
      .from("classes")
      .select("name")
      .eq("id", data.classId)
      .maybeSingle();
    const { data: prof } = await context.db
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();

    const className = cls?.name ?? "a class";
    const teacherName = prof?.display_name ?? (context.claims?.email as string | undefined)?.split("@")[0] ?? "Your teacher";

    const emailResult = await sendClassInviteEmail({
      to: email,
      className,
      teacherName,
      appUrl: "http://localhost:8080",
    });

    return { ok: true, emailSent: emailResult.ok, emailError: emailResult.error };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator((input: { inviteId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.db.from("class_invites").delete().eq("id", data.inviteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator((input: { memberId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.db.from("class_members").delete().eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Auto-accept any pending invites addressed to the current user's email.
export const acceptMyInvites = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .handler(async ({ context }): Promise<{ joined: number }> => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase();
    if (!email) return { joined: 0 };
    // IMPORTANT: teachers can read every invite of their own classes via RLS,
    // so we must scope strictly to invites addressed to this user's email.
    const { data: invites } = await context.db
      .from("class_invites")
      .select("id, class_id, email")
      .eq("status", "pending")
      .ilike("email", email);
    if (!invites || invites.length === 0) return { joined: 0 };

    // Never enroll a teacher into a class they own.
    const { data: ownClasses } = await context.db
      .from("classes")
      .select("id")
      .eq("teacher_id", context.userId);
    const ownIds = new Set((ownClasses ?? []).map((c) => c.id));

    let joined = 0;
    for (const inv of invites) {
      if ((inv.email ?? "").toLowerCase() !== email) continue;
      if (ownIds.has(inv.class_id)) continue;
      const { error: memErr } = await context.db
        .from("class_members")
        .upsert(
          { class_id: inv.class_id, student_id: context.userId, status: "active" },
          { onConflict: "class_id,student_id" },
        );
      if (!memErr) {
        await context.db.from("class_invites").update({ status: "accepted" }).eq("id", inv.id);
        joined++;
      }
    }
    return { joined };
  });


// --- assignments ---
export const createAssignment = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator(
    (input: {
      classId: string;
      tmdbId: number;
      mediaType: "movie" | "tv";
      title: string;
      poster?: string | null;
      subject?: string | null;
      note?: string | null;
      sceneStart?: string | null;
      sceneEnd?: string | null;
      episodeInfo?: string | null;
      dueDate?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.db.from("assignments").insert({
      class_id: data.classId,
      teacher_id: context.userId,
      tmdb_id: data.tmdbId,
      media_type: data.mediaType,
      title: data.title,
      poster: data.poster ?? null,
      subject: data.subject ?? null,
      note: data.note ?? null,
      scene_start: data.sceneStart ?? null,
      scene_end: data.sceneEnd ?? null,
      episode_info: data.episodeInfo ?? null,
      due_date: data.dueDate ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAssignment = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await context.db.from("assignment_progress").delete().eq("assignment_id", data.id);
    const { error } = await context.db.from("assignments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAssignmentProgress = createServerFn({ method: "POST" })
  .middleware([requireAuthDb])
  .inputValidator((input: { assignmentId: string; status: string; notes?: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.db.from("assignment_progress").upsert(
      {
        assignment_id: data.assignmentId,
        student_id: context.userId,
        status: data.status,
        notes: data.notes ?? null,
      },
      { onConflict: "assignment_id,student_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// All assignments across classes the student belongs to.
export const listMyAssignments = createServerFn({ method: "GET" })
  .middleware([requireAuthDb])
  .handler(async ({ context }): Promise<AssignmentRow[]> => {
    const { data: memberships } = await context.db
      .from("class_members")
      .select("class_id")
      .eq("student_id", context.userId);
    const classIds = (memberships ?? []).map((m) => m.class_id);
    if (classIds.length === 0) return [];
    const [aRes, pRes, cRes] = await Promise.all([
      context.db
        .from("assignments")
        .select("id, class_id, tmdb_id, media_type, title, poster, subject, note, scene_start, scene_end, episode_info, due_date, created_at")
        .in("class_id", classIds)
        .order("created_at", { ascending: false }),
      context.db
        .from("assignment_progress")
        .select("assignment_id, status")
        .eq("student_id", context.userId),
      context.db.from("classes").select("id, name").in("id", classIds),
    ]);
    const progMap = new Map<string, string>();
    for (const p of pRes.data ?? []) progMap.set(p.assignment_id, p.status);
    const classMap = new Map<string, string>();
    for (const c of cRes.data ?? []) classMap.set(c.id, c.name);
    return (aRes.data ?? []).map((a) => ({
      id: a.id,
      classId: a.class_id,
      tmdbId: a.tmdb_id,
      mediaType: a.media_type as "movie" | "tv",
      title: a.title,
      poster: a.poster,
      subject: a.subject,
      note: a.note,
      sceneStart: a.scene_start,
      sceneEnd: a.scene_end,
      episodeInfo: a.episode_info,
      dueDate: a.due_date,
      createdAt: a.created_at,
      progressStatus: progMap.get(a.id) ?? null,
      className: classMap.get(a.class_id),
    }));
  });
