import type {
  ClassifiedJob,
  DreamAssessment,
  JobPosting,
  JobSalary,
  ProviderStatus,
  Tier,
} from "@/lib/types";

/**
 * Pure helpers shared by the bearing page (server), the jobs/classify route
 * and the client orchestration. No React, no secrets, no side effects.
 */

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

const ALL_TIERS: readonly Tier[] = ["ready", "attainable", "stretch"];

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (ALL_TIERS as readonly string[]).includes(value);
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

/** Loose structural check for a JobPosting stored as jsonb. */
export function isJobPosting(value: unknown): value is JobPosting {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.title === "string" &&
    typeof p.company === "string" &&
    typeof p.url === "string"
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

/**
 * A recommended target has to be a real match, not merely the least bad row
 * in a weak pool — below this score the tier simply carries no recommendation.
 */
export const MIN_RECOMMENDED_SCORE = 40;

/**
 * ONE recommended target per tier: highest matchScore, ties broken by
 * posting id so server and client always agree. A tier whose best row scores
 * under MIN_RECOMMENDED_SCORE gets no recommended target at all.
 */
export function recommendedPostingIds(
  items: Array<{ postingId: string; tier: Tier; matchScore: number }>,
): Set<string> {
  const winners = new Set<string>();
  for (const tier of ALL_TIERS) {
    const best = items
      .filter((i) => i.tier === tier && i.matchScore >= MIN_RECOMMENDED_SCORE)
      .sort(
        (a, b) => b.matchScore - a.matchScore || a.postingId.localeCompare(b.postingId),
      )[0];
    if (best) winners.add(best.postingId);
  }
  return winners;
}

export function applyRecommended(jobs: ClassifiedJob[]): ClassifiedJob[] {
  const winners = recommendedPostingIds(
    jobs.map((j) => ({ postingId: j.posting.id, tier: j.tier, matchScore: j.matchScore })),
  );
  return jobs.map((j) => ({ ...j, recommended: winners.has(j.posting.id) }));
}

/** Replace-by-posting-id merge, keeping first-seen order. */
export function mergeJobs(
  previous: ClassifiedJob[],
  incoming: ClassifiedJob[],
): ClassifiedJob[] {
  const byPosting = new Map(previous.map((j) => [j.posting.id, j]));
  for (const job of incoming) byPosting.set(job.posting.id, job);
  return Array.from(byPosting.values());
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ------------------------------------------------------------- formatting

const CURRENCY_SYMBOL: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };

/** Mono-readout salary line, or null when the posting carries none. */
export function formatSalary(salary?: JobSalary): string | null {
  if (!salary) return null;
  const symbol = salary.currency
    ? (CURRENCY_SYMBOL[salary.currency.toUpperCase()] ?? `${salary.currency} `)
    : "";
  const fmt = (n: number) => `${symbol}${Math.round(n).toLocaleString("en")}`;
  const { min, max } = salary;
  if (min !== undefined && max !== undefined) {
    return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
  }
  if (min !== undefined) return `From ${fmt(min)}`;
  if (max !== undefined) return `Up to ${fmt(max)}`;
  const text = salary.text?.trim();
  if (!text) return null;
  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
}

export function providerLabel(name: ProviderStatus["name"]): string {
  return name === "jooble" ? "Jooble" : "Adzuna";
}

/** Env key NAMES (never values) still missing, from provider statuses. */
export function missingKeyNames(providers: ProviderStatus[]): string[] {
  const keys: string[] = [];
  for (const p of providers) {
    if (p.configured) continue;
    if (p.name === "jooble") keys.push("JOOBLE_API_KEY");
    if (p.name === "adzuna") keys.push("ADZUNA_APP_ID", "ADZUNA_APP_KEY");
  }
  return keys;
}

// ------------------------------------------------------------------- copy

/** Short tab labels; rows keep TIER_LABEL from lib/types. */
export const TIER_SHORT: Record<Tier, string> = {
  ready: "Ready",
  attainable: "Attainable",
  stretch: "Stretch",
};

/** One line of trajectory framing above each tier group (docs/SPEC.md). */
export const TIER_FRAMING: Record<Tier, string> = {
  ready:
    "Already within reach. Jobs like these build the experience your dream requires.",
  attainable:
    "A short push away — one or two gaps each, the kind focused work closes in months.",
  stretch:
    "Not yet, honestly. These sit near your dream's altitude — the tiers below build toward them.",
};

export const TIER_EMPTY: Record<Tier, string> = {
  ready:
    "Nothing sits at ready in this bearing. Attainable holds your nearest waypoints — a short push away.",
  attainable:
    "No attainable postings surfaced this time. Ready shows what's open now; a later bearing may find more.",
  stretch:
    "No stretch postings surfaced. Your dream above still carries the honest reading.",
};

/** The tier each TIER_EMPTY line sends the user to (null = points at nothing). */
const TIER_EMPTY_POINTS_AT: Record<Tier, Tier | null> = {
  ready: "attainable",
  attainable: "ready",
  stretch: null,
};

/**
 * Empty-tier copy that can't lie: the stock line only runs when the tier it
 * points at actually holds postings. Otherwise it names the tier that does,
 * or says plainly that this bearing came back thin.
 */
export function tierEmptyLine(tier: Tier, counts: Record<Tier, number>): string {
  const pointsAt = TIER_EMPTY_POINTS_AT[tier];
  if (pointsAt === null || counts[pointsAt] > 0) return TIER_EMPTY[tier];

  const elsewhere = ALL_TIERS.find((t) => t !== tier && counts[t] > 0);
  if (elsewhere) {
    return `Nothing sits at ${TIER_SHORT[tier].toLowerCase()} in this bearing. ${TIER_SHORT[elsewhere]} holds the postings that came back.`;
  }
  return "Nothing at this tier in this bearing — retake the bearing or broaden your course.";
}
