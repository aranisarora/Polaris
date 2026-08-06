import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { guardPhase } from "@/lib/flow";
import { EmptyState, ErrorState, LinkButton } from "@/components/ui";
import { RoadmapScreen } from "@/components/roadmap/RoadmapScreen";
import { RefreshButton } from "@/components/roadmap/RefreshButton";
import type {
  JobPosting,
  LockedTarget,
  Roadmap,
  RoadmapTask,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Your roadmap",
};

/**
 * Phase 4 — /roadmap.
 * Locked target + no route drawn for it → the narrated generation moment.
 * Active roadmap for the current target → the star-chart roadmap view.
 * A roadmap left over from a PREVIOUS target (destination changed, route
 * not yet redrawn) counts as "no route" — the moment offers to draw anew,
 * and generation deactivates the old roadmap on success.
 */
export default async function RoadmapPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const redirectTo = await guardPhase(supabase, user.id, "roadmap");
  if (redirectTo) redirect(redirectTo);

  const [targetRes, roadmapRes] = await Promise.all([
    supabase
      .from("locked_targets")
      .select("id, title, company, location, posting, is_dream, dream_beyond, locked_at")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("roadmaps")
      .select("id, target_id, dream_beyond, generated_at")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle(),
  ]);

  if (targetRes.error || roadmapRes.error) {
    return (
      <ErrorState
        title="Your roadmap couldn't be loaded"
        detail="We couldn't reach it just now. Nothing is lost — your destination and progress are safe."
        action={<RefreshButton>Try again</RefreshButton>}
        className="mx-auto mt-10 max-w-xl"
      />
    );
  }

  const targetRow = targetRes.data;
  if (!targetRow) {
    // guardPhase normally redirects here first; this is the designed fallback.
    return (
      <EmptyState
        title="No destination locked"
        body="Open Matches and lock a destination — your roadmap draws from there."
        action={<LinkButton href="/bearing">See your matches</LinkButton>}
        className="mt-10"
      />
    );
  }

  const target: LockedTarget = {
    id: targetRow.id,
    title: targetRow.title,
    company: targetRow.company,
    location: targetRow.location ?? "",
    posting: (targetRow.posting as JobPosting | null) ?? null,
    isDream: Boolean(targetRow.is_dream),
    dreamBeyond: (targetRow.dream_beyond as string | null) ?? null,
    lockedAt: targetRow.locked_at,
  };

  // The active roadmap only counts when it belongs to the ACTIVE target.
  const roadmapRow =
    roadmapRes.data && roadmapRes.data.target_id === target.id
      ? roadmapRes.data
      : null;

  let roadmap: Roadmap | null = null;
  if (roadmapRow) {
    const tasksRes = await supabase
      .from("roadmap_tasks")
      .select("id, position, title, why, category, effort, done, done_at, first_week, cv_line")
      .eq("roadmap_id", roadmapRow.id)
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (tasksRes.error) {
      return (
        <ErrorState
          title="Your roadmap couldn't be loaded"
          detail="We couldn't reach your steps just now. Nothing is lost — your destination and progress are safe."
          action={<RefreshButton>Try again</RefreshButton>}
          className="mx-auto mt-10 max-w-xl"
        />
      );
    }

    const tasks: RoadmapTask[] = (tasksRes.data ?? []).map((row) => ({
      id: row.id,
      position: row.position,
      title: row.title,
      why: row.why,
      category: row.category as RoadmapTask["category"],
      effort: row.effort,
      done: Boolean(row.done),
      doneAt: (row.done_at as string | null) ?? null,
      firstWeek: Boolean(row.first_week),
      cvLine: (row.cv_line as RoadmapTask["cvLine"]) ?? null,
    }));

    // Self-healing: an active roadmap with zero tasks is a stranded partial
    // write (persist interrupted mid-generation). Treat it as "no route" so
    // the generation moment and its retry CTA render instead of a dead-end
    // "0 of 0 waypoints" view.
    if (tasks.length > 0) {
      roadmap = {
        id: roadmapRow.id,
        targetId: target.id,
        targetTitle: target.title,
        targetCompany: target.company,
        tasks,
        dreamBeyond: (roadmapRow.dream_beyond as string | null) ?? target.dreamBeyond,
        generatedAt: roadmapRow.generated_at,
      };
    }
  }

  return <RoadmapScreen target={target} initialRoadmap={roadmap} />;
}
