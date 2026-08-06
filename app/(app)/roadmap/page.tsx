import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { guardPhase } from "@/lib/flow";
import { EmptyState, ErrorState, LinkButton } from "@/components/ui";
import { RoadmapScreen } from "@/components/roadmap/RoadmapScreen";
import { RefreshButton } from "@/components/roadmap/RefreshButton";
import {
  STEP_COLUMNS,
  TASK_COLUMNS,
  groupStepsByTask,
  taskRowToTask,
  type RoadmapStepRow,
  type RoadmapTaskRow,
} from "@/app/(app)/cv/data";
import type {
  JobPosting,
  LockedTarget,
  Roadmap,
  RoadmapStep,
  RoadmapTask,
  Tier,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Your roadmap",
};

/** Everything the view needs off a `roadmaps` row. Both reads below share it. */
const ROADMAP_COLUMNS =
  "id, target_id, dream_beyond, start_date, hours_per_week, generated_at";

/** A `roadmaps` row as selected above — there are no generated DB types. */
interface RoadmapRow {
  id: string;
  target_id: string;
  dream_beyond: unknown;
  start_date: unknown;
  hours_per_week: unknown;
  generated_at: string;
}

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

  const [targetRes, roadmapRes, assessRes, scoreRes] = await Promise.all([
    supabase
      .from("locked_targets")
      .select(
        "id, assessment_id, title, company, location, posting, is_dream, dream_beyond, locked_at",
      )
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("roadmaps")
      .select(ROADMAP_COLUMNS)
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle(),
    // Tier of the target's own assessment — it preselects the pace. Cheap
    // columns for the whole set, then the same resolution the generate route
    // uses; a failure here costs a preselection, not the page.
    supabase
      .from("job_assessments")
      .select("id, posting_id, tier, is_dream")
      .eq("user_id", user.id),
    // The never-decrease baseline for the readiness readout (`latestScore` in
    // ./actions.ts reads the same row on write). Missing means nothing earned.
    supabase
      .from("cv_versions")
      .select("score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
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

  // Stored id first, then the dream row, then the posting that was assessed —
  // assessment_id is `on delete set null`, so it can be missing on a target
  // that is still perfectly valid.
  const assessments = assessRes.data ?? [];
  const targetAssessment =
    (targetRow.assessment_id
      ? assessments.find((row) => row.id === targetRow.assessment_id)
      : undefined) ??
    (target.isDream ? assessments.find((row) => row.is_dream) : undefined) ??
    (target.posting
      ? assessments.find((row) => row.posting_id === target.posting?.id)
      : undefined);
  const tier = (targetAssessment?.tier as Tier | undefined) ?? null;

  const storedScore = (scoreRes.data?.score as number | undefined) ?? 0;

  // The active roadmap only counts when it belongs to the ACTIVE target.
  // No active roadmap at all is a different case, and a recoverable one:
  // generation flips actives in two statements (deactivate, then activate),
  // so a connection reset or a maxDuration cut between them leaves the user
  // owning roadmaps with none flagged active. Without the fallback this page
  // would offer to draw a route they already have — stranding their finished
  // waypoints on an inactive row and spending another Gemini slot to recover.
  const activeRow = (roadmapRes.data as RoadmapRow | null) ?? null;
  const roadmapRow: RoadmapRow | null = activeRow
    ? activeRow.target_id === target.id
      ? activeRow
      : null
    : await recoverRoadmap(supabase, user.id, target.id);

  let roadmap: Roadmap | null = null;
  if (roadmapRow) {
    const tasksRes = await supabase
      .from("roadmap_tasks")
      .select(TASK_COLUMNS)
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

    const taskRows = (tasksRes.data ?? []) as RoadmapTaskRow[];

    // Steps come in their own read rather than a nested select: a roadmap
    // drawn before steps existed has none at all, and if this query fails the
    // plan still renders with its dates — only the checklists are missing.
    let stepsByTask = new Map<string, RoadmapStep[]>();
    if (taskRows.length > 0) {
      const stepsRes = await supabase
        .from("roadmap_steps")
        .select(STEP_COLUMNS)
        .in(
          "task_id",
          taskRows.map((row) => row.id),
        )
        .eq("user_id", user.id)
        .order("position", { ascending: true });

      if (!stepsRes.error) {
        stepsByTask = groupStepsByTask((stepsRes.data ?? []) as RoadmapStepRow[]);
      }
    }

    const tasks: RoadmapTask[] = taskRows.map((row) =>
      taskRowToTask(row, stepsByTask.get(row.id) ?? []),
    );

    // Self-healing: an active roadmap with zero TASKS is a stranded partial
    // write (persist interrupted mid-generation). Treat it as "no route" so
    // the generation moment and its retry CTA render instead of a dead-end
    // "0 of 0 waypoints" view.
    //
    // Zero STEPS is not that. Every roadmap drawn before the plan carried
    // steps looks exactly like that, and it must render with its dates —
    // regenerating one would throw away work the user has already done.
    if (tasks.length > 0) {
      roadmap = {
        id: roadmapRow.id,
        targetId: target.id,
        targetTitle: target.title,
        targetCompany: target.company,
        tasks,
        dreamBeyond: (roadmapRow.dream_beyond as string | null) ?? target.dreamBeyond,
        startDate: readStartDate(roadmapRow),
        hoursPerWeek: readHoursPerWeek(roadmapRow.hours_per_week),
        generatedAt: roadmapRow.generated_at,
      };
    }
  }

  return (
    <RoadmapScreen
      target={target}
      initialRoadmap={roadmap}
      tier={tier}
      storedScore={storedScore}
      today={todayISO(new Date())}
    />
  );
}

/**
 * Adopt the newest roadmap of the active target that actually has tasks, and
 * flag it active again.
 *
 * This is the read side of the two-statement active flip in
 * app/api/roadmap/generate/route.ts, and it heals rather than migrates: the
 * only state it will resurrect is a roadmap with work in it, belonging to the
 * destination that is locked right now. A roadmap of a PREVIOUS target stays
 * unadopted — the destination changed, so the route must be redrawn, which is
 * the same staleness rule the active read applies. A roadmap with zero tasks
 * stays unadopted too, for the same reason the caller discards one: it is an
 * interrupted write, not a plan.
 *
 * Reactivation is best effort, and deliberately so: the page renders from the
 * row either way, a failed flip just means the next load recovers again, and
 * the write side reads no flag it could be misled by — `resolveRoadmapId` in
 * ./actions.ts resolves the target roadmap by this same rule.
 */
async function recoverRoadmap(
  supabase: SupabaseClient,
  userId: string,
  targetId: string,
): Promise<RoadmapRow | null> {
  // Newest first, a handful deep: the row we want is the last one generated,
  // and anything older than a few redraws is not a candidate for recovery.
  const { data } = await supabase
    .from("roadmaps")
    .select(ROADMAP_COLUMNS)
    .eq("user_id", userId)
    .eq("target_id", targetId)
    .order("generated_at", { ascending: false })
    .limit(5);

  const rows = (data ?? []) as RoadmapRow[];
  if (rows.length === 0) return null;

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
  const recovered = rows.find((row) => populated.has(row.id));
  if (!recovered) return null;

  // Safe without a deactivate: nothing is active, which is how we got here,
  // and `roadmaps_one_active` only forbids a second one.
  const { error } = await supabase
    .from("roadmaps")
    .update({ active: true })
    .eq("id", recovered.id)
    .eq("user_id", userId);

  // A failed flip costs nothing the user can see: the page renders from
  // `recovered` regardless, and the write side no longer depends on the flag
  // either — `resolveRoadmapId` in ./actions.ts resolves this same row the
  // same way, so pace and re-plan still reach it. Logged rather than swallowed
  // because a flip that keeps failing (RLS, a constraint) is a real signal,
  // and without a line here every load would silently recover forever.
  if (error) {
    console.error("[roadmap] reactivate failed:", error.message);
  }

  return recovered;
}

/**
 * The server's calendar day as local `YYYY-MM-DD` — the first value the client
 * clock renders against, before it has one. Never `toISOString()`, which reads
 * UTC and names yesterday west of Greenwich.
 */
function todayISO(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** The `YYYY-MM-DD` head of a date or timestamp column; null when unreadable. */
function isoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value.trim());
  return match ? match[0] : null;
}

/**
 * Day one of the plan. `start_date` is `not null` once the migration has run;
 * the fallback dates a roadmap from the day it was drawn rather than letting a
 * half-applied schema render every plan as starting today.
 */
function readStartDate(row: { start_date: unknown; generated_at: unknown }): string {
  return isoDate(row.start_date) ?? isoDate(row.generated_at) ?? "";
}

/** Pace as a number the calendar can divide by. The 1–60 range is the write side's. */
function readHoursPerWeek(value: unknown): number {
  const hours = typeof value === "string" ? Number(value) : value;
  return typeof hours === "number" && Number.isFinite(hours) && hours > 0
    ? hours
    : 8;
}
