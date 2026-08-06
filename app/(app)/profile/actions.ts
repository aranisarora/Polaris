"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { computeScore } from "@/lib/score";
import { cvDataSchema, asCVData } from "@/lib/gemini/prompts/cv";
import {
  hasRealAnswer,
  NAME_MAX,
  type QuestionnaireDraft,
} from "@/components/profile/answers";
import type { CVData } from "@/lib/types";

/**
 * saveProfile — the one mutation of the profile surface.
 *
 * Per docs/CONTRACTS.md: upserts career_profiles with completed_at and
 * inserts the first cv_versions snapshot (score via lib/score.ts, reason
 * "Profile created"). Merges with what is already stored so the CV path,
 * the questionnaire path and the addendum compose: cv + answers → "both".
 *
 * `stay: true` skips the redirect so the client can offer the optional
 * addendum (or return to the profile summary) — the data is saved either way.
 *
 * The questionnaire also carries the user's name (the CV path gets one from
 * `basics.name`). It is stored with the answers and mirrored to
 * `profiles.full_name`, which is where the living CV reads it from.
 */

const answer = z
  .string()
  .max(4000)
  .nullish()
  .transform((v) => {
    const t = v?.trim();
    return t ? t : undefined;
  });

/** The display name: same forgiving trim, a tighter ceiling, never required. */
const nameAnswer = z
  .string()
  .max(4000)
  .nullish()
  .transform((v) => {
    const t = v?.trim().replace(/\s+/g, " ");
    return t ? t.slice(0, NAME_MAX) : undefined;
  });

const questionnaireSchema = z.object({
  name: nameAnswer,
  currentRole: answer,
  yearsExperience: answer,
  topSkills: answer,
  proudestWork: answer,
  education: answer,
  certifications: answer,
  location: answer,
  workRights: answer,
  extras: answer,
});

const saveProfileSchema = z.object({
  cv: cvDataSchema.optional(),
  questionnaire: questionnaireSchema.optional(),
  /** Storage path returned by /api/cv/parse when the upload succeeded. */
  cvFilePath: z.string().max(300).optional(),
  /** Skip the /bearing redirect (addendum offer, revisit edits). */
  stay: z.boolean().optional(),
});

export interface SaveProfileInput {
  cv?: CVData;
  questionnaire?: QuestionnaireDraft;
  cvFilePath?: string;
  stay?: boolean;
}

export type SaveProfileResult = { ok: true } | { ok: false; error: string };

function splitList(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}

/**
 * A questionnaire-only profile still needs a CV snapshot for cv_versions
 * (the living CV builds from it). This is a deterministic mapping of the
 * user's own words into CV sections — nothing invented, nothing reworded.
 */
function cvFromQuestionnaire(q: QuestionnaireDraft, name: string): CVData {
  return {
    basics: {
      name,
      headline: q.currentRole,
      location: q.location,
      links: [],
    },
    experience: q.currentRole
      ? [
          {
            company: "",
            role: q.currentRole,
            current: true,
            bullets: q.proudestWork ? [q.proudestWork] : [],
          },
        ]
      : [],
    education: q.education ? [{ institution: q.education }] : [],
    skills: splitList(q.topSkills),
    projects: [],
  };
}

export async function saveProfile(
  input: SaveProfileInput,
): Promise<SaveProfileResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const parsed = saveProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        "Something in the profile didn't come through cleanly. Check the fields and try again.",
    };
  }

  const cv = parsed.data.cv ? asCVData(parsed.data.cv) : undefined;
  const questionnaire =
    parsed.data.questionnaire && hasRealAnswer(parsed.data.questionnaire)
      ? parsed.data.questionnaire
      : undefined;
  const { cvFilePath, stay } = parsed.data;

  if (!cv && !questionnaire) {
    return {
      ok: false,
      error: "Add a CV or at least one answer before saving.",
    };
  }

  const { data: existing, error: readError } = await supabase
    .from("career_profiles")
    .select("cv_structured, questionnaire, cv_file_path, completed_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) {
    return {
      ok: false,
      error: "Your profile couldn't be loaded to save against. Try again.",
    };
  }

  const mergedCv = (cv ?? existing?.cv_structured ?? null) as CVData | null;
  const mergedQuestionnaire = (questionnaire ??
    existing?.questionnaire ??
    null) as QuestionnaireDraft | null;
  const source =
    mergedCv && mergedQuestionnaire ? "both" : mergedCv ? "cv" : "questionnaire";
  const now = new Date().toISOString();

  const { error: upsertError } = await supabase.from("career_profiles").upsert({
    user_id: user.id,
    cv_structured: mergedCv,
    questionnaire: mergedQuestionnaire,
    source,
    cv_file_path: cvFilePath ?? existing?.cv_file_path ?? null,
    completed_at: existing?.completed_at ?? now,
    updated_at: now,
  });
  if (upsertError) {
    console.error("[profile] upsert failed:", upsertError.message);
    return {
      ok: false,
      error: "Your profile couldn't be saved. Nothing was lost — try again.",
    };
  }

  // The name the questionnaire path now collects. Empty is fine everywhere
  // below — every consumer already renders a nameless CV gracefully.
  const metaName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";
  const accountName = typeof metaName === "string" ? metaName.trim() : "";
  const answeredName = mergedQuestionnaire?.name?.trim() ?? "";

  // A questionnaire-only user has no `cv_structured`, so their living CV is
  // rebuilt on every read by app/(app)/cv/data.ts → questionnaireToCV(), which
  // takes the name from `profiles.full_name`. Without this write the name they
  // just typed would never reach /cv or the PDF export. Best-effort: the
  // profile is already saved, and a nameless CV still renders.
  if (answeredName && answeredName !== accountName) {
    const { error: nameError } = await supabase
      .from("profiles")
      .update({ full_name: answeredName })
      .eq("id", user.id);
    if (nameError) {
      console.error("[profile] full_name update failed:", nameError.message);
    }
  }

  // Snapshot for cv_versions. First save: "Profile created" at the base
  // score. Later re-saves record the change without ever lowering the score.
  const snapshot =
    mergedCv ??
    cvFromQuestionnaire(
      mergedQuestionnaire as QuestionnaireDraft,
      answeredName || accountName,
    );

  const { data: latest } = await supabase
    .from("cv_versions")
    .select("id, score")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseScore = computeScore(snapshot, []);
  const { error: versionError } = await supabase.from("cv_versions").insert({
    user_id: user.id,
    snapshot,
    score: latest ? Math.max(latest.score ?? 0, baseScore) : baseScore,
    reason: latest ? "Profile updated" : "Profile created",
  });
  if (versionError) {
    // The profile itself is saved — a missing snapshot must not strand the user.
    console.error("[profile] cv_versions insert failed:", versionError.message);
  }

  revalidatePath("/profile");
  if (!stay) redirect("/bearing");
  return { ok: true };
}
