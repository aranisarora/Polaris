import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getGemini, MODEL } from "@/lib/gemini/client";
import { GeminiError } from "@/lib/gemini/json";
import {
  asCVData,
  CV_PARSE_PROMPT,
  CV_PARSE_SYSTEM,
  cvDataSchema,
} from "@/lib/gemini/prompts/cv";
import type { CVData } from "@/lib/types";

/**
 * POST /api/cv/parse — multipart form with a `file` field (PDF ≤ 8MB).
 * Parses the CV with Gemini (inlineData) into CVData. Does NOT persist the
 * profile — the client shows the confirm/edit screen and calls saveProfile.
 * The original PDF is uploaded to storage `cvs/{userId}/cv.pdf` best-effort.
 *
 * Success: { cv: CVData, storagePath: string | null }
 * Failure: { error: string } with 400 / 401 / 413 / 415 / 422 / 502 —
 * every message is user-safe.
 */

export const runtime = "nodejs";
// Dense PDFs can take ~20–60s (up to 2 model calls); platforms with short
// default function timeouts need the explicit budget.
export const maxDuration = 120;

const MAX_BYTES = 8 * 1024 * 1024;
const RATE_LIMIT_BACKOFF_MS = 6_000;

const MSG_NOT_PDF =
  "That file isn't a PDF. Export your CV as a PDF and try again.";
const MSG_TOO_BIG =
  "That PDF is over 8MB. Export a lighter version — without photos it will shrink fast.";
const MSG_NO_FILE = "No file arrived. Choose a PDF and try again.";
const MSG_EMPTY_FILE = "That file is empty. Choose a different PDF.";
const MSG_UNREADABLE =
  "We couldn't read that PDF — it may be a scan or an image-based export. Try a text-based PDF, or answer a few questions instead.";
const MSG_RATE_LIMITED =
  "The reading instruments are at capacity right now. Wait a moment and try again.";
const MSG_NOT_CONFIGURED =
  "CV reading isn't configured yet. Add GEMINI_API_KEY to the environment.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimited(err: unknown): boolean {
  if (err instanceof Error) {
    const status = (err as { status?: unknown }).status;
    if (status === 429 || status === 503) return true;
    return /\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|rate.?limit|overloaded/i.test(
      err.message,
    );
  }
  return false;
}

function isMissingKey(err: unknown): boolean {
  return err instanceof Error && err.message.includes("GEMINI_API_KEY");
}

/** Strip markdown fences; fall back to the outermost JSON object. */
function extractJSONText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start && (trimmed[0] !== "{" || trimmed[trimmed.length - 1] !== "}")) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

type ParseOutcome = { ok: true; cv: CVData } | { ok: false; detail: string };

function tryParseCV(raw: string): ParseOutcome {
  let value: unknown;
  try {
    value = JSON.parse(extractJSONText(raw));
  } catch {
    return { ok: false, detail: "Response was not valid JSON." };
  }
  const result = cvDataSchema.safeParse(value);
  if (result.success) return { ok: true, cv: asCVData(result.data) };
  const detail = result.error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  return { ok: false, detail: `JSON did not match the required shape — ${detail}` };
}

/**
 * Multimodal Gemini call. `generateJSON` (lib/gemini/json.ts) only accepts a
 * text prompt, so the PDF inlineData call lives here with the same retry
 * semantics: one retry on parse/validation failure, one backoff retry on
 * 429/503, all failures mapped to a user-safe GeminiError.
 */
async function parseCVFromPdf(base64: string): Promise<CVData> {
  let rateLimitRetryUsed = false;

  async function callModel(note?: string): Promise<string> {
    for (;;) {
      try {
        const ai = getGemini();
        const response = await ai.models.generateContent({
          model: MODEL,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: "application/pdf", data: base64 } },
                { text: note ? `${CV_PARSE_PROMPT}\n\n${note}` : CV_PARSE_PROMPT },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            systemInstruction: CV_PARSE_SYSTEM,
            temperature: 0,
          },
        });
        return response.text ?? "";
      } catch (err) {
        if (isMissingKey(err)) throw new GeminiError(MSG_NOT_CONFIGURED, err);
        if (isRateLimited(err)) {
          if (!rateLimitRetryUsed) {
            rateLimitRetryUsed = true;
            await sleep(RATE_LIMIT_BACKOFF_MS);
            continue;
          }
          throw new GeminiError(MSG_RATE_LIMITED, err);
        }
        throw new GeminiError(MSG_UNREADABLE, err);
      }
    }
  }

  const first = tryParseCV(await callModel());
  if (first.ok) return first.cv;

  const second = tryParseCV(
    await callModel(
      `Your previous response could not be used. Problem: ${first.detail}\n` +
        `Respond again with ONLY valid JSON matching the required shape — no code fences, no commentary.`,
    ),
  );
  if (second.ok) return second.cv;

  throw new GeminiError(MSG_UNREADABLE, new Error(second.detail));
}

/** True when the model extracted nothing — likely a scan/image PDF. */
function isEmptyCV(cv: CVData): boolean {
  return (
    cv.basics.name.length === 0 &&
    cv.experience.length === 0 &&
    cv.education.length === 0 &&
    cv.skills.length === 0 &&
    cv.projects.length === 0
  );
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to upload a CV." },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "The upload didn't arrive intact. Try again." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: MSG_NO_FILE }, { status: 400 });
  }

  const looksPdf =
    file.type === "application/pdf" ||
    (file.type === "" && file.name.toLowerCase().endsWith(".pdf"));
  if (!looksPdf) {
    return NextResponse.json({ error: MSG_NOT_PDF }, { status: 415 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: MSG_EMPTY_FILE }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: MSG_TOO_BIG }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  // Magic-header check: a renamed .docx or image gets a clear answer now,
  // not a confusing model failure later.
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return NextResponse.json({ error: MSG_NOT_PDF }, { status: 415 });
  }

  let cv: CVData;
  try {
    cv = await parseCVFromPdf(bytes.toString("base64"));
  } catch (err) {
    console.error("[cv/parse] Gemini parse failed:", err);
    const message = err instanceof GeminiError ? err.message : MSG_UNREADABLE;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (isEmptyCV(cv)) {
    return NextResponse.json({ error: MSG_UNREADABLE }, { status: 422 });
  }

  // Best-effort archive of the original — failure is logged, never fatal.
  let storagePath: string | null = `${user.id}/cv.pdf`;
  try {
    const { error: uploadError } = await supabase.storage
      .from("cvs")
      .upload(storagePath, bytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError) {
      console.error("[cv/parse] storage upload failed:", uploadError.message);
      storagePath = null;
    }
  } catch (err) {
    console.error("[cv/parse] storage upload threw:", err);
    storagePath = null;
  }

  return NextResponse.json({ cv, storagePath });
}
