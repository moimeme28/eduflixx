import { describe, expect, it } from "vitest";
import { aggregateClassTotals } from "./classroom-progress";

/**
 * End-to-end check of the completion flow as the teacher dashboard sees it:
 * a student flips an assignment to "completed" and the teacher totals must
 * reflect it on the very next read (no caching / no extra write required).
 */

const CLASS = "class-1";

function teacherTotals(progress: { assignment_id: string; student_id: string; status: string }[]) {
  return aggregateClassTotals({
    classIds: [CLASS],
    members: [{ class_id: CLASS }, { class_id: CLASS }],
    assignments: [
      { id: "a1", class_id: CLASS },
      { id: "a2", class_id: CLASS },
    ],
    progress,
  })[CLASS];
}

describe("teacher dashboard completion totals", () => {
  it("starts at 0 of the expected total", () => {
    const t = teacherTotals([]);
    expect(t.memberCount).toBe(2);
    expect(t.assignmentCount).toBe(2);
    expect(t.completedCount).toBe(0);
    expect(t.expectedCompletionCount).toBe(4);
  });

  it("reflects a student completion immediately", () => {
    const progress = [{ assignment_id: "a1", student_id: "s1", status: "in_progress" }];
    expect(teacherTotals(progress).completedCount).toBe(0);

    // student switches the dropdown to Completed
    progress[0].status = "completed";
    expect(teacherTotals(progress).completedCount).toBe(1);
  });

  it("reverts when a student un-completes an assignment", () => {
    const progress = [{ assignment_id: "a1", student_id: "s1", status: "completed" }];
    expect(teacherTotals(progress).completedCount).toBe(1);
    progress[0].status = "not_started";
    expect(teacherTotals(progress).completedCount).toBe(0);
  });

  it("counts each student separately and never double-counts", () => {
    const t = teacherTotals([
      { assignment_id: "a1", student_id: "s1", status: "completed" },
      { assignment_id: "a1", student_id: "s2", status: "completed" },
      { assignment_id: "a1", student_id: "s2", status: "completed" },
      { assignment_id: "a2", student_id: "s1", status: "completed" },
    ]);
    expect(t.completedCount).toBe(3);
    expect(t.expectedCompletionCount).toBe(4);
  });

  it("ignores progress rows from assignments outside the class", () => {
    const t = teacherTotals([{ assignment_id: "other", student_id: "s1", status: "completed" }]);
    expect(t.completedCount).toBe(0);
  });
});
