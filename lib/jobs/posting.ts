import { z } from "zod";
import type { JobPosting } from "@/lib/types";

/**
 * The ONE definition of "a posting Polaris will handle".
 *
 * Both halves of the bearing depend on this agreeing with itself:
 * `lib/jobs/search.ts` validates against it before a posting is cached or
 * returned to the client, and `POST /api/jobs/classify` validates against it
 * again when it rehydrates that posting out of `job_search_cache`. Same
 * schema on both hops means a posting the user can see is a posting classify
 * will accept — the classifier can stay fail-closed without ever stranding
 * someone on a posting it refuses.
 *
 * Deliberately NOT `server-only`, so the safe-URL rule below can be shared
 * rather than re-typed. It is still a server-side import in practice: the zod
 * schemas here are ~300KB of client bundle that Turbopack will not shake out,
 * so a client component must never reach for this module. `<a
 * href={posting.url}>` is protected instead at the boundary that produces the
 * posting — `isJobPosting` in `components/bearing/assessments.ts` applies
 * `isSafePostingUrl` to every stored row before it can reach a render.
 */

const SAFE_URL_SCHEMES = new Set(["http:", "https:"]);

/**
 * http(s) only. A posting URL is rendered as an anchor href and persisted to
 * three tables, so `javascript:`, `data:`, `vbscript:` and friends are
 * rejected at every hop rather than trusted from the provider payload.
 * The URL parser normalizes case and strips leading control characters, so
 * `\tjAvAsCrIpT:…` is caught too.
 */
export function isSafePostingUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return SAFE_URL_SCHEMES.has(parsed.protocol);
}

const salarySchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().optional(),
    text: z.string().optional(),
  })
  .nullish()
  .transform((v) => v ?? undefined);

/** Canonical JobPosting shape. Unknown keys are stripped, not preserved. */
export const postingSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["jooble", "adzuna"]),
  sourceId: z.string(),
  title: z.string().min(1),
  company: z.string(),
  location: z.string(),
  country: z.enum(["us", "gb"]),
  description: z.string(),
  salary: salarySchema,
  url: z.string().refine(isSafePostingUrl, "Only http(s) posting links."),
  postedAt: z.string().optional(),
});

/** One posting, or null when it doesn't meet the contract. */
export function parsePosting(value: unknown): JobPosting | null {
  const parsed = postingSchema.safeParse(value);
  return parsed.success ? (parsed.data as JobPosting) : null;
}

/**
 * Every posting in `value` that meets the contract, in order. Anything that
 * doesn't is dropped silently — a posting classify would refuse must never
 * reach the bearing in the first place.
 */
export function parsePostings(value: unknown): JobPosting[] {
  if (!Array.isArray(value)) return [];
  const out: JobPosting[] = [];
  for (const item of value) {
    const posting = parsePosting(item);
    if (posting) out.push(posting);
  }
  return out;
}
