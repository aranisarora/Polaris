"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { computeScore } from "@/lib/score";
import type { CVData, RoadmapTask } from "@/lib/types";

/**
 * Roadmap server actions (docs/CONTRACTS.md):
 * toggleTask — update the task, snapshot cv_versions (reason = task title),
 * score = max(previousScore, computeScore(...)) — the score NEVER decreases,
 * including when a task is un-done.
 */

const ToggleInput = z.object({
  taskId: z.string().uuid(),
  done: z.boolean(),
});

export type ToggleTaskResult =
  | { ok: true; score: number; delta: number }
  | { ok: false; error: string };

const EMPTY_CV: CVData = {
  basics: { name: "", links: [] },
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

export async function toggleTask(input: {
  taskId: string;
  done: boolean;
}): Promise<ToggleTaskResult> {
  const parsed = ToggleInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That change couldn't be read. Try again." };
  }
  const { taskId, done } = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session has ended. Sign in to continue." };
  }

  // 1. Update the task (RLS + explicit user filter enforce ownership).
  const { data: task, error: updateError } = await supabase
    .from("roadmap_tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", taskId)
    .eq("user_id", user.id)
    .select("id, roadmap_id, title")
    .single();

  if (updateError || !task) {
    return {
      ok: false,
      error: "The waypoint couldn't be updated. Your route is unchanged — try again.",
    };
  }

  // 2. Recompute the readiness score from the whole roadmap.
  const [tasksRes, profileRes, latestRes] = await Promise.all([
    supabase
      .from("roadmap_tasks")
      .select("id, position, title, why, category, effort, done, done_at, first_week, cv_line")
      .eq("roadmap_id", task.roadmap_id)
      .eq("user_id", user.id)
      .order("position", { ascending: true }),
    supabase
      .from("career_profiles")
      .select("cv_structured")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("cv_versions")
      .select("score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const taskRows = tasksRes.data ?? [];
  const tasks: RoadmapTask[] = taskRows.map((row) => ({
    id: row.id as string,
    position: row.position as number,
    title: row.title as string,
    why: row.why as string,
    category: row.category as RoadmapTask["category"],
    effort: row.effort as string,
    done: Boolean(row.done),
    doneAt: (row.done_at as string | null) ?? null,
    firstWeek: Boolean(row.first_week),
    cvLine: (row.cv_line as RoadmapTask["cvLine"]) ?? null,
  }));

  const cv = (profileRes.data?.cv_structured as CVData | null) ?? EMPTY_CV;
  const previousScore = (latestRes.data?.score as number | undefined) ?? 0;
  const computed = computeScore(cv, tasks);
  const score = Math.max(previousScore, computed); // never decreases

  // 3. Snapshot a cv_versions row (reason = task title, per contract).
  // Reopening is named as such so the Chart revisions list never shows two
  // identical entries for a task completed and then reopened.
  const { error: versionError } = await supabase.from("cv_versions").insert({
    user_id: user.id,
    snapshot: cv,
    score,
    reason: done ? task.title : `Reopened: ${task.title}`,
  });
  if (versionError) {
    // The toggle itself succeeded; the score record just didn't advance.
    revalidatePath("/roadmap");
    revalidatePath("/cv");
    return { ok: true, score: previousScore, delta: 0 };
  }

  revalidatePath("/roadmap");
  revalidatePath("/cv");

  return { ok: true, score, delta: Math.max(0, score - previousScore) };
}
