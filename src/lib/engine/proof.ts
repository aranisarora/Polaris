import { COLLEGE_BY_SLUG } from "../data/colleges";
import {
  INTERVIEW_RECORDS,
  PROFILED_RECORD_COUNT,
  TOTAL_RECORD_COUNT,
  bandDistance,
  cgpaBandOf,
} from "../data/corpus";
import type { Company, InterviewRecord } from "../data/types";
import { CIRCUIT_BRANCHES } from "../data/types";
import type { Ledger } from "./eligibility";
import type { StudentRecord } from "./record";

/**
 * The proof component — `docs/product.md` §9.2.1.
 *
 * Every other surface tells the student what is wrong. This is the one that
 * says the outcome is achievable, and §9.2.1 is explicit that the ledger should
 * not ship without it: a ledger that only closes doors produces despair and
 * churn rather than action.
 *
 * ## Why this returns "none" honestly
 *
 * The match has to be real. A record from two tiers up, or from a student with
 * a full point more CGPA, is worse than no record — the reader can tell, and
 * being shown an irrelevant success story is its own small insult. So the
 * matcher grades the match and the UI renders three different screens.
 *
 * Right now most of the public corpus carries no profile at all (see
 * `data/corpus.ts`), so "none" is the common answer. That is a data problem
 * with a known fix, not a reason to loosen the matching.
 */

export type ProofMatch =
  | {
      kind: "exact";
      record: InterviewRecord;
      company: Company;
      /** Which keys matched, for the "matched on…" eyebrow. */
      matchedOn: string[];
      alternatives: number;
    }
  | {
      kind: "near";
      record: InterviewRecord;
      company: Company;
      matchedOn: string[];
      differsOn: string[];
      alternatives: number;
    }
  | {
      kind: "process-only";
      /** No profiled record, but we do hold this company's real process. */
      record: InterviewRecord;
      company: Company;
    }
  | {
      kind: "none";
      /** Stated plainly so the empty state is informative rather than apologetic. */
      totalRecords: number;
      profiledRecords: number;
    };

function branchFamily(b: string): "circuit" | "other" {
  return CIRCUIT_BRANCHES.includes(b as never) ? "circuit" : "other";
}

function tierOf(record: StudentRecord): 1 | 2 | 3 | undefined {
  if (!record.collegeSlug) return undefined;
  return COLLEGE_BY_SLUG.get(record.collegeSlug)?.tier;
}

/**
 * Score a profiled record against the student. Lower is closer.
 * Returns `null` when the record is disqualified outright.
 */
function score(
  rec: InterviewRecord,
  record: StudentRecord,
  studentTier: 1 | 2 | 3 | undefined,
): { distance: number; matchedOn: string[]; differsOn: string[] } | null {
  if (rec.outcome !== "selected") return null;

  const matchedOn: string[] = [];
  const differsOn: string[] = [];
  let distance = 0;

  // Tier. Being shown someone from a materially stronger college is the
  // failure mode this whole function exists to prevent.
  if (rec.collegeTier && studentTier) {
    const gap = Math.abs(rec.collegeTier - studentTier);
    if (gap === 0) matchedOn.push("tier");
    else {
      differsOn.push("college tier");
      distance += gap * 3;
    }
    if (gap > 1) return null;
  }

  // CGPA band. A record from a full band above is a near match at best.
  if (rec.cgpaBand) {
    const gap = bandDistance(rec.cgpaBand, cgpaBandOf(record.cgpa));
    if (gap === 0) matchedOn.push("CGPA band");
    else {
      differsOn.push("CGPA band");
      distance += gap * 2;
    }
    if (gap > 2) return null;
  }

  // Branch, then branch family.
  if (rec.branch) {
    if (rec.branch === record.branch) matchedOn.push("branch");
    else if (branchFamily(rec.branch) === branchFamily(record.branch)) {
      matchedOn.push("branch family");
      distance += 1;
    } else {
      differsOn.push("branch");
      distance += 3;
    }
  }

  if (rec.backlogNote) matchedOn.push("backlog history");

  return { distance, matchedOn, differsOn };
}

/**
 * Find the best proof record for this student, preferring companies that are
 * actually open or within reach — a success story at a company they can never
 * apply to is not proof of anything.
 */
export function matchProof(
  record: StudentRecord,
  ledger: Ledger,
): ProofMatch {
  const studentTier = tierOf(record);

  const relevantSlugs = new Set(
    [...ledger.open, ...ledger.reach].map((v) => v.company.slug),
  );
  const companyOf = (slug: string) =>
    ledger.verdicts.find((v) => v.company.slug === slug)?.company;

  const scored = INTERVIEW_RECORDS.filter((r) => r.hasProfile)
    .map((r) => {
      const s = score(r, record, studentTier);
      if (!s) return null;
      const company = companyOf(r.companySlug);
      if (!company) return null;
      // Prefer reachable companies without excluding the rest outright.
      const relevance = relevantSlugs.has(r.companySlug) ? 0 : 5;
      return { rec: r, company, ...s, total: s.distance + relevance };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.total - b.total);

  const best = scored[0];

  if (best && best.distance === 0) {
    return {
      kind: "exact",
      record: best.rec,
      company: best.company,
      matchedOn: best.matchedOn,
      alternatives: scored.length,
    };
  }

  if (best && best.distance <= 4) {
    return {
      kind: "near",
      record: best.rec,
      company: best.company,
      matchedOn: best.matchedOn,
      differsOn: best.differsOn,
      alternatives: scored.length,
    };
  }

  // No profiled match. We may still hold this company's real round-by-round,
  // which is half of what §9.2.1 asks for and is worth showing on its own.
  const processCandidates = INTERVIEW_RECORDS.filter(
    (r) => relevantSlugs.has(r.companySlug) && r.outcome === "selected",
  );
  if (processCandidates.length) {
    const rec = processCandidates[0];
    const company = companyOf(rec.companySlug);
    if (company) return { kind: "process-only", record: rec, company };
  }

  return {
    kind: "none",
    totalRecords: TOTAL_RECORD_COUNT,
    profiledRecords: PROFILED_RECORD_COUNT,
  };
}
