"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { computeScore } from "@/lib/score";
import {
  TASK_COLUMNS,
  taskRowToTask,
  type RoadmapTaskRow,
} from "@/app/(app)/cv/data";
import type { CVData } from "@/lib/types";

/**
 * Roadmap server actions (docs/CONTRACTS.md):
 * toggleTask — update the task, snapshot cv_versions (reason = task title),
 * score = max(previousScore, computeScore(...)) — the score NEVER decreases,
 * including when a task is un-done.
 * toggleStep — the same, one sitting at a time: closing the last open step of
 * a task closes the task itself and takes the same snapshot.
 * replanFromToday / changePace — dates only. Both rewrite a single column and
 * cost no AI call, which is the whole reason the calendar is computed in
 * lib/schedule.ts rather than generated. replanFromToday takes the caller's
 * own `YYYY-MM-DD` so "today" means the user's day, not the server's. Both
 * find their row through `resolveRoadmapId`, which resolves the roadmap the
 * same way the page renders it rather than trusting the `active` flag.
 *
 * Every calendar DAY this file writes is a local day — `toISOString()` reads
 * UTC and belongs only on the `done_at` timestamps, which are instants.
 */

const ToggleInput = z.object({
  taskId: z.string().uuid(),
  done: z.boolean(),
});

const StepInput = z.object({
  stepId: z.string().uuid(),
  done: z.boolean(),
});

const PaceInput = z.object({
  hoursPerWeek: z.number(),
});

const ReplanInput = z.object({
  /**
   * The caller's own calendar day as `YYYY-MM-DD`, already resolved on their
   * clock. Optional: an older client sends nothing and the server's local day
   * stands in. Shape is checked here, plausibility in `resolveStartDate`.
   */
  today: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => isRealDay(value), "not a day on the calendar")
    .optional(),
});

export type ToggleTaskResult =
  | { ok: true; score: number; delta: number }
  | { ok: false; error: string };

export type ToggleStepResult =
  | {
      ok: true;
      /** Parent of the toggled step, so the view knows what to redraw. */
      taskId: string;
      /** True when this step was the last one open and closed its task. */
      taskCompleted: boolean;
      score: number;
      delta: number;
    }
  | { ok: false; error: string };

export type ReplanResult =
  | { ok: true; startDate: string }
  | { ok: false; error: string };

export type ChangePaceResult =
  | { ok: true; hoursPerWeek: number }
  | { ok: false; error: string };

/**
 * The two date-only failures. Each is written once and returned from both the
 * "no row to write to" and the "write refused" branch — the user is told the
 * same true thing (nothing moved, try again) whichever way it went.
 */
const MSG_REPLAN_FAILED =
  "Your dates couldn't be moved. Your roadmap is unchanged — try again.";
const MSG_PACE_FAILED =
  "Your pace couldn't be changed. Your roadmap is unchanged — try again.";

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
      error: "That step couldn't be updated. Your roadmap is unchanged — try again.",
    };
  }

  // 2 & 3. Recompute from the whole roadmap and snapshot a cv_versions row.
  // Reopening is named as such so the Chart revisions list never shows two
  // identical entries for a task completed and then reopened.
  const { score, previousScore, recorded } = await recordScore(
    supabase,
    user.id,
    task.roadmap_id as string,
    done ? (task.title as string) : `Reopened: ${task.title}`,
  );

  revalidatePath("/roadmap");
  revalidatePath("/cv");

  // The toggle itself succeeded; the score record just didn't advance.
  if (!recorded) return { ok: true, score: previousScore, delta: 0 };

  return { ok: true, score, delta: Math.max(0, score - previousScore) };
}

/**
 * Check or un-check one sitting inside a task.
 *
 * Checking the last open step finishes the task — the user has done the work,
 * so making them tick a second box would be asking twice. Un-checking one
 * never walks that back: the task stays complete and the score holds. The
 * never-decrease rule is absolute, and reopening a single sitting is not a
 * claim that the work was undone.
 */
export async function toggleStep(input: {
  stepId: string;
  done: boolean;
}): Promise<ToggleStepResult> {
  const parsed = StepInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That change couldn't be read. Try again." };
  }
  const { stepId, done } = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session has ended. Sign in to continue." };
  }

  const { data: step, error: updateError } = await supabase
    .from("roadmap_steps")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", stepId)
    .eq("user_id", user.id)
    .select("id, task_id")
    .single();

  if (updateError || !step) {
    return {
      ok: false,
      error: "That step couldn't be updated. Your roadmap is unchanged — try again.",
    };
  }

  const taskId = step.task_id as string;
  const completion = done
    ? await completeParentIfFinished(supabase, user.id, taskId)
    : null;

  revalidatePath("/roadmap");
  // Only a finished task writes a CV line, so only that path can move /cv.
  if (completion) revalidatePath("/cv");

  return {
    ok: true,
    taskId,
    taskCompleted: completion !== null,
    score: completion?.score ?? (await latestScore(supabase, user.id)),
    delta: completion?.delta ?? 0,
  };
}

