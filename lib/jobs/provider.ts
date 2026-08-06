import "server-only";

import type { JobPosting, JobQuery } from "@/lib/types";

export type ProviderName = "jooble" | "adzuna";

/** One job source behind a common interface (docs/CONTRACTS.md). */
export interface JobProvider {
  readonly name: ProviderName;
  /** False is a NORMAL state (keys not added yet) — never an error. */
  configured(): boolean;
  /** Throws ProviderError on any failure; never returns partial garbage. */
  search(q: JobQuery): Promise<JobPosting[]>;
}

/**
 * User-safe provider failure. `message` may be shown in the instruments
 * readout; the raw failure travels on `cause` for server logs.
 */
export class ProviderError extends Error {
  readonly provider: ProviderName;

  constructor(provider: ProviderName, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ProviderError";
    this.provider = provider;
  }
}

/** Hard ceiling on any single provider request. */
export const PROVIDER_TIMEOUT_MS = 10_000;

/**
 * Fetch JSON from a provider with a 10s timeout. Maps every failure mode
 * (timeout, network, non-2xx, bad JSON) to a ProviderError whose message
 * is safe to surface.
 */
export async function providerFetchJSON(
  provider: ProviderName,
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  const label = provider === "jooble" ? "Jooble" : "Adzuna";

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut =
      err instanceof DOMException &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    throw new ProviderError(
      provider,
      timedOut
        ? `${label} didn't answer within 10 seconds.`
        : `${label} couldn't be reached.`,
      err,
    );
  }

  if (!response.ok) {
    throw new ProviderError(
      provider,
      response.status === 401 || response.status === 403
        ? `${label} rejected the configured key.`
        : `${label} answered with an error (${response.status}).`,
    );
  }

  try {
    return await response.json();
  } catch (err) {
    throw new ProviderError(
      provider,
      `${label} returned a response that couldn't be read.`,
      err,
    );
  }
}

// -------------------------------------------------- shared mapping helpers

/** Coerce any provider field to a clean string ("" when absent). */
export function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/** Strip HTML tags and common entities from provider snippets. */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse a provider date into ISO, or undefined when unparseable. */
export function toIso(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Positive finite number, or undefined. */
export function asPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}
