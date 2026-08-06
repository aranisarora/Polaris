import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { guardPhase } from "@/lib/flow";
import { computeScore } from "@/lib/score";
import { buildDiffLines } from "@/lib/cvdiff";
import type { CVData, CVVersion } from "@/lib/types";
import { ChartFrame, EmptyState, LinkButton, Panel } from "@/components/ui";
import { DiffView, type DiffLineItem } from "@/components/cv/DiffView";
import { ExportButton } from "@/components/cv/ExportButton";
import { ReadinessMeridian } from "@/components/cv/ReadinessMeridian";
import { RefreshOnFocus } from "@/components/cv/RefreshOnFocus";
import { VersionHistory } from "@/components/cv/VersionHistory";
import { fetchActiveTasks, fetchCurrentCV } from "./data";

export const metadata: Metadata = {
  title: "Living CV",
};

function tierCopy(score: number, targetName: string): string {
  if (score >= 85) {
    return `Ready to be seen by ${targetName}-class reviewers.`;
  }
  if (score >= 65) {
    return `Close — ${targetName}-class reviewers would take this chart seriously.`;
  }
  if (score >= 40) {
    return `Underway. Each finished waypoint adds a line ${targetName} expects.`;
  }
  return `An honest start. The route builds what ${targetName} asks for.`;
}

export default async function CvPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const redirectTo = await guardPhase(supabase, user.id, "cv");
  if (redirectTo) redirect(redirectTo);

  const [cv, { roadmapId, tasks }, targetResult, versionsResult] =
    await Promise.all([
      fetchCurrentCV(supabase, user.id),
      fetchActiveTasks(supabase, user.id),
      supabase
        .from("locked_targets")
        .select("title, company")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle(),
      supabase
        .from("cv_versions")
        .select("id, score, reason, created_at, snapshot")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  if (targetResult.error || versionsResult.error) {
    throw new Error("The living CV couldn't be read.");
  }

  const target = targetResult.data;

  // Defensive — the phase guard normally redirects this case to /bearing.
  if (!target) {
    return (
      <EmptyState
        className="mx-auto mt-16 max-w-md"
        title="Your chart is waiting for a destination"
        body="Take your bearing and lock a target — your living CV builds from there."
        action={<LinkButton href="/bearing">Take your bearing</LinkButton>}
      />
    );
  }

  // Defensive — profile phase is complete before this page is reachable.
  if (!cv) {
    return (
      <EmptyState
        className="mx-auto mt-16 max-w-md"
        title="Your chart has no lines yet"
        body="Add your experience so Polaris can plot what you already hold."
        action={<LinkButton href="/profile">Revisit your profile</LinkButton>}
      />
    );
  }

  const versions: CVVersion[] = (versionsResult.data ?? []).map((row) => ({
    id: row.id,
    score: row.score,
    reason: row.reason,
    createdAt: row.created_at,
    snapshot: row.snapshot as CVData,
  }));

  const latestScore = versions[0]?.score ?? null;
  const score = Math.max(latestScore ?? 0, computeScore(cv, tasks));

  const lastPlotted = versions[0]?.createdAt;
  const plottedOn =
    lastPlotted && !Number.isNaN(Date.parse(lastPlotted))
      ? new Date(lastPlotted).toISOString().slice(0, 10)
      : null;

  const titleById = new Map(tasks.map((task) => [task.id, task.title]));
  const lines: DiffLineItem[] = buildDiffLines(cv, tasks).map((line) => ({
    ...line,
    taskTitle: line.taskId ? (titleById.get(line.taskId) ?? null) : null,
  }));

  const hasRoute = roadmapId != null && tasks.length > 0;
  const targetName = target.company?.trim() || target.title?.trim() || "your target";

  return (
    // minmax(0,1fr) column: no single unbreakable token (a pasted URL, a
    // long email) may ever widen the page past the viewport.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
      <RefreshOnFocus />

      <section className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h1 className="font-display text-h1 text-starlight">
            Your living CV
          </h1>
          <p className="mt-3 text-moonlight">
            {hasRoute
              ? "Grey lines are waiting on your route. Finish a waypoint and its line earns its place here."
              : "This chart holds what you've already earned. Draw your route to see the lines it will add."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ExportButton variant={hasRoute ? "primary" : "secondary"} />
          </div>
        </div>

        {/* The instrument names itself from its own frame: the corner
            coordinates carry what used to float above it as an eyebrow, and
            the north star inside carries the destination. Only the honest
            one-line meaning sits outside, in prose, where it belongs. */}
        <div className="mx-auto w-full max-w-[20rem] md:mx-0 md:shrink-0">
          <ChartFrame
            grid
            topLeft="CV readiness"
            topRight="000–100"
            bottomLeft={plottedOn ? `Plotted ${plottedOn}` : undefined}
            contentClassName="px-4 pt-9 pb-9"
          >
            <ReadinessMeridian score={score} targetTitle={target.title ?? ""} />
          </ChartFrame>
          <p className="mt-4 text-sm leading-relaxed text-moonlight">
            {tierCopy(score, targetName)}
          </p>
        </div>
      </section>

      {!hasRoute && (
        <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-prose text-starlight">
            Your destination is locked. Draw your route and the lines it earns
            will chart here — grey until you brighten them.
          </p>
          <LinkButton href="/roadmap" className="shrink-0">
            Draw my route
          </LinkButton>
        </Panel>
      )}

      <div className="max-w-3xl">
        {lines.length === 0 && !cv.basics?.name?.trim() ? (
          <EmptyState
            title="Your chart has no lines yet"
            body="Add your experience so Polaris can plot what you already hold."
            action={
              <LinkButton href="/profile" variant="secondary">
                Revisit your profile
              </LinkButton>
            }
          />
        ) : (
          <DiffView basics={cv.basics} lines={lines} />
        )}
      </div>

      <div className="max-w-3xl">
        <VersionHistory versions={versions} />
      </div>
    </div>
  );
}
