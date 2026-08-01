import type { BranchCode, TargetSector } from "../data/types";

/**
 * The seven fields the ledger runs on, and the semester arithmetic underneath
 * them.
 *
 * `docs/product.md` §10.1: the eligibility ledger is 100% arithmetic on seven
 * fields, none of which is the CV. That is what lets it render in 45 seconds
 * with no account and no upload, and it is the most valuable property in the
 * funnel — so nothing in this module may acquire a dependency on anything else.
 */

export type StudentRecord = {
  /** Undefined for a college outside the mapped universities. */
  collegeSlug?: string;
  universityCode: string;
  branch: BranchCode;
  gradYear: number;
  cgpa: number;
  activeBacklogs: number;
  tenthPct: number;
  twelfthPct: number;
  /** Education gap in years, where the student has told us. */
  gapYears?: number;
  target: TargetSector;
  /** Set by a student at an autonomous or unmapped college. */
  manualExamWindow?: { startsOn: string; endsOn: string };
};

/** A four-year B.E. / B.Tech. */
export const SEMESTERS_IN_DEGREE = 8;

/**
 * The semester whose aggregate campus drives actually read.
 *
 * Placement drives for a batch open in the odd semester of the final year, by
 * which point the published aggregate runs to the end of the sixth semester.
 * Everything after that is too late to affect eligibility — which is precisely
 * why `docs/product.md` §3 builds the product for third-years and not for
 * final-years, and why this constant is load-bearing rather than cosmetic.
 */
export const CGPA_CHECKPOINT_SEMESTER = 6;

/**
 * A semester ends in the January or the July of a given calendar year.
 * Semester 1 of a batch graduating in `gradYear` begins in the September of
 * `gradYear - 4`.
 */
export function semesterEndsOn(gradYear: number, semester: number): Date {
  const startYear = gradYear - SEMESTERS_IN_DEGREE / 2;
  const yearIndex = Math.ceil(semester / 2);
  const isOdd = semester % 2 === 1;
  // Odd semesters run Sept–Jan and end in the following calendar year;
  // even semesters run Feb–July and end in the same one.
  return isOdd
    ? new Date(Date.UTC(startYear + yearIndex, 0, 31))
    : new Date(Date.UTC(startYear + yearIndex, 6, 31));
}

export function completedSemesters(gradYear: number, asOf: Date): number {
  let completed = 0;
  for (let s = 1; s <= SEMESTERS_IN_DEGREE; s++) {
    if (semesterEndsOn(gradYear, s).getTime() <= asOf.getTime()) completed = s;
  }
  return completed;
}

/** 1 = first year. Clamped to the degree, so a graduate reads as year 4. */
export function yearOfStudy(gradYear: number, asOf: Date): number {
  const done = completedSemesters(gradYear, asOf);
  return Math.min(4, Math.floor(done / 2) + 1);
}

export type CgpaTrajectory =
  | { kind: "already-met" }
  | {
      kind: "reachable";
      /** Average needed across the semesters that still count. */
      requiredAverage: number;
      semestersRemaining: number;
      checkpointSemester: number;
    }
  | {
      kind: "unreachable";
      /** What it would take, which is above the maximum grade. */
      requiredAverage: number;
      semestersRemaining: number;
      checkpointSemester: number;
    }
  | {
      kind: "locked";
      /** No semesters left before the aggregate is read. */
      checkpointSemester: number;
    };

/**
 * What it would take to reach `target` CGPA by the checkpoint.
 *
 * Deliberately arithmetic and deliberately unflattering: if the required
 * average exceeds 10 the answer is that it cannot be done, and the ledger says
 * so rather than rounding it into encouragement.
 */
export function cgpaTrajectory(
  current: number,
  target: number,
  gradYear: number,
  asOf: Date,
  checkpoint: number = CGPA_CHECKPOINT_SEMESTER,
): CgpaTrajectory {
  if (current >= target) return { kind: "already-met" };

  const done = Math.min(completedSemesters(gradYear, asOf), checkpoint);
  const remaining = checkpoint - done;

  if (remaining <= 0) return { kind: "locked", checkpointSemester: checkpoint };

  const requiredAverage = (target * checkpoint - current * done) / remaining;

  return {
    kind: requiredAverage > 10 ? "unreachable" : "reachable",
    requiredAverage,
    semestersRemaining: remaining,
    checkpointSemester: checkpoint,
  };
}

/** Percentage gates convert at the VTU convention of roughly 10 × CGPA. */
export function cgpaToPercent(cgpa: number): number {
  return cgpa * 10;
}

export function percentToCgpa(pct: number): number {
  return pct / 10;
}

export function isGraduated(gradYear: number, asOf: Date): boolean {
  return completedSemesters(gradYear, asOf) >= SEMESTERS_IN_DEGREE;
}

/** Validation shared by the form and the server action. */
export type RecordIssue = { field: keyof StudentRecord; message: string };

export function validateRecord(r: Partial<StudentRecord>): RecordIssue[] {
  const issues: RecordIssue[] = [];

  if (!r.universityCode) {
    issues.push({ field: "universityCode", message: "Pick your university." });
  }
  if (!r.branch) {
    issues.push({ field: "branch", message: "Pick your branch." });
  }
  if (!r.gradYear) {
    issues.push({ field: "gradYear", message: "Pick your graduation year." });
  }
  if (r.cgpa === undefined || Number.isNaN(r.cgpa)) {
    issues.push({ field: "cgpa", message: "Enter your CGPA." });
  } else if (r.cgpa < 0 || r.cgpa > 10) {
    issues.push({ field: "cgpa", message: "CGPA runs from 0 to 10." });
  }
  if (r.activeBacklogs === undefined || Number.isNaN(r.activeBacklogs)) {
    issues.push({ field: "activeBacklogs", message: "Enter your active backlogs. Zero is a valid answer." });
  } else if (r.activeBacklogs < 0 || r.activeBacklogs > 60) {
    issues.push({ field: "activeBacklogs", message: "That does not look right." });
  }
  for (const field of ["tenthPct", "twelfthPct"] as const) {
    const value = r[field];
    const label = field === "tenthPct" ? "10th" : "12th";
    if (value === undefined || Number.isNaN(value)) {
      issues.push({ field, message: `Enter your ${label} percentage.` });
    } else if (value < 0 || value > 100) {
      issues.push({ field, message: `${label} runs from 0 to 100.` });
    }
  }
  if (!r.target) {
    issues.push({ field: "target", message: "Pick a rough direction." });
  }

  return issues;
}