/**
 * Re-date the plan from today. One column, no AI call, no Gemini quota — the
 * tasks, their order and their estimates are all untouched, and lib/schedule.ts
 * re-flows the calendar on the next read. Without this every plan rots within
 * a fortnight of the first slow week.
 *
 * "Today" is the USER'S day, so the browser resolves it and passes it in. The
 * control promises the dates run from today; a server on UTC deciding that for
 * someone in Los Angeles at 17:00 would write tomorrow and open the plan on a
 * week that has not started. The argument is optional — a caller that sends
 * nothing gets the server's own local day, which is still the same clock
 * app/api/roadmap/generate/route.ts writes `start_date` from.
 */
export async function replanFromToday(input?: {
  today?: string;
}): Promise<ReplanResult> {
  const parsed = ReplanInput.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: "That date couldn't be read. Try again." };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session has ended. Sign in to continue." };
  }

  const roadmapId = await resolveRoadmapId(supabase, user.id);
  if (!roadmapId) return { ok: false, error: MSG_REPLAN_FAILED };

  const startDate = resolveStartDate(parsed.data.today);
  const { data, error } = await supabase
    .from("roadmaps")
    .update({ start_date: startDate })
    .eq("id", roadmapId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, error: MSG_REPLAN_FAILED };

  revalidatePath("/roadmap");
  return { ok: true, startDate };
}

/**
 * Change the weekly capacity the dates are divided by. Also free — a pace
 * change is the same re-flow as a re-plan, from the other input.
 */
export async function changePace(input: {
  hoursPerWeek: number;
}): Promise<ChangePaceResult> {
  const parsed = PaceInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That pace couldn't be read. Try again." };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session has ended. Sign in to continue." };
  }

  // Clamp rather than reject, per the convention in lib/gemini/prompts/cv.ts:
  // an hour outside the offered cards is still a plan we can date honestly.
  // The column carries no check constraint, so this is the only guard.
  const hoursPerWeek = Math.min(
    60,
    Math.max(1, Math.round(parsed.data.hoursPerWeek)),
  );

  const roadmapId = await resolveRoadmapId(supabase, user.id);
  if (!roadmapId) return { ok: false, error: MSG_PACE_FAILED };

  const { data, error } = await supabase
    .from("roadmaps")
    .update({ hours_per_week: hoursPerWeek })
    .eq("id", roadmapId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, error: MSG_PACE_FAILED };

  revalidatePath("/roadmap");
  return { ok: true, hoursPerWeek };
}

// ------------------------------------------------------------------ helpers

/**
 * The roadmap a date-only write belongs to — resolved exactly the way
 * `RoadmapPage` resolves the one it renders, so the write side can always
 * address the row the user is looking at.
 *
 * The `active` flag alone is not enough to find it. Generation flips actives
 * in two statements (deactivate, then activate) and a cut between them leaves
 * the user owning roadmaps with none flagged; the page then adopts the newest
 * roadmap of the locked target that has tasks and re-flags it — best effort,
 * and that flip can itself fail. Matching on `active = true` here would miss
 * that row, and "Change pace" and "Re-plan from today" would fail on a plan
 * the page had just drawn, with no route to recovery from the UI. So the same
 * resolution runs on both sides: active if there is one, otherwise the newest
 * roadmap of this target that has work in it.
 *
 * The staleness rule is the page's too — a roadmap counts only while its
 * `target_id` is the destination locked right now. A route drawn for a
 * previous target is never re-dated here; it is redrawn on /roadmap.
 *
 * Every read is scoped by `user_id` as well as by RLS, which is the rule the
 * rest of this file follows: the policy is the second lock, not the only one.
 */
async function resolveRoadmapId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const [targetRes, activeRes] = await Promise.all([
    supabase
      .from("locked_targets")
      .select("id")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("roadmaps")
      .select("id, target_id")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle(),
  ]);

  const targetId = targetRes.data?.id as string | undefined;
  if (!targetId) return null;

  const active = activeRes.data as { id: string; target_id: string } | null;
  if (active) return active.target_id === targetId ? active.id : null;

  // Nothing active: the interrupted-flip case. Newest first, a handful deep —
  // anything older than a few redraws is not a candidate for recovery.
  const { data } = await supabase
    .from("roadmaps")
    .select("id")
    .eq("user_id", userId)
    .eq("target_id", targetId)
    .order("generated_at", { ascending: false })
    .limit(5);

  const rows = (data ?? []) as Array<{ id: string }>;
  if (rows.length === 0) return null;

  // A zero-task roadmap is an interrupted write, not a plan — the page won't
  // render one, so this must not date one either.
  const { data: taskRows } = await supabase
    .from("roadmap_tasks")
    .select("roadmap_id")
    .in(
      "roadmap_id",
      rows.map((row) => row.id),
    )
    .eq("user_id", userId);

  const populated = new Set(
    (taskRows ?? []).map((row) => row.roadmap_id as string),
  );
  return rows.find((row) => populated.has(row.id))?.id ?? null;
}

