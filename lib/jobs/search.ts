import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  JobPosting,
  JobQuery,
  JobSearchResult,
  ProviderStatus,
} from "@/lib/types";
import { ProviderError, type JobProvider } from "./provider";
import { parsePostings } from "./posting";
import { jooble } from "./jooble";
import { adzuna } from "./adzuna";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h per PRODUCT.md
const MAX_POSTINGS = 24;
/** One retry before a cache write is called a failure. */
const CACHE_WRITE_RETRY_DELAY_MS = 250;

/**
 * The search found postings but couldn't record them.
 *
 * `POST /api/jobs/classify` is fail-closed: it will only classify posting ids
 * it can find in this user's own `job_search_cache` rows. So an unrecorded
 * search is a search whose postings are unclassifiable — showing them would
 * strand the user on 24 rows that every classify batch rejects, with no way
 * forward. A clean, retryable failure is the better outcome, and the caller
 * gets it as a throw instead of a poisoned result.
 */
export class JobSearchPersistError extends Error {
  constructor(cause?: unknown) {
    super(
      "The bearing couldn't be recorded, so it can't be read. Try again.",
      cause === undefined ? undefined : { cause },
    );
    this.name = "JobSearchPersistError";
  }
}

/** Registration order matters: on duplicates the Jooble record wins. */
const PROVIDERS: readonly JobProvider[] = [jooble, adzuna];

// ------------------------------------------------------------------ hashing

interface NormalizedQuery {
  keywords: string;
  location: string;
  country: JobQuery["country"];
}

function normalizeQuery(q: JobQuery): NormalizedQuery {
  return {
    keywords: q.keywords.trim().toLowerCase().replace(/\s+/g, " "),
    location: (q.location ?? "").trim().toLowerCase().replace(/\s+/g, " "),
    country: q.country,
  };
}

function hashQuery(normalized: NormalizedQuery): string {
  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

// ------------------------------------------------------------ merge/dedupe

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** title + company + city (first location segment), punctuation-free. */
function dedupeKey(p: JobPosting): string {
  const city = p.location.split(",")[0] ?? "";
  return `${normalizeToken(p.title)}|${normalizeToken(p.company)}|${normalizeToken(city)}`;
}

/** Merge Adzuna's structured salary numbers into a kept Jooble record. */
function mergeSalary(kept: JobPosting, other: JobPosting): JobPosting {
  if (!other.salary) return kept;
  const { min, max, currency } = other.salary;
  if (min === undefined && max === undefined) return kept;
  return {
    ...kept,
    salary: {
      ...kept.salary,
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(currency !== undefined ? { currency } : {}),
    },
  };
}

/**
 * Round-robin interleave across providers (keeps each provider's relevance
 * order, balances the capped list), dedupe by title+company+city. On a
 * duplicate pair the Jooble record is kept but Adzuna's structured salary
 * is merged into it. Caps at MAX_POSTINGS.
 */
function mergePostings(lists: JobPosting[][]): JobPosting[] {
  const out: JobPosting[] = [];
  const indexByKey = new Map<string, number>();
  const longest = Math.max(0, ...lists.map((l) => l.length));

  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const posting = list[i];
      if (!posting) continue;

      const key = dedupeKey(posting);
      const existingIndex = indexByKey.get(key);

      if (existingIndex === undefined) {
        indexByKey.set(key, out.length);
        out.push(posting);
        continue;
      }

      const existing = out[existingIndex];
      if (existing.source === "jooble" && posting.source === "adzuna") {
        out[existingIndex] = mergeSalary(existing, posting);
      } else if (existing.source === "adzuna" && posting.source === "jooble") {
        // Keep the Jooble record (in the earlier slot), merge Adzuna salary.
        out[existingIndex] = mergeSalary(posting, existing);
      }
      // Same-source duplicate: keep the earlier (more relevant) one.
    }
  }

  return out.slice(0, MAX_POSTINGS);
}

// ------------------------------------------------------------------- cache

interface CachedPayload {
  postings: JobPosting[];
  providers: ProviderStatus[];
  fetchedAt: string;
}

function isCachedPayload(value: unknown): value is CachedPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.postings) && Array.isArray(v.providers);
}

interface CacheRow {
  user_id: string;
  query_hash: string;
  query: NormalizedQuery;
  results: CachedPayload;
  fetched_at: string;
}

/**
 * Write the cache row. Returns null on success, or a log-safe reason.
 * PostgREST reports failures on the resolved `{ error }` — it does not throw —
 * so both shapes have to be read or the write is silent.
 */
async function writeCacheRow(
  supabase: SupabaseClient,
  row: CacheRow,
): Promise<string | null> {
  try {
    const { error } = await supabase
      .from("job_search_cache")
      .upsert(row, { onConflict: "user_id,query_hash" });
    return error ? (error.message || error.code || "unknown error") : null;
  } catch (err) {
    return err instanceof Error ? err.message : "unknown error";
  }
}

// ------------------------------------------------------------------ search

