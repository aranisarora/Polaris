import "server-only";

import { GoogleGenAI } from "@google/genai";

/** Model id for every Gemini call. Override with GEMINI_MODEL. */
export const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

/** True when a Gemini API key is present in the environment. */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

let cached: GoogleGenAI | null = null;

/**
 * Server-only Gemini client. Throws a plain Error when GEMINI_API_KEY is
 * missing — `generateJSON` maps that to a user-safe GeminiError, and
 * callers that want to pre-check can use `isGeminiConfigured()`.
 */
export function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!cached) {
    cached = new GoogleGenAI({ apiKey });
  }
  return cached;
}
