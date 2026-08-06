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
import { jooble } from "./jooble";
import { adzuna } from "./adzuna";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h per PRODUCT.md
const MAX_POSTINGS = 24;

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

// ------------------------------------------------------------------ search

/**
 * The one entry point feature code should use for job search.
 *
 * - Serves from `job_search_cache` when a row for this user+query is
 *   younger than 24h.
 * - Otherwise queries every CONFIGURED provider in parallel
 *   (Promise.allSettled — one failing provider never sinks the other),
 *   merges + dedupes, caps at 24, and persists to the cache (best-effort;
 *   a cache write failure never fails the search).
 * - Zero configured providers is a NORMAL state: returns empty postings
 *   with `configured: false` statuses so the UI can render the designed
 *   "instruments not configured" state. Never throws for provider issues.
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
          return {
            postings: payload.postings,
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
  const postings = mergePostings(
    PROVIDERS.map((p) => listsByName.get(p.name) ?? []),
  );

  const result: JobSearchResult = { postings, providers, cached: false, fetchedAt };

  // 5. Persist to cache — only when at least one provider answered, so a
  //    transient outage is never frozen for 24h. Best-effort.
  if (providers.some((p) => p.ok)) {
    try {
      await supabase.from("job_search_cache").upsert(
        {
          user_id: userId,
          query_hash: queryHash,
          query: normalized,
          results: { postings, providers, fetchedAt } satisfies CachedPayload,
          fetched_at: fetchedAt,
        },
        { onConflict: "user_id,query_hash" },
      );
    } catch {
      // Cache write failure is invisible to the user.
    }
  }

  return result;
}
