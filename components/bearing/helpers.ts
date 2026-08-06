import type { ClassifiedJob, JobSalary, ProviderStatus, Tier } from "@/lib/types";

/**
 * Pure bearing helpers — no React, no zod, no server imports, no secrets.
 *
 * This is the half of the bearing's logic that client components import, so
 * it must stay free of anything that would drag a server dependency into the
 * browser bundle. Row parsing (`./assessments`) reaches for the zod posting
 * contract in `lib/jobs/posting.ts` and therefore stays server-side; keep the
 * two apart, and keep new client-facing helpers here.
 */

export const ALL_TIERS: readonly Tier[] = ["ready", "attainable", "stretch"];

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (ALL_TIERS as readonly string[]).includes(value);
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

// --------------------------------------------------------------- recovery

/** What a failure's own copy actually asks the user to do next. */
export type ClassifyRecovery = "retry" | "reload";

/**
 * `POST /api/jobs/classify` answers a posting id outside the user's current
 * search with a 400 that tells them to reload — retrying the same ids against
 * the same server would fail identically, so the button must name the reload
 * rather than another read. The response carries no machine-readable code, so
 * this reads the route's own sentence; keep the two in step if that copy moves.
 */
export function classifyRecovery(message: string | null | undefined): ClassifyRecovery {
  return typeof message === "string" && /reload the page/i.test(message)
    ? "reload"
    : "retry";
}

/** A reason read into a sentence — never two clauses run together. */
export function asSentence(text: string): string {
  const clean = text.trim();
  if (clean === "") return clean;
  return /[.!?…]$/.test(clean) ? clean : `${clean}.`;
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

/** Tab labels. Kept identical to TIER_LABEL in lib/types — same group, same word. */
export const TIER_SHORT: Record<Tier, string> = {
  ready: "Ready now",
  attainable: "Almost there",
  stretch: "Not yet",
};

/** One line of trajectory framing above each tier group (docs/SPEC.md). */
export const TIER_FRAMING: Record<Tier, string> = {
  ready:
    "Already within reach. Jobs like these build the experience your dream requires.",
  attainable:
    "A short push away — one or two gaps each, the kind focused work closes in months.",
  stretch:
    "Not yet, honestly. These sit near your dream's altitude — the groups above build toward them.",
};

export const TIER_EMPTY: Record<Tier, string> = {
  ready:
    "Nothing is open to you right now. “Almost there” holds your closest jobs — a short push away.",
  attainable:
    "Nothing landed in “Almost there” this time. “Ready now” shows what's open today; searching again may find more.",
  stretch:
    "Nothing landed in “Not yet”. Your dream above still carries the honest reading.",
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
    // the labels are phrases now ("Ready now", "Almost there"), so quote them
    // rather than dropping them into a sentence as if they were nouns
    return `Nothing in “${TIER_SHORT[tier]}” this time — “${TIER_SHORT[elsewhere]}” holds the postings that came back.`;
  }
  return "Nothing in this group this time — search again, or edit your dream to widen it.";
}