/**
 * The one entry point feature code should use for job search.
 *
 * - Serves from `job_search_cache` when a row for this user+query is
 *   younger than 24h.
 * - Otherwise queries every CONFIGURED provider in parallel
 *   (Promise.allSettled — one failing provider never sinks the other),
 *   merges + dedupes, caps at 24, and persists to the cache.
 * - Zero configured providers is a NORMAL state: returns empty postings
 *   with `configured: false` statuses so the UI can render the designed
 *   "instruments not configured" state. Never throws for provider issues.
 *
 * THE GUARANTEE: every posting this returns is a posting
 * `POST /api/jobs/classify` will accept. That holds because of two rules
 * this function keeps, and nothing else in the codebase may weaken:
 *
 *  1. Every posting returned has passed `postingSchema` — the same schema
 *     classify re-validates the cached copy against. A posting that can't
 *     round-trip is dropped here, not refused there.
 *  2. Persisting is load-bearing, not best-effort. Classify is fail-closed
 *     (it trusts only ids present in this user's cache rows), so returning
 *     postings that were never recorded would hand the user a bearing where
 *     every batch 400s and "Search again" fails identically. When there
 *     are postings to record and the write won't take — after one retry —
 *     this throws `JobSearchPersistError` instead. The caller's error path
 *     is a dead end the user can retry out of; the alternative is one they
 *     can't.
 *
 * @throws {JobSearchPersistError} postings were found but couldn't be cached.
 */
export async function searchJobs(
  supabase: SupabaseClient,
  userId: string,
  q: JobQuery,
): Promise<JobSearchResult> {
  const normalized = normalizeQuery(q);
  const queryHash = hashQuery(normalized);

  // 1. Cache lookup (a broken cache row degrades to a fresh fetch).
  try {
    const { data: row } = await supabase
      .from("job_search_cache")
      .select("results, fetched_at")
      .eq("user_id", userId)
      .eq("query_hash", queryHash)
      .maybeSingle();

    if (row) {
      const age = Date.now() - new Date(row.fetched_at as string).getTime();
      if (Number.isFinite(age) && age >= 0 && age < CACHE_TTL_MS) {
        const payload: unknown = row.results;
        if (isCachedPayload(payload)) {
          // Re-validate on the way out: classify re-parses these same rows
          // with the same schema, so anything that wouldn't survive that
          // parse is dropped here rather than shown and then refused.
          const postings = parsePostings(payload.postings);
          // A row that held postings but yields none is corrupt — fall
          // through to a live search instead of serving an empty bearing.
          if (postings.length > 0 || payload.postings.length === 0) {
            return {
              postings,
              providers: payload.providers,
              cached: true,
              fetchedAt:
                typeof payload.fetchedAt === "string"
                  ? payload.fetchedAt
                  : (row.fetched_at as string),
            };
          }
        }
      }
    }
  } catch {
    // Cache read failure — fall through to a live search.
  }

  const fetchedAt = new Date().toISOString();

  // 2. Zero configured providers → designed "sky is quiet" state, no crash.
  const configured = PROVIDERS.filter((p) => p.configured());
  if (configured.length === 0) {
    return {
      postings: [],
      providers: PROVIDERS.map((p) => ({
        name: p.name,
        configured: false,
        ok: false,
        count: 0,
      })),
      cached: false,
      fetchedAt,
    };
  }

  // 3. Query configured providers in parallel; a failure yields a
  //    ProviderStatus{ok:false} without sinking the healthy provider.
  const settled = await Promise.allSettled(configured.map((p) => p.search(q)));

  const listsByName = new Map<string, JobPosting[]>();
  const statusByName = new Map<string, ProviderStatus>();

  configured.forEach((provider, i) => {
    const result = settled[i];
    if (result.status === "fulfilled") {
      listsByName.set(provider.name, result.value);
      statusByName.set(provider.name, {
        name: provider.name,
        configured: true,
        ok: true,
        count: result.value.length,
      });
    } else {
      const reason = result.reason;
      statusByName.set(provider.name, {
        name: provider.name,
        configured: true,
        ok: false,
        count: 0,
        error:
          reason instanceof ProviderError
            ? reason.message
            : "The source couldn't be reached.",
      });
    }
  });

  // Status list always covers every provider, in registration order.
  const providers: ProviderStatus[] = PROVIDERS.map(
    (p) =>
      statusByName.get(p.name) ?? {
        name: p.name,
        configured: false,
        ok: false,
        count: 0,
      },
  );

  // 4. Merge in registration order (Jooble first) so Jooble wins duplicates.
  //    Each provider's list is put through the shared posting contract FIRST,
  //    so the 24-posting cap fills with postings classify can accept rather
  //    than being spent on rows that would be dropped later.
  const postings = mergePostings(
    PROVIDERS.map((p) => parsePostings(listsByName.get(p.name) ?? [])),
  );

  // 5. Persist to cache — only when at least one provider answered, so a
  //    transient outage is never frozen for 24h.
  if (providers.some((p) => p.ok)) {
    const row: CacheRow = {
      user_id: userId,
      query_hash: queryHash,
      query: normalized,
      results: { postings, providers, fetchedAt },
      fetched_at: fetchedAt,
    };

    let failure = await writeCacheRow(supabase, row);
    if (failure) {
      await new Promise((resolve) =>
        setTimeout(resolve, CACHE_WRITE_RETRY_DELAY_MS),
      );
      failure = await writeCacheRow(supabase, row);
    }

    if (failure) {
      console.error("[lib/jobs/search] cache write failed", failure);
      // With postings in hand, an unrecorded search is an unclassifiable
      // one — classify only trusts ids it can find in this cache. Fail
      // clean and retryable rather than returning a poisoned bearing.
      // With nothing found there is nothing to classify, so the missing
      // row costs the user only a repeated provider call.
      if (postings.length > 0) throw new JobSearchPersistError(failure);
    }
  }

  return { postings, providers, cached: false, fetchedAt };
}
