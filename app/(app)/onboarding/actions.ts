"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  COMPANY_TYPE_VALUES,
  ROLE_OTHER,
  SECTOR_VALUES,
  composeDream,
} from "@/components/onboarding/options";
import type { DreamInterpretation, SectorOption } from "@/lib/types";

/**
 * saveOnboardingStep — the single mutation for the whole wizard
 * (docs/CONTRACTS.md). Upserts the user's `onboarding` row after EVERY
 * step and advances `current_step`, so abandoning and returning resumes
 * exactly where they left off.
 *
 * - "sector": the field of work (step 1).
 * - "role": the dream job title (step 2). Composes `dream_text` and its
 *   interpretation from the two picks — deterministically, with no model
 *   call, so the wizard never waits on Gemini and works when the key is
 *   throttled or unset.
 * - "company": kind of company (step 3); completes onboarding.
 * - "fastTrack": exact company + job title; completes onboarding in one move.
 */

const inputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("sector"),
    sector: z.enum(SECTOR_VALUES),
    sectorOther: z.string().trim().max(120).optional(),
  }),
  z.object({
    kind: z.literal("role"),
    role: z.string().trim().min(1).max(160),
    roleOther: z.string().trim().max(160).optional(),
  }),
  z.object({
    kind: z.literal("company"),
    companyType: z.enum(COMPANY_TYPE_VALUES),
  }),
  z.object({
    kind: z.literal("fastTrack"),
    company: z.string().trim().min(1).max(160),
    role: z.string().trim().min(1).max(160),
  }),
]);

export type SaveOnboardingStepInput = z.input<typeof inputSchema>;

export type SaveOnboardingStepResult =
  | { ok: true; interpretation: DreamInterpretation | null }
  | { ok: false; error: string };

const MSG_SAVE_FAILED =
  "That didn't save. Try again — nothing you chose is lost.";
const MSG_INVALID = "That answer couldn't be read. Adjust it and try again.";
const MSG_SECTOR_OTHER = "Name your field of work — a word or two is enough.";
const MSG_ROLE_OTHER = "Name the job title you're aiming for.";
const MSG_NO_SECTOR = "Pick your field of work first.";

interface ExistingRow {
  current_step: number | null;
  completed_at: string | null;
  sector: string | null;
  sector_other: string | null;
}

function asSector(value: string | null): SectorOption | null {
  return value && (SECTOR_VALUES as readonly string[]).includes(value)
    ? (value as SectorOption)
    : null;
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
  if (step.kind === "role" && step.role === ROLE_OTHER && !step.roleOther?.trim()) {
    return { ok: false, error: MSG_ROLE_OTHER };
  }

  const { data: existing } = await supabase
    .from("onboarding")
    .select("current_step, completed_at, sector, sector_other")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = (existing ?? null) as ExistingRow | null;
  const now = new Date().toISOString();
  const reached = row?.current_step ?? 1;
  const update: Record<string, unknown> = {
    user_id: user.id,
    updated_at: now,
  };
  let interpretation: DreamInterpretation | null = null;

  switch (step.kind) {
    case "sector": {
      update.sector = step.sector;
      update.sector_other =
        step.sector === "other" ? (step.sectorOther?.trim() ?? "") : null;
      update.fast_track = false;
      // never regress a resume point the user already reached
      update.current_step = Math.max(reached, 2);
      break;
    }
    case "role": {
      // the sector is the source of truth for which ladder this title came
      // from, so read it back rather than trusting a second client copy
      const sector = asSector(row?.sector ?? null);
      if (!sector) return { ok: false, error: MSG_NO_SECTOR };

      const composed = composeDream({
        sector,
        sectorOther: row?.sector_other ?? "",
        role: step.role,
        roleOther: step.roleOther ?? "",
      });
      interpretation = composed.interpretation;
      update.dream_text = composed.dreamText;
      update.dream_interpretation = composed.interpretation;
      update.fast_track = false;
      update.current_step = Math.max(reached, 3);
      break;
    }
    case "company": {
      update.company_type = step.companyType;
      update.current_step = 3;
      update.completed_at = row?.completed_at ?? now;
      break;
    }
    case "fastTrack": {
      update.fast_track = true;
      update.fast_track_company = step.company;
      update.fast_track_role = step.role;
      update.current_step = 3;
      update.completed_at = row?.completed_at ?? now;
      break;
    }
  }

  const { error } = await supabase
    .from("onboarding")
    .upsert(update, { onConflict: "user_id" });

  if (error) {
    console.error("[onboarding] save failed:", error.message);
    return { ok: false, error: MSG_SAVE_FAILED };
  }

  return { ok: true, interpretation };
}
