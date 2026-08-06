import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Checkin, CheckinQuestion } from "@/lib/types";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * Check-in due-ness, computed by app/(app)/layout.tsx on app open
 * (docs/CONTRACTS.md): due when the latest checkin `asked_at` is older than
 * 48h (or none exists) AND the active roadmap has at least one open task
 * AND the active roadmap itself is older than 48h — the first check-in
 * earns its name ("while you were away") instead of interrupting a
 * seconds-old route. When due, creates the checkins row (≤3 questions from
 * the oldest open tasks) and returns it for <CheckInGate>. Any failure
 * returns null — a check-in must never block or break the shell.
 */
export async function getDueCheckin(
  supabase: SupabaseClient,
  userId: string,
): Promise<Checkin | null> {
  try {
    const latest = await supabase
      .from("checkins")
      .select("asked_at")
      .eq("user_id", userId)
      .order("asked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) return null;
    if (
      latest.data &&
      Date.now() - new Date(latest.data.asked_at).getTime() <
        FORTY_EIGHT_HOURS_MS
    ) {
      return null;
    }

    const roadmap = await supabase
      .from("roadmaps")
      .select("id, generated_at")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle();
    if (roadmap.error || !roadmap.data) return null;

    // The route itself must be at least 48h old — never interrupt the
    // generation moment the user just watched.
    const roadmapAge =
      Date.now() - new Date(roadmap.data.generated_at).getTime();
    if (!Number.isFinite(roadmapAge) || roadmapAge < FORTY_EIGHT_HOURS_MS) {
      return null;
    }

    const tasks = await supabase
      .from("roadmap_tasks")
      .select("id, title")
      .eq("roadmap_id", roadmap.data.id)
      .eq("done", false)
      .order("position", { ascending: true })
      .limit(3);
    if (tasks.error || !tasks.data || tasks.data.length === 0) return null;

    const questions: CheckinQuestion[] = tasks.data.map((task) => ({
      taskId: task.id,
      question: `Have you finished '${task.title}'?`,
    }));

    // Re-check due-ness right before insert: two simultaneous app opens can
    // both pass the check above; the second sees the first's fresh row here
    // and backs off instead of double-asking.
    const recheck = await supabase
      .from("checkins")
      .select("asked_at")
      .eq("user_id", userId)
      .order("asked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recheck.error) return null;
    if (
      recheck.data &&
      Date.now() - new Date(recheck.data.asked_at).getTime() <
        FORTY_EIGHT_HOURS_MS
    ) {
      return null;
    }

    const inserted = await supabase
      .from("checkins")
      .insert({ user_id: userId, questions })
      .select("id, asked_at, questions, completed_at")
      .single();
    if (inserted.error || !inserted.data) return null;

    return {
      id: inserted.data.id,
      askedAt: inserted.data.asked_at,
      questions: inserted.data.questions as CheckinQuestion[],
      completedAt: inserted.data.completed_at,
    };
  } catch {
    return null;
  }
}
