"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { computeScore } from "@/lib/score";
import type { CheckinQuestion, CVData } from "@/lib/types";
import { formatChartDate } from "@/components/cv/format";
import {
  fetchActiveTasks,
  fetchCurrentCV,
  fetchLatestScore,
} from "./data";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface CheckinResult extends ActionResult {
  /** How many tasks this check-in newly marked done. */
  marked: number;
  score: number | null;
  previousScore: number | null;
}

const SIGNED_OUT = "You're signed out. Sign in and try again.";

/* ------------------------------------------------------------- restore */

const RestoreSchema = z.object({ versionId: z.uuid() });

/**
 * Write a past snapshot as a NEW cv_versions row (reason "Restored from
 * [date]") and set it as the current `career_profiles.cv_structured`.
 * Nothing is deleted; the score follows the max rule and never falls.
 */
export async function restoreVersion(
  input: z.infer<typeof RestoreSchema>,
): Promise<ActionResult> {
  const parsed = RestoreSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That revision reference isn't valid." };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SIGNED_OUT };

  const version = await supabase
    .from("cv_versions")
    .select("id, snapshot, score, created_at")
    .eq("id", parsed.data.versionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (version.error || !version.data) {
    return { ok: false, error: "That revision couldn't be found." };
  }

  let score: number;
  try {
    const [{ tasks }, latestScore] = await Promise.all([
      fetchActiveTasks(supabase, user.id),
      fetchLatestScore(supabase, user.id),
    ]);
    const snapshot = version.data.snapshot as CVData;
    score = Math.max(latestScore ?? 0, computeScore(snapshot, tasks));
  } catch {
    return { ok: false, error: "The restore didn't complete. Try again." };
  }

  const inserted = await supabase.from("cv_versions").insert({
    user_id: user.id,
    snapshot: version.data.snapshot,
    score,
    reason: `Restored from ${formatChartDate(version.data.created_at)}`,
  });
  if (inserted.error) {
    return { ok: false, error: "The restore didn't save. Try again." };
  }

  const updated = await supabase
    .from("career_profiles")
    .update({
      cv_structured: version.data.snapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (updated.error) {
    return { ok: false, error: "The restore didn't complete. Try again." };
  }

  revalidatePath("/cv");
  return { ok: true };
}

/* ------------------------------------------------------------ check-in */

const AnswerSchema = z.object({
  checkinId: z.uuid(),
  answers: z
    .array(z.object({ taskId: z.uuid(), done: z.boolean() }))
    .max(3),
});

/**
 * Record a check-in. "Yes" answers mark tasks done (never un-marks — "no"
 * changes nothing) and snapshot a cv_versions row under the max-score rule.
 * An empty answers array is the one-tap dismiss: it only records
 * `completed_at` so the user isn't asked again within 48h.
 */
export async function answerCheckin(
  input: z.infer<typeof AnswerSchema>,
): Promise<CheckinResult> {
  const fail = (error: string): CheckinResult => ({
    ok: false,
    error,
    marked: 0,
    score: null,
    previousScore: null,
  });

  const parsed = AnswerSchema.safeParse(input);
  if (!parsed.success) return fail("That check-in couldn't be read.");

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(SIGNED_OUT);

  const checkin = await supabase
    .from("checkins")
    .select("id, questions, completed_at")
    .eq("id", parsed.data.checkinId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (checkin.error || !checkin.data) {
    return fail("That check-in couldn't be found.");
  }
  if (checkin.data.completed_at) {
    // Already answered elsewhere — nothing to redo.
    return { ok: true, marked: 0, score: null, previousScore: null };
  }

  // Only tasks this check-in actually asked about may be answered.
  const asked = new Set(
    ((checkin.data.questions ?? []) as CheckinQuestion[]).map(
      (q) => q.taskId,
    ),
  );
  const answers = parsed.data.answers.filter((a) => asked.has(a.taskId));

  let marked = 0;
  let markedTitles: string[] = [];
  const yesIds = answers.filter((a) => a.done).map((a) => a.taskId);

  if (yesIds.length > 0) {
    const rows = await supabase
      .from("roadmap_tasks")
      .select("id, title, done")
      .in("id", yesIds)
      .eq("user_id", user.id);
    if (rows.error) return fail("That didn't save. Try again.");

    const toMark = (rows.data ?? []).filter((row) => !row.done);
    if (toMark.length > 0) {
      const updated = await supabase
        .from("roadmap_tasks")
        .update({ done: true, done_at: new Date().toISOString() })
        .in(
          "id",
          toMark.map((row) => row.id),
        )
        .eq("user_id", user.id);
      if (updated.error) return fail("That didn't save. Try again.");
      marked = toMark.length;
      markedTitles = toMark.map((row) => row.title);
    }
  }

  // Complete the check-in whatever was answered — it is never re-asked.
  await supabase
    .from("checkins")
    .update({ answers, completed_at: new Date().toISOString() })
    .eq("id", checkin.data.id)
    .eq("user_id", user.id);

  let score: number | null = null;
  let previousScore: number | null = null;

  if (marked > 0) {
    try {
      const [cv, { tasks }, latestScore] = await Promise.all([
        fetchCurrentCV(supabase, user.id),
        fetchActiveTasks(supabase, user.id),
        fetchLatestScore(supabase, user.id),
      ]);
      previousScore = latestScore;
      if (cv) {
        score = Math.max(latestScore ?? 0, computeScore(cv, tasks));
        const reason =
          markedTitles.length === 1
            ? markedTitles[0]
            : `${markedTitles.length} waypoints confirmed at check-in`;
        await supabase.from("cv_versions").insert({
          user_id: user.id,
          snapshot: cv,
          score,
          reason,
        });
      }
    } catch {
      // The tasks are marked — progress is saved even if the snapshot isn't.
      score = null;
    }
    revalidatePath("/", "layout");
  }

  return { ok: true, marked, score, previousScore };
}
