"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { WaypointGlyph, type WaypointState } from "@/components/ui";
import {
  countRows,
  formatDuration,
  formatRowCount,
  formatWeekRange,
  type Schedule,
  type ScheduleWeek,
} from "@/lib/schedule";
import type { RoadmapTask } from "@/lib/types";
import { TaskCard } from "./TaskCard";

/**
 * The whole route, week by week, top to bottom. A multi-week plan is
 * irreducibly complex and this view refuses to pretend otherwise — but it
 * opens at one week, not eleven.
 *
 * Every week is a disclosure whose default follows the schedule: past and
 * future weeks read as one summary line, the current week is open and marked.
 * Inside it only the current task shows its steps, which is what keeps the
 * count of checkable rows on screen at six or fewer however long the plan is.
 */

export interface WholePlanProps {
  /** The plan's calendar from `buildSchedule()`. Never recomputed here. */
  schedule: Schedule;
  /** First unfinished task in the whole plan; marks the current waypoint. */
  currentTaskId: string | null;
  onToggleTask: (taskId: string, done: boolean) => void;
  onToggleStep: (stepId: string, done: boolean) => void;
  /** Task whose toggle is in flight. */
  pendingTaskId?: string | null;
  /** Step whose toggle is in flight. */
  pendingStepId?: string | null;
  /** Task whose waypoint should flare (just completed). */
  flareTaskId?: string | null;
  /**
   * Task to open to — the `#task-…` deep link /cv points at a CV line's
   * source. Its week opens and it unpacks its own steps. The switch that owns
   * this panel has to read the hash anyway to select the right view, so the
   * target arrives as a prop rather than being read a second time down here.
   */
  focusTaskId?: string | null;
  className?: string;
}

/** What a collapsed week says about itself. Never "overdue", never a count of failures. */
function summarize(week: ScheduleWeek, isPast: boolean): string {
  if (week.tasks.length === 0) return "Nothing due";

  const open = week.tasks.filter((task) => !task.done).length;
  if (open === 0) return "All done";
  if (isPast) return `${open} still open`;

  const count = `${week.tasks.length} ${week.tasks.length === 1 ? "task" : "tasks"}`;
  return `${count} · ${formatDuration(week.hours * 60)}`;
}

function glyphState(week: ScheduleWeek, isCurrent: boolean): WaypointState {
  if (week.tasks.length > 0 && week.tasks.every((task) => task.done)) return "done";
  return isCurrent ? "current" : "pending";
}

export function WholePlan({
  schedule,
  currentTaskId,
  onToggleTask,
  onToggleStep,
  pendingTaskId = null,
  pendingStepId = null,
  flareTaskId = null,
  focusTaskId = null,
  className,
}: WholePlanProps) {
  const panelPrefix = React.useId();

  /**
   * The plan's own progress, in the plan's own unit. It reads here rather than
   * in the page header because "This week" ends with the same reading against
   * one week's denominator: side by side and unscoped, the smaller number read
   * as the larger one mislabelled, and the header line has no room left to say
   * which is which ("Your roadmap" spends 208 of a 375px phone's 343px). The
   * switch keeps these two panels mutually exclusive, so the two readings are
   * never on screen together and each names its own run.
   */
  const rows = React.useMemo(
    () => countRows(schedule.weeks.flatMap((week) => week.tasks)),
    [schedule.weeks],
  );

  const focusWeekIndex =
    schedule.weeks.find((week) => week.tasks.some((task) => task.id === focusTaskId))
      ?.index ?? null;

  // Open state is an override on top of the schedule, never a copy of it: the
  // default follows wherever the plan says you are, so a re-plan that moves the
  // current week is picked up for free, and a week the user opened or closed by
  // hand keeps whatever they chose.
  const [overrides, setOverrides] = React.useState<Record<number, boolean>>({});
  const isOpen = (index: number) =>
    overrides[index] ?? (index === schedule.currentWeekIndex || index === focusWeekIndex);

  function stateFor(task: RoadmapTask) {
    if (task.done) return "done" as const;
    return task.id === currentTaskId ? ("current" as const) : ("pending" as const);
  }

  if (schedule.weeks.length === 0) {
    return (
      <p className={cn("text-sm leading-relaxed text-moonlight", className)}>
        This plan has no tasks yet.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Not a kicker: it is a reading of the list it stands on, in the same
          mono the week rows below it are set in, and the hairline under the
          first of them separates the two. Its opposite number in "This week"
          reads after the cards instead, where it can sit with its bar; there
          is no bar here, because an eleven-week plan moves one a fortnight. */}
      {rows.total > 0 && (
        <p className="mono-label text-moonlight">
          {rows.done} of {formatRowCount(rows.total, rows.unit)} on the plan
        </p>
      )}
      <ol className="flex list-none flex-col divide-y">
        {schedule.weeks.map((week) => {
          const isCurrent = week.index === schedule.currentWeekIndex;
          const isPast = week.index < schedule.currentWeekIndex;
          const open = isOpen(week.index);
          const panelId = `${panelPrefix}-week-${week.index}`;

          const heading = (
            <>
              <WaypointGlyph
                size={12}
                state={glyphState(week, isCurrent)}
                className="mt-0.5 shrink-0"
              />
              <span className="mono-label flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span
                  className={cn(
                    "whitespace-nowrap",
                    isCurrent ? "text-starlight" : "text-moonlight",
                  )}
                >
                  Week {week.index + 1} ·{" "}
                  {formatWeekRange(week.start, week.end, schedule.today)}
                </span>
                {isCurrent && (
                  <span className="whitespace-nowrap text-gold">This week</span>
                )}
                {/* ml-auto keeps the summary on the right of the same line, and
                    lets it drop to its own right-aligned line on a phone. */}
                <span className="ml-auto whitespace-nowrap text-moonlight">
                  {summarize(week, isPast)}
                </span>
              </span>
            </>
          );

          return (
            <li key={week.index} className="py-1">
              {week.tasks.length === 0 ? (
                // An empty week is a real reading, not a broken affordance: a
                // task is filed under the week its last hour falls in, so a long
                // first task leaves the weeks before it clear. Nothing to open.
                <div className="flex min-h-11 items-start gap-3 px-2 py-3">{heading}</div>
              ) : (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() =>
                    setOverrides((current) => ({ ...current, [week.index]: !open }))
                  }
                  className="flex min-h-11 w-full items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors duration-150 hover:bg-veil/20"
                >
                  {heading}
                  <ChevronDown
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden
                    className={cn(
                      "mt-0.5 shrink-0 text-moonlight transition-transform duration-150",
                      open && "rotate-180",
                    )}
                  />
                </button>
              )}

              {/* `hidden` sits on a bare wrapper: a display utility on the list
                  itself would out-rank the UA rule and leave it on screen. */}
              <div id={panelId} hidden={!open || week.tasks.length === 0}>
                <ol className="flex list-none flex-col gap-4 pb-4 pt-1">
                  {week.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      state={stateFor(task)}
                      pending={pendingTaskId === task.id}
                      flare={flareTaskId === task.id}
                      onToggle={onToggleTask}
                      onToggleStep={onToggleStep}
                      pendingStepId={pendingStepId}
                      // Only the current task (or the one that was linked to)
                      // unpacks itself, so the rows on screen stay under
                      // Miller's ceiling at any plan length.
                      defaultExpanded={task.id === currentTaskId || task.id === focusTaskId}
                      // This view holds every task exactly once, so it is the one
                      // that carries the anchor /cv deep-links to.
                      anchor
                    />
                  ))}
                </ol>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
