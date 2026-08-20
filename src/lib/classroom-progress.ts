// Pure aggregation helpers shared by the teacher dashboard server functions.
// Kept free of any Supabase/runtime dependency so they can be verified directly.

export interface ClassTotals {
  memberCount: number;
  assignmentCount: number;
  completedCount: number;
  expectedCompletionCount: number;
}

export interface AggregateInput {
  classIds: string[];
  members: { class_id: string }[];
  assignments: { id: string; class_id: string }[];
  /** Progress rows for the given assignments (any status). */
  progress: { assignment_id: string; student_id: string; status: string }[];
}

export function aggregateClassTotals(input: AggregateInput): Record<string, ClassTotals> {
  const totals: Record<string, ClassTotals> = {};
  for (const id of input.classIds) {
    totals[id] = { memberCount: 0, assignmentCount: 0, completedCount: 0, expectedCompletionCount: 0 };
  }

  for (const m of input.members) {
    if (totals[m.class_id]) totals[m.class_id].memberCount += 1;
  }

  const assignmentClass = new Map<string, string>();
  for (const a of input.assignments) {
    assignmentClass.set(a.id, a.class_id);
    if (totals[a.class_id]) totals[a.class_id].assignmentCount += 1;
  }

  // Dedupe on (assignment, student) so a student can never be counted twice.
  const seen = new Set<string>();
  for (const p of input.progress) {
    if (p.status !== "completed") continue;
    const key = `${p.assignment_id}:${p.student_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const classId = assignmentClass.get(p.assignment_id);
    if (classId && totals[classId]) totals[classId].completedCount += 1;
  }

  for (const id of Object.keys(totals)) {
    totals[id].expectedCompletionCount = totals[id].memberCount * totals[id].assignmentCount;
  }

  return totals;
}
