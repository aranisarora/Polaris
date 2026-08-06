import { isSafePostingUrl } from "@/lib/jobs/posting";
import { isTier } from "./helpers";
import type { ClassifiedJob, DreamAssessment, JobPosting } from "@/lib/types";

/**
 * Reading a `public.job_assessments` row back into the bearing's own types.
 *
 * Server-side only in practice: this reaches for the zod posting contract in
 * `lib/jobs/posting.ts` so a stored row is held to exactly the same standard
 * as a freshly searched one. Anything a client component needs lives in
 * `./helpers`, which stays free of that dependency — import from there, not
 * from here, or zod rides along into the browser bundle.
 */

/** Re-exported for `POST /api/jobs/classify`, which recomputes the winners. */
export { recommendedPostingIds } from "./helpers";

/** Raw shape of a public.job_assessments row (supabase/schema.sql). */
export interface AssessmentRow {
  id: string;
  posting: unknown;
  posting_id: string;
  tier: string;
  reasoning: string | null;
  have: unknown;
  missing: unknown;
  match_score: number | string;
  is_dream: boolean;
  recommended: boolean;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(100, Math.max(0, n)));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .map((v) => v.trim());
}

/**
 * Loose structural check for a JobPosting stored as jsonb.
 *
 * `url` is held to the same http(s) authority every other hop uses
 * (`isSafePostingUrl`, lib/jobs/posting.ts) rather than a bare string check:
 * a row read back out of `job_assessments` is rendered straight into
 * `<a href>` by JobRow, so a `javascript:` url written by an older or looser
 * write path must not survive the read.
 */
export function isJobPosting(value: unknown): value is JobPosting {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.title === "string" &&
    typeof p.company === "string" &&
    isSafePostingUrl(p.url)
  );
}

export function rowToClassifiedJob(row: AssessmentRow): ClassifiedJob | null {
  if (row.is_dream || !isTier(row.tier) || !isJobPosting(row.posting)) return null;
  return {
    id: row.id,
    posting: row.posting,
    tier: row.tier,
    reasoning: row.reasoning ?? "",
    have: toStringArray(row.have),
    missing: toStringArray(row.missing),
    matchScore: clampScore(Number(row.match_score)),
    isDream: false,
    recommended: Boolean(row.recommended),
  };
}

export function rowToDreamAssessment(
  row: AssessmentRow,
  fallbackDreamText: string,
): DreamAssessment | null {
  if (!row.is_dream || !isTier(row.tier)) return null;
  const posting = (
    row.posting && typeof row.posting === "object" ? row.posting : {}
  ) as Record<string, unknown>;
  return {
    tier: row.tier,
    reasoning: row.reasoning ?? "",
    have: toStringArray(row.have),
    missing: toStringArray(row.missing),
    matchScore: clampScore(Number(row.match_score)),
    dreamText:
      typeof posting.dreamText === "string" && posting.dreamText.trim()
        ? posting.dreamText
        : fallbackDreamText,
    quoted: typeof posting.quoted === "string" ? posting.quoted : "",
  };
}
