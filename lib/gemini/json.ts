import "server-only";

import { ApiError } from "@google/genai";
import type { ZodType } from "zod";
import { getGemini, MODEL } from "./client";

/**
 * Which wall the call hit. `message` is always safe to show verbatim; this
 * says whether waiting can possibly help, so callers can stop looping when
 * the answer is "not until tomorrow".
 */
export type GeminiFailureKind =
  | "not-configured"
  | "rate-limited"
  | "daily-quota"
  | "unreadable"
  | "unknown";

/**
 * User-safe Gemini failure. The `message` is always safe to show verbatim
 * in the UI; the original failure travels on `cause` for server logs.
 */
export class GeminiError extends Error {
  readonly kind: GeminiFailureKind;

  constructor(message: string, cause?: unknown, kind: GeminiFailureKind = "unknown") {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "GeminiError";
    this.kind = kind;
  }
}

export interface GenerateJSONOptions<T> {
  prompt: string;
  schema: ZodType<T>;
  system?: string;
  temperature?: number;
}

/**
 * Free-tier ceiling, measured on this project (August 2026):
 * **5 requests/minute and 20 requests/day**, per project per model.
 * The per-minute wall is what a retry can clear; the per-day wall is not.
 */
/** Used only when Gemini's 429 names no RetryInfo of its own. */
const RATE_LIMIT_BACKOFF_MS = 6_000;
/** Floor/ceiling on an honoured RetryInfo — a request must never hang. */
const MIN_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Reaches real users through every Gemini-backed route, so it names no
 * environment variable — a visitor cannot set one. The operator's version of
 * this lives in the server log, not on the screen.
 */
const MSG_NOT_CONFIGURED =
  "This part of Polaris isn't switched on yet. Nothing you've entered is lost — try again later.";
/** Per-minute rejection: a real wait clears it. */
export const MSG_RATE_LIMITED =
  "The model is at capacity right now. Wait a moment and try again.";
/** Per-day rejection: waiting a moment is a false promise, so don't make it. */
export const MSG_DAILY_QUOTA =
  "Today's reading quota is spent — the instruments won't answer again until it resets tomorrow. Nothing you've entered is lost.";
const MSG_UNREADABLE =
  "The model's response couldn't be read. Try again.";
const MSG_GENERIC =
  "Something went wrong while reading your data. Try again.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 429 (rate limit) / 503 (overloaded) — worth one backoff retry. */
function isRateLimited(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 429 || err.status === 503;
  }
  if (err instanceof Error) {
    return /\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|rate.?limit|overloaded/i.test(
      err.message,
    );
  }
  return false;
}

function isMissingKey(err: unknown): boolean {
  return err instanceof Error && err.message.includes("GEMINI_API_KEY");
}

// ------------------------------------------------------------ quota reading

/** What Gemini's own 429 body tells us about the wall we hit. */
export interface QuotaSignal {
  /**
   * The violated quota is a per-DAY one. Retrying cannot clear it, and
   * telling the user to "wait a moment" would be a false promise.
   */
  daily: boolean;
  /** Gemini's own RetryInfo, in ms, when the payload carried one. */
  retryAfterMs: number | null;
}

/** `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, `…limit: 20 per day`. */
const PER_DAY = /per[-_\s]?day/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** google.protobuf.Duration in JSON: `"20.3s"`, `20`, `{seconds, nanos}`. */
function durationToMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 1000);
  }
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d+(?:\.\d+)?)s$/);
    return match ? Math.round(Number(match[1]) * 1000) : null;
  }
  const record = asRecord(value);
  if (!record) return null;
  const seconds = Number(record.seconds ?? 0);
  const nanos = Number(record.nanos ?? 0);
  if (!Number.isFinite(seconds) || !Number.isFinite(nanos)) return null;
  return Math.round(seconds * 1000 + nanos / 1e6);
}

/**
 * Read Gemini's 429 for the two things that change what we should do.
 *
 * The Gemini API answers an exhausted quota with a `google.rpc.QuotaFailure`
 * naming the violated quota (`GenerateRequestsPerMinute…` vs
 * `GenerateRequestsPerDay…`) and, usually, a `google.rpc.RetryInfo` carrying
 * the delay it wants us to honour. `@google/genai` puts the whole JSON body
 * on `ApiError.message`, so that is where we read it from; anything that
 * isn't that shape falls back to a text scan.
 */
export function readQuotaSignal(err: unknown): QuotaSignal {
  const text = err instanceof Error ? err.message : typeof err === "string" ? err : "";

  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }

  const error = asRecord(asRecord(body)?.error) ?? asRecord(body);
  const rawDetails = error === null ? undefined : error.details;
  const details: unknown[] = Array.isArray(rawDetails) ? rawDetails : [];

  let daily = false;
  let sawQuotaFailure = false;
  let retryAfterMs: number | null = null;

  for (const detail of details) {
    const record = asRecord(detail);
    if (!record) continue;
    const type = typeof record["@type"] === "string" ? record["@type"] : "";

    if (type.endsWith("RetryInfo")) {
      const ms = durationToMs(record.retryDelay);
      if (ms !== null && ms >= 0) retryAfterMs = ms;
    }

    if (type.endsWith("QuotaFailure") && Array.isArray(record.violations)) {
      sawQuotaFailure = true;
      for (const rawViolation of record.violations) {
        const violation = asRecord(rawViolation);
        if (!violation) continue;
        const named = [violation.quotaId, violation.quotaMetric].filter(
          (value): value is string => typeof value === "string",
        );
        if (named.some((value) => PER_DAY.test(value))) daily = true;
      }
    }
  }

  // Not the documented shape (an SDK-wrapped string, a gateway error page):
  // fall back to scanning the raw text for the same two facts.
  if (!sawQuotaFailure) daily = PER_DAY.test(text);
  if (retryAfterMs === null) {
    const loose = text.match(/retryDelay"?\s*[:=]\s*"?(\d+(?:\.\d+)?)s/i);
    if (loose) retryAfterMs = Math.round(Number(loose[1]) * 1000);
  }

  return { daily, retryAfterMs };
}

