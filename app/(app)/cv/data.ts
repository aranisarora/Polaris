import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CVData,
  CVLine,
  QuestionnaireAnswers,
  RoadmapTask,
  TaskCategory,
} from "@/lib/types";
import { questionnaireToCV } from "@/lib/cvdiff";

/** Raw roadmap_tasks row shape (supabase/schema.sql). */
export interface RoadmapTaskRow {
  id: string;
  position: number;
  title: string;
  why: string;
  category: string;
  effort: string;
  done: boolean;
  done_at: string | null;
  first_week: boolean;
  cv_line: CVLine | null;
}

export const TASK_COLUMNS =
  "id, position, title, why, category, effort, done, done_at, first_week, cv_line";

export function taskRowToTask(row: RoadmapTaskRow): RoadmapTask {
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    why: row.why,
    category: row.category as TaskCategory,
    effort: row.effort,
    done: row.done,
    doneAt: row.done_at,
    firstWeek: row.first_week,
    cvLine: row.cv_line,
  };
}

/** All tasks of the active roadmap, ordered by position. [] when no roadmap. */
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
    tasks: (rows.data as RoadmapTaskRow[]).map(taskRowToTask),
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
