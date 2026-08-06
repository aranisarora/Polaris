"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Button,
  ChartFrame,
  Dialog,
  NorthStarGlyph,
  ProgressRoute,
  useToast,
} from "@/components/ui";
import type { LockedTarget, Roadmap, RoadmapTask } from "@/lib/types";
import { toggleTask } from "@/app/(app)/roadmap/actions";
import { RouteChart } from "./RouteChart";
import { TaskCard } from "./TaskCard";

/**
 * The living roadmap: voyage-track chart (sticky beside the list on
 * desktop, compact on top on mobile), ordered task waypoints with their
 * whys always visible, optimistic done toggles with the ignition flare,
 * and the stepping-stone footer when the target leads toward the dream.
 */

export interface RoadmapViewProps {
  target: LockedTarget;
  roadmap: Roadmap;
  /** Play the route draw-in (arriving fresh from generation). */
  reveal?: boolean;
}

export function RoadmapView({ target, roadmap, reveal = false }: RoadmapViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [tasks, setTasks] = React.useState<RoadmapTask[]>(roadmap.tasks);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [flareId, setFlareId] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const percent = total > 0 ? (doneCount / total) * 100 : 0;
  const currentIndex = tasks.findIndex((t) => !t.done);
  const plottedOn =
    roadmap.generatedAt && !Number.isNaN(Date.parse(roadmap.generatedAt))
      ? new Date(roadmap.generatedAt).toISOString().slice(0, 10)
      : null;

  async function handleToggle(taskId: string, done: boolean) {
    if (pendingId) return;
    const previous = tasks;
    setPendingId(taskId);
    setTasks((current) =>
      current.map((t) =>
        t.id === taskId
          ? { ...t, done, doneAt: done ? new Date().toISOString() : null }
          : t,
      ),
    );
    if (done) setFlareId(taskId);

    const result = await toggleTask({ taskId, done });
    setPendingId(null);

    if (!result.ok) {
      setTasks(previous);
      setFlareId(null);
      toast(result.error, { tone: "error" });
      return;
    }
    if (done) {
      toast(
        result.delta > 0
          ? `+${result.delta} — your chart brightens`
          : "Waypoint ignited — your chart brightens",
        { tone: "success" },
      );
    } else {
      toast("Waypoint reopened. Your score holds — it never falls.");
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", reveal && "animate-fade-up")}>
      {/* voyage header: progress made good */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="text-h1 text-starlight">Your route</h1>
          <p className="mono-label text-gold">
            {doneCount} of {total} waypoints
          </p>
        </div>
        {/* The metaphor keeps its plain reading beside it: a waypoint is one
            thing to finish, and the route is the ordered plan. */}
        <p className="max-w-prose text-sm text-moonlight">
          Your step-by-step plan to {roadmap.targetTitle}. Each waypoint below
          is one thing to finish.
        </p>
        <ProgressRoute percent={percent} waypoints={total} label="Route progress" />
        {doneCount === total && total > 0 && (
          <p className="text-sm text-moonlight">
            Every waypoint is lit. The route to {roadmap.targetTitle} is sailed —
            your CV carries the proof.
          </p>
        )}
      </header>

      {/* locked destination summary */}
      <section
        aria-label="Locked destination"
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border bg-depth p-4 pl-5 shadow-panel"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <NorthStarGlyph size={22} className="shrink-0" />
          {/* No eyebrow: "Destination" reads inside the line it names, and
              the location follows as a readout beneath it, not above. */}
          <div className="min-w-0">
            <p className="font-medium text-starlight">
              <span className="font-normal text-moonlight">Destination — </span>
              {roadmap.targetTitle}
              {roadmap.targetCompany ? (
                <span className="font-normal text-moonlight">
                  {" "}
                  at {roadmap.targetCompany}
                </span>
              ) : null}
            </p>
            {target.location ? (
              <p className="mono-label mt-1.5 text-moonlight">{target.location}</p>
            ) : null}
          </div>
        </div>
        <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
          Change destination
        </Button>
      </section>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Change destination?"
        description={`Locking a new destination replaces this route. The ${doneCount} waypoint${doneCount === 1 ? "" : "s"} you've completed stay on your record — your score never falls.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Stay on course
            </Button>
            <Button onClick={() => router.push("/bearing")}>Take a new bearing</Button>
          </>
        }
      />

      {/* chart + waypoint list */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <ChartFrame
          grid
          topLeft="VOYAGE TRACK"
          topRight={`${doneCount}/${total}`}
          bottomLeft={plottedOn ? `PLOTTED ${plottedOn}` : undefined}
          bottomRight={`${total} WAYPOINTS`}
          className="lg:sticky lg:top-6"
          contentClassName="p-4 pt-8 pb-8 md:p-6 md:pt-9 md:pb-9"
        >
          <RouteChart
            tasks={tasks}
            targetTitle={roadmap.targetTitle}
            reveal={reveal}
            flareTaskId={flareId}
          />
        </ChartFrame>

        <div className="flex flex-col gap-4">
          <ol className="flex list-none flex-col gap-4">
            {tasks.map((task, i) => (
              <TaskCard
                key={task.id}
                task={task}
                state={task.done ? "done" : i === currentIndex ? "current" : "pending"}
                pending={pendingId === task.id}
                flare={flareId === task.id}
                onToggle={handleToggle}
              />
            ))}
          </ol>

          {/* stepping-stone footer — the dream stays on the chart */}
          {roadmap.dreamBeyond && (
            <aside
              aria-label="Beyond this route"
              className="flex items-start gap-3.5 rounded-xl border border-gold/25 bg-night/60 p-5"
            >
              <NorthStarGlyph size={20} className="mt-1 shrink-0" />
              <p className="text-sm leading-relaxed text-moonlight">
                This route gets you to{" "}
                <span className="text-starlight">{roadmap.targetTitle}</span>. From
                there,{" "}
                <em className="italic text-starlight">{roadmap.dreamBeyond}</em>{" "}
                becomes attainable.
              </p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
