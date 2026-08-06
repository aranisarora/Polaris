import "server-only";

import type { JobPosting, JobQuery } from "@/lib/types";
import {
  asPositiveNumber,
  asText,
  providerFetchJSON,
  ProviderError,
  stripHtml,
  toIso,
  type JobProvider,
} from "./provider";
import { isSafePostingUrl } from "./posting";

/**
 * Adzuna provider. GET /v1/api/jobs/{country}/search/1 with app_id/app_key
 * (docs/CONTRACTS.md). Returns `{ results: [...] }` with structured
 * salary_min/salary_max — currency GBP for gb, USD for us.
 */
export const adzuna: JobProvider = {
  name: "adzuna",

  configured() {
    return Boolean(
      process.env.ADZUNA_APP_ID?.trim() && process.env.ADZUNA_APP_KEY?.trim(),
    );
  },

  async search(q: JobQuery): Promise<JobPosting[]> {
    const appId = process.env.ADZUNA_APP_ID?.trim();
    const appKey = process.env.ADZUNA_APP_KEY?.trim();
    if (!appId || !appKey) {
      throw new ProviderError("adzuna", "Adzuna isn't configured.");
    }

    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: "25",
      "content-type": "application/json",
    });
    // `what=` requires EVERY word to match (AND) — long keyword strings
    // return nothing. Beyond 3 words, fall back to any-word matching.
    const keywordCount = q.keywords.trim().split(/\s+/).length;
    params.set(keywordCount > 3 ? "what_or" : "what", q.keywords);
    if (q.location?.trim()) {
      params.set("where", q.location.trim());
    }

    const data = await providerFetchJSON(
      "adzuna",
      `https://api.adzuna.com/v1/api/jobs/${q.country}/search/1?${params.toString()}`,
    );

    const results =
      data &&
      typeof data === "object" &&
      Array.isArray((data as { results?: unknown }).results)
        ? ((data as { results: unknown[] }).results)
        : [];

    const currency = q.country === "gb" ? "GBP" : "USD";

    const postings: JobPosting[] = [];
    for (const raw of results) {
      if (!raw || typeof raw !== "object") continue;
      const job = raw as Record<string, unknown>;

      const title = stripHtml(asText(job.title));
      const url = asText(job.redirect_url);
      // Unusable or non-http(s) rows are skipped, never crash — a hostile
      // javascript:/data: link must never reach an anchor href.
      if (!title || !isSafePostingUrl(url)) continue;

      const sourceId = asText(job.id) || url;
      const company =
        job.company && typeof job.company === "object"
          ? asText((job.company as Record<string, unknown>).display_name)
          : "";
      const location =
        job.location && typeof job.location === "object"
          ? asText((job.location as Record<string, unknown>).display_name)
          : "";

      const min = asPositiveNumber(job.salary_min);
      const max = asPositiveNumber(job.salary_max);
      const postedAt = toIso(job.created);

      postings.push({
        id: `adzuna:${sourceId}`,
        source: "adzuna",
        sourceId,
        title,
        company: stripHtml(company),
        location: stripHtml(location),
        country: q.country,
        description: stripHtml(asText(job.description)),
        ...(min !== undefined || max !== undefined
          ? {
              salary: {
                ...(min !== undefined ? { min } : {}),
                ...(max !== undefined ? { max } : {}),
                currency,
              },
            }
          : {}),
        url,
        ...(postedAt ? { postedAt } : {}),
      });
    }

    return typeof q.limit === "number" && q.limit > 0
      ? postings.slice(0, q.limit)
      : postings;
  },
};
