import "server-only";

import type { JobPosting, JobQuery } from "@/lib/types";
import {
  asText,
  providerFetchJSON,
  ProviderError,
  stripHtml,
  toIso,
  type JobProvider,
} from "./provider";
import { isSafePostingUrl } from "./posting";

/**
 * Jooble provider. POST https://jooble.org/api/{key} with
 * `{ keywords, location, page: "1" }` (docs/CONTRACTS.md). Jooble returns
 * `{ totalCount, jobs: [...] }`; salary arrives as free text → `{ text }`.
 */
export const jooble: JobProvider = {
  name: "jooble",

  configured() {
    return Boolean(process.env.JOOBLE_API_KEY?.trim());
  },

  async search(q: JobQuery): Promise<JobPosting[]> {
    const key = process.env.JOOBLE_API_KEY?.trim();
    if (!key) {
      throw new ProviderError("jooble", "Jooble isn't configured.");
    }

    // Jooble has no country parameter on this endpoint, so the location must
    // always carry the country: a bare "London" would match London, Kentucky.
    // Suffix the country name unless the user's location already names it;
    // with no location at all, the country name alone biases the results.
    const countryName = q.country === "gb" ? "United Kingdom" : "United States";
    const alreadyNamesCountry =
      q.country === "gb"
        ? /\b(united kingdom|u\.?k\.?|great britain|england|scotland|wales|northern ireland)\b/i
        : /\b(united states|u\.?s\.?a?\.?|america)\b/i;
    const userLocation = q.location?.trim() ?? "";
    const location = userLocation
      ? alreadyNamesCountry.test(userLocation)
        ? userLocation
        : `${userLocation}, ${countryName}`
      : countryName;

    const data = await providerFetchJSON(
      "jooble",
      `https://jooble.org/api/${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: q.keywords,
          location,
          page: "1",
        }),
      },
    );

    const jobs =
      data && typeof data === "object" && Array.isArray((data as { jobs?: unknown }).jobs)
        ? ((data as { jobs: unknown[] }).jobs)
        : [];

    const postings: JobPosting[] = [];
    for (const raw of jobs) {
      if (!raw || typeof raw !== "object") continue;
      const job = raw as Record<string, unknown>;

      const title = stripHtml(asText(job.title));
      const url = asText(job.link);
      // Unusable or non-http(s) rows are skipped, never crash — a hostile
      // javascript:/data: link must never reach an anchor href.
      if (!title || !isSafePostingUrl(url)) continue;

      const sourceId = asText(job.id) || url;
      const salaryText = asText(job.salary);
      const postedAt = toIso(job.updated);

      postings.push({
        id: `jooble:${sourceId}`,
        source: "jooble",
        sourceId,
        title,
        company: stripHtml(asText(job.company)),
        location: stripHtml(asText(job.location)),
        country: q.country,
        description: stripHtml(asText(job.snippet)),
        ...(salaryText ? { salary: { text: salaryText } } : {}),
        url,
        ...(postedAt ? { postedAt } : {}),
      });
    }

    return typeof q.limit === "number" && q.limit > 0
      ? postings.slice(0, q.limit)
      : postings;
  },
};