/** Honour Gemini's delay, but never below a tick or above the cap. */
function clampRetryDelay(ms: number | null): number {
  const wanted = ms ?? RATE_LIMIT_BACKOFF_MS;
  return Math.min(MAX_RETRY_DELAY_MS, Math.max(MIN_RETRY_DELAY_MS, wanted));
}

// ------------------------------------------------------------- json parsing

/** Strip markdown code fences and, failing that, cut to the outermost JSON. */
function extractJSONText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

/** Last-resort recovery: substring between the first and last JSON bracket. */
function extractJSONCore(text: string): string | null {
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0);
  if (starts.length === 0) return null;
  const start = Math.min(...starts);
  const closer = text[start] === "{" ? "}" : "]";
  const end = text.lastIndexOf(closer);
  if (end <= start) return null;
  return text.slice(start, end + 1);
}

type ParseOutcome<T> = { ok: true; data: T } | { ok: false; detail: string };

function parseAndValidate<T>(raw: string, schema: ZodType<T>): ParseOutcome<T> {
  const candidate = extractJSONText(raw);

  let value: unknown;
  try {
    value = JSON.parse(candidate);
  } catch {
    const core = extractJSONCore(candidate);
    if (core === null) {
      return { ok: false, detail: "Response was not valid JSON." };
    }
    try {
      value = JSON.parse(core);
    } catch {
      return { ok: false, detail: "Response was not valid JSON." };
    }
  }

  const result = schema.safeParse(value);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const detail = result.error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  return { ok: false, detail: `JSON did not match the required shape — ${detail}` };
}

/**
 * Call Gemini and get back schema-validated JSON.
 *
 * Behavior (per docs/CONTRACTS.md):
 * - `responseMimeType: "application/json"`; code fences stripped defensively.
 * - Zod-validates the parsed value.
 * - ONE retry on parse/validation failure, appending the validation error
 *   to the prompt.
 * - ONE retry on 429/503 (single budget for the whole call), waiting the
 *   delay Gemini's own RetryInfo asked for — clamped to 30s so a request can
 *   never hang — or 6s when it named none.
 * - A per-DAY quota exhaustion is never retried and never described as a
 *   momentary wait: it throws `MSG_DAILY_QUOTA` (kind `daily-quota`).
 * - All failures throw `GeminiError` with a user-safe message; the raw
 *   failure is preserved on `cause` for server logs. Never leak raw
 *   provider errors across an API boundary.
 */
export async function generateJSON<T>(opts: GenerateJSONOptions<T>): Promise<T> {
  const { prompt, schema, system, temperature } = opts;

  let rateLimitRetryUsed = false;

  async function callModel(fullPrompt: string): Promise<string> {
    for (;;) {
      try {
        const ai = getGemini();
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: fullPrompt,
          config: {
            responseMimeType: "application/json",
            ...(system !== undefined ? { systemInstruction: system } : {}),
            ...(temperature !== undefined ? { temperature } : {}),
          },
        });
        return response.text ?? "";
      } catch (err) {
        if (err instanceof GeminiError) throw err;
        if (isMissingKey(err)) {
          throw new GeminiError(MSG_NOT_CONFIGURED, err, "not-configured");
        }
        if (isRateLimited(err)) {
          const { daily, retryAfterMs } = readQuotaSignal(err);
          // The day's allowance, not the minute's: no wait clears it, so
          // say so rather than promising a retry that cannot work.
          if (daily) {
            throw new GeminiError(MSG_DAILY_QUOTA, err, "daily-quota");
          }
          if (!rateLimitRetryUsed) {
            rateLimitRetryUsed = true;
            await sleep(clampRetryDelay(retryAfterMs));
            continue;
          }
          throw new GeminiError(MSG_RATE_LIMITED, err, "rate-limited");
        }
        throw new GeminiError(MSG_GENERIC, err);
      }
    }
  }

  const first = parseAndValidate(await callModel(prompt), schema);
  if (first.ok) return first.data;

  const repairPrompt =
    `${prompt}\n\n` +
    `Your previous response could not be used. Problem: ${first.detail}\n` +
    `Respond again with ONLY valid JSON matching the required shape — ` +
    `no code fences, no commentary.`;

  const second = parseAndValidate(await callModel(repairPrompt), schema);
  if (second.ok) return second.data;

  throw new GeminiError(MSG_UNREADABLE, new Error(second.detail), "unreadable");
}
