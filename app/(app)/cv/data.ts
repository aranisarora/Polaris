import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CVData,
  CVLine,
  QuestionnaireAnswers,
  RoadmapStep,
  RoadmapTask,
  TaskCategory,
} from "@/lib/types";
import { questionnaireToCV } from "@/lib/cvdiff";
import { defaultHours } from "@/lib/schedule";

/** Raw roadmap_tasks row shape (supabase/schema.sql). */
export interface RoadmapTaskRow {
  id: string;
  position: number;
  title: string;
  why: string;
  category: string;
  effort: string;
  /** numeric(5,2), null on tasks written before the plan carried dates. */
  estimate_hours: number | string | null;
  done: boolean;
  done_at: string | null;
  first_week: boolean;
  cv_line: CVLine | null;
}

/** Raw roadmap_steps row. `task_id` rides along so rows can be grouped. */
export interface RoadmapStepRow {
  id: string;
  task_id: string;
  position: number;
  title: string;
  detail: string;
  minutes: number;
  done: boolean;
  done_at: string | null;
}

export const TASK_COLUMNS =
  "id, position, title, why, category, effort, estimate_hours, done, done_at, first_week, cv_line";

export const STEP_COLUMNS =
  "id, task_id, position, title, detail, minutes, done, done_at";

/**
 * The hours the schedule is built from. `estimate_hours` is nullable on
 * purpose — a task drawn before dates existed never had an honest number — and
 * PostgREST can hand a `numeric` back as a string, so both cases fall to the
 * category default rather than dropping the task out of the calendar.
 */
function readEstimateHours(
  value: RoadmapTaskRow["estimate_hours"],
  category: TaskCategory,
): number {
  const hours = typeof value === "string" ? Number(value) : value;
  return typeof hours === "number" && Number.isFinite(hours) && hours > 0
    ? hours
    : defaultHours(category);
}

export function stepRowToStep(row: RoadmapStepRow): RoadmapStep {
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    detail: row.detail ?? "",
    minutes: row.minutes,
    done: row.done,
    doneAt: row.done_at,
  };
}

/**
 * Steps keyed by their parent task, each list in position order. Sorted here
 * rather than trusted from the query, so the order a checklist reads in never
 * depends on the order rows came back.
 */
export function groupStepsByTask(
  rows: RoadmapStepRow[],
): Map<string, RoadmapStep[]> {
  const byTask = new Map<string, RoadmapStep[]>();
  for (const row of [...rows].sort((a, b) => a.position - b.position)) {
    const list = byTask.get(row.task_id);
    if (list) list.push(stepRowToStep(row));
    else byTask.set(row.task_id, [stepRowToStep(row)]);
  }
  return byTask;
}

/**
 * `steps` is a required argument, not a defaulted one: `rows.map(taskRowToTask)`
 * would silently pass the array index as the second parameter. Readers that
 * don't need the checklist — /cv works off `cvLine` — pass [].
 */
export function taskRowToTask(
  row: RoadmapTaskRow,
  steps: RoadmapStep[],
): RoadmapTask {
  const category = row.category as TaskCategory;
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    why: row.why,
    category,
    effort: row.effort,
    estimateHours: readEstimateHours(row.estimate_hours, category),
    steps,
    done: row.done,
    doneAt: row.done_at,
    firstWeek: row.first_week,
    cvLine: row.cv_line,
  };
}

/**
 * All tasks of the active roadmap, ordered by position. [] when no roadmap.
 * Steps are deliberately not read: every caller here scores or renders whole
 * tasks, and the checklist is only ever needed on /roadmap.
 */
export async function fetchActiveTasks(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ roadmapId: string | null; tasks: RoadmapTask[] }> {
  const roadmap = await supabase
    .from("roadmaps")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (roadmap.error) throw new Error("roadmap query failed");
  if (!roadmap.data) return { roadmapId: null, tasks: [] };

  const rows = await supabase
    .from("roadmap_tasks")
    .select(TASK_COLUMNS)
    .eq("roadmap_id", roadmap.data.id)
    .order("position", { ascending: true });
  if (rows.error) throw new Error("roadmap tasks query failed");

  return {
    roadmapId: roadmap.data.id,
    tasks: (rows.data as RoadmapTaskRow[]).map((row) => taskRowToTask(row, [])),
  };
}

/**
 * The user's current CV. Prefers the parsed/edited `cv_structured`; falls
 * back to a deterministic CVData built from questionnaire answers; null when
 * the profile phase never finished.
 */
export async function fetchCurrentCV(
  supabase: SupabaseClient,
  userId: string,
): Promise<CVData | null> {
  const [career, profile] = await Promise.all([
    supabase
      .from("career_profiles")
      .select("cv_structured, questionnaire")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  if (career.error) throw new Error("career profile query failed");

  if (career.data?.cv_structured) return career.data.cv_structured as CVData;
  if (career.data?.questionnaire) {
    // Never present the account email as the user's name — the email
    // belongs in the contact line (basics.email), and DiffView/pdf already
    // handle a blank name gracefully.
    return questionnaireToCV(
      career.data.questionnaire as QuestionnaireAnswers,
      profile.data?.full_name ?? null,
      profile.data?.email ?? null,
    );
  }
  return null;
}

/** Score of the most recent cv_versions row — the never-decrease baseline. */
export async function fetchLatestScore(
  supabase: SupabaseClient,
  userId: string,
): Promise<number | null> {
  const latest = await supabase
    .from("cv_versions")
    .select("score")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) throw new Error("cv versions query failed");
  return latest.data?.score ?? null;
}
