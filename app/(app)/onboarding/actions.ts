"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { interpretDream } from "@/lib/gemini/prompts/dream";
import {
  COMPANY_TYPE_VALUES,
  SECTOR_VALUES,
} from "@/components/onboarding/options";
import type { DreamInterpretation } from "@/lib/types";

/**
 * saveOnboardingStep — the single mutation for the whole wizard
 * (docs/CONTRACTS.md). Upserts the user's `onboarding` row after EVERY
 * step and advances `current_step`, so abandoning and returning resumes
 * exactly where they left off.
 *
 * - "dream": stores the text verbatim and fires the Gemini interpretation.
 *   Interpretation failure stores null and proceeds silently — it never
 *   blocks the user.
 * - "fastTrack": exact company + role; completes onboarding in one move.
 * - "sector" / "company": choice steps; "company" completes onboarding.
 */

const inputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("dream"),
    dreamText: z.string().trim().min(1).max(4000),
  }),
  z.object({
    kind: z.literal("fastTrack"),
    company: z.string().trim().min(1).max(160),
    role: z.string().trim().min(1).max(160),
    dreamText: z.string().max(4000).optional(),
  }),
  z.object({
    kind: z.literal("sector"),
    sector: z.enum(SECTOR_VALUES),
    sectorOther: z.string().trim().max(120).optional(),
  }),
  z.object({
    kind: z.literal("company"),
    companyType: z.enum(COMPANY_TYPE_VALUES),
  }),
]);

export type SaveOnboardingStepInput = z.input<typeof inputSchema>;

export type SaveOnboardingStepResult =
  | { ok: true; interpretation: DreamInterpretation | null }
  | { ok: false; error: string };

const MSG_SAVE_FAILED =
  "That didn't save. Try again — nothing you typed is lost.";
const MSG_INVALID = "That answer couldn't be read. Adjust it and try again.";
const MSG_SECTOR_OTHER = "Name your sector — a word or two is enough.";

/**
 * The interpretation is a bonus, never a gate: past this budget the step
 * proceeds with null rather than holding the Continue button hostage.
 * Typical calls land in 1–4s; anything slower isn't worth pinning the
 * product's very first Continue on (the contract tolerates a null
 * interpretation — the step-3 suggestion simply doesn't appear).
 */
const INTERPRETATION_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export async function saveOnboardingStep(
  input: SaveOnboardingStepInput,
): Promise<SaveOnboardingStepResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: MSG_INVALID };
  const step = parsed.data;

  if (
    step.kind === "sector" &&
    step.sector === "other" &&
    !step.sectorOther?.trim()
  ) {
    return { ok: false, error: MSG_SECTOR_OTHER };
  }

  const { data: existing } = await supabase
    .from("onboarding")
    .select("current_step, completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const now = new Date().toISOString();
  const reached = existing?.current_step ?? 1;
  const row: Record<string, unknown> = {
    user_id: user.id,
    updated_at: now,
  };
  let interpretation: DreamInterpretation | null = null;

  switch (step.kind) {
    case "dream": {
      try {
        interpretation = await withTimeout(
          interpretDream(step.dreamText),
          INTERPRETATION_TIMEOUT_MS,
        );
      } catch (error) {
        // Tolerated by contract: store null, proceed silently.
        console.error("[onboarding] dream interpretation failed:", error);
        interpretation = null;
      }
      row.dream_text = step.dreamText;
      row.dream_interpretation = interpretation;
      row.fast_track = false;
      // never regress a resume point the user already reached
      row.current_step = Math.max(reached, 2);
      break;
    }
    case "fastTrack": {
      row.fast_track = true;
      row.fast_track_company = step.company;
      row.fast_track_role = step.role;
      if (step.dreamText !== undefined) row.dream_text = step.dreamText;
      row.current_step = 3;
      row.completed_at = existing?.completed_at ?? now;
      break;
    }
    case "sector": {
      row.sector = step.sector;
      row.sector_other =
        step.sector === "other" ? (step.sectorOther?.trim() ?? "") : null;
      row.current_step = Math.max(reached, 3);
      break;
    }
    case "company": {
      row.company_type = step.companyType;
      row.current_step = 3;
      row.completed_at = existing?.completed_at ?? now;
      break;
    }
  }

  const { error } = await supabase
    .from("onboarding")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    console.error("[onboarding] save failed:", error.message);
    return { ok: false, error: MSG_SAVE_FAILED };
  }

  return { ok: true, interpretation };
}