/**
 * Close the parent task when the step just checked was its last one open.
 * Returns null when nothing changed — steps still open, the task was already
 * finished (re-checking must never write a second cv_versions row), or the
 * write failed, in which case the step toggle itself still stands.
 */
async function completeParentIfFinished(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<{ score: number; delta: number } | null> {
  const [taskRes, stepsRes] = await Promise.all([
    supabase
      .from("roadmap_tasks")
      .select("id, roadmap_id, title, done")
      .eq("id", taskId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("roadmap_steps")
      .select("done")
      .eq("task_id", taskId)
      .eq("user_id", userId),
  ]);

  const task = taskRes.data;
  const steps = stepsRes.data ?? [];
  if (!task || task.done) return null;
  if (steps.length === 0 || steps.some((row) => !row.done)) return null;

  const { error } = await supabase
    .from("roadmap_tasks")
    .update({ done: true, done_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId);
  if (error) return null;

  const { score, previousScore, recorded } = await recordScore(
    supabase,
    userId,
    task.roadmap_id as string,
    task.title as string,
  );

  return recorded
    ? { score, delta: Math.max(0, score - previousScore) }
    : { score: previousScore, delta: 0 };
}

/**
 * The score write every completion path shares: recompute from the whole
 * roadmap, keep the higher of stored and computed, snapshot a cv_versions row.
 * `reason` is what the Chart's revisions list reads back, so it names the task.
 */
async function recordScore(
  supabase: SupabaseClient,
  userId: string,
  roadmapId: string,
  reason: string,
): Promise<{ score: number; previousScore: number; recorded: boolean }> {
  const [tasksRes, profileRes, previousScore] = await Promise.all([
    supabase
      .from("roadmap_tasks")
      .select(TASK_COLUMNS)
      .eq("roadmap_id", roadmapId)
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("career_profiles")
      .select("cv_structured")
      .eq("user_id", userId)
      .maybeSingle(),
    latestScore(supabase, userId),
  ]);

  // Steps are not read: computeScore weights whole tasks by category, and the
  // score staying task-weighted is what keeps /cv and /roadmap agreeing.
  const tasks = ((tasksRes.data ?? []) as RoadmapTaskRow[]).map((row) =>
    taskRowToTask(row, []),
  );

  const cv = (profileRes.data?.cv_structured as CVData | null) ?? EMPTY_CV;
  const score = Math.max(previousScore, computeScore(cv, tasks)); // never decreases

  const { error } = await supabase.from("cv_versions").insert({
    user_id: userId,
    snapshot: cv,
    score,
    reason,
  });

  return { score, previousScore, recorded: !error };
}

/** The stored score, so every result carries a number the view can trust. */
async function latestScore(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("cv_versions")
    .select("score")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.score as number | undefined) ?? 0;
}

/**
 * A date as `YYYY-MM-DD` on the LOCAL clock — never `toISOString()`, which
 * reads UTC and names yesterday for every user west of Greenwich after their
 * afternoon. Built exactly the way app/api/roadmap/generate/route.ts builds
 * `start_date`, so a re-plan and a freshly drawn roadmap can never disagree
 * about which day the plan starts.
 */
function localDayISO(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** True when `YYYY-MM-DD` names a day that exists — 2026-02-30 does not. */
function isRealDay(iso: string): boolean {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** The same day shifted by whole days, still on the local clock. */
function shiftDay(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return localDayISO(new Date(year, month - 1, day + days));
}

/**
 * Day one of the re-planned calendar.
 *
 * The client's day is used when it sends one, but it is not taken on trust:
 * real time zones span UTC-12 to UTC+14, so an honest browser is at most one
 * day either side of the server. Anything further out is clamped to that
 * window rather than refused — the user asked for today, and the nearest day
 * we can defend is still today. Comparison is lexicographic, which for
 * fixed-width `YYYY-MM-DD` is chronological.
 */
function resolveStartDate(claimed: string | undefined): string {
  const serverDay = localDayISO(new Date());
  if (!claimed) return serverDay;

  const earliest = shiftDay(serverDay, -1);
  const latest = shiftDay(serverDay, 1);
  if (claimed < earliest) return earliest;
  if (claimed > latest) return latest;
  return claimed;
}
