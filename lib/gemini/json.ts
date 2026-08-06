import "server-only";

import { ApiError } from "@google/genai";
import type { ZodType } from "zod";
import { getGemini, MODEL } from "./client";

/**
 * User-safe Gemini failure. The `message` is always safe to show verbatim
 * in the UI; the original failure travels on `cause` for server logs.
 */
export class GeminiError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "GeminiError";
  }
}

export interface GenerateJSONOptions<T> {
  prompt: string;
  schema: ZodType<T>;
  system?: string;
  temperature?: number;
}

const RATE_LIMIT_BACKOFF_MS = 6_000;

const MSG_NOT_CONFIGURED =
  "The AI service isn't configured yet. Add GEMINI_API_KEY to your environment.";
const MSG_RATE_LIMITED =
  "The model is at capacity right now. Wait a moment and try again.";
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
 * - ONE retry with a 6s backoff on 429/503 (single budget for the whole call).
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
        if (isMissingKey(err)) throw new GeminiError(MSG_NOT_CONFIGURED, err);
        if (isRateLimited(err)) {
          if (!rateLimitRetryUsed) {
            rateLimitRetryUsed = true;
            await sleep(RATE_LIMIT_BACKOFF_MS);
            continue;
          }
          throw new GeminiError(MSG_RATE_LIMITED, err);
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

  throw new GeminiError(MSG_UNREADABLE, new Error(second.detail));
}
