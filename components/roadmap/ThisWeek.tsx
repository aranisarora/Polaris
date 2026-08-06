"use client";

import { cn } from "@/lib/cn";
import { Button, LinkButton, NorthStarGlyph, ProgressRoute } from "@/components/ui";
import {
  countRows,
  formatDay,
  formatDuration,
  formatRowCount,
  formatWeekRange,
  type Schedule,
  type ScheduleWeek,
} from "@/lib/schedule";
import type { RoadmapTask } from "@/lib/types";
import { TaskCard } from "./TaskCard";

/**
 * The default view: what to do now. Roughly four visits in five ask only that
 * question, so this is the panel that must land above the fold on a phone —
 * one week's dates, one week's load, and the one or two tasks that are due.
 *
 * Three readings this must never get wrong, and none of them is red:
 * a week with nothing in it (normal — a task is filed under the week its last
 * hour falls in, so leading weeks are often empty), a plan that has slipped
 * (an invitation to re-plan, never an overdue badge), and a plan that is
 * finished.
 */

export interface ThisWeekProps {
  /** The plan's calendar from `buildSchedule()`. Never recomputed here. */
  schedule: Schedule;
  /** The pace the plan was dated at — the "of your 8h" in the readout. */
  hoursPerWeek: number;
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
  /** Re-date the plan from today. Offered only once the plan has slipped. */
  onReplan: () => void;
  /** Re-plan request in flight. */
  replanPending?: boolean;
  className?: string;
}

/** The first unfinished task in a run of weeks, with the week it belongs to. */
function firstOpen(
  weeks: ScheduleWeek[],
): { week: ScheduleWeek; task: RoadmapTask } | null {
  for (const week of weeks) {
    const task = week.tasks.find((candidate) => !candidate.done);
    if (task) return { week, task };
  }
  return null;
}

export function ThisWeek({
  schedule,
  hoursPerWeek,
  currentTaskId,
  onToggleTask,
  onToggleStep,
  pendingTaskId = null,
  pendingStepId = null,
  flareTaskId = null,
  onReplan,
  replanPending = false,
  className,
}: ThisWeekProps) {
  const week = schedule.weeks[schedule.currentWeekIndex];
  const allTasks = schedule.weeks.flatMap((entry) => entry.tasks);

  function stateFor(task: RoadmapTask) {
    if (task.done) return "done" as const;
    return task.id === currentTaskId ? ("current" as const) : ("pending" as const);
  }

  function cardFor(task: RoadmapTask, options?: { week?: ScheduleWeek; expanded?: boolean }) {
    return (
      <TaskCard
        key={task.id}
        task={task}
        state={stateFor(task)}
        pending={pendingTaskId === task.id}
        flare={flareTaskId === task.id}
        onToggle={onToggleTask}
        onToggleStep={onToggleStep}
        pendingStepId={pendingStepId}
        defaultExpanded={options?.expanded ?? false}
        // The doing order: steps first, the why one tap away, the escape
        // hatch below the list it is an escape from. TaskCard's own note
        // explains why the two panels read the same card differently.
        context="week"
        weekNumber={options?.week ? options.week.index + 1 : null}
        weekRange={
          options?.week
            ? formatWeekRange(options.week.start, options.week.end, schedule.today)
            : null
        }
        // WholePlan owns the `task-{id}` anchor: both panels are in the DOM at
        // once, and a duplicated id breaks the deep link from /cv.
        anchor={false}
      />
    );
  }

  // A roadmap with no tasks is self-healed server-side; this is only here so a
  // half-written plan renders a sentence instead of throwing.
  if (!week) {
    return (
      <p className={cn("text-sm leading-relaxed text-moonlight", className)}>
        This plan has no tasks yet.
      </p>
    );
  }

  if (allTasks.length > 0 && allTasks.every((task) => task.done)) {
    return (
      <div className={cn("flex flex-col items-start gap-3", className)}>
        <NorthStarGlyph size={26} />
        <h2 className="text-h3 text-starlight">The route is sailed.</h2>
        <p className="max-w-prose text-sm leading-relaxed text-moonlight">
          Every task on this plan is done, and your CV carries the proof. Read it
          back before you send it anywhere.
        </p>
        <LinkButton href="/cv" variant="secondary" className="mt-1">
          See your CV
        </LinkButton>
      </div>
    );
  }

  const openThisWeek = week.tasks.filter((task) => !task.done);
  const rows = countRows(week.tasks);
  const percent = rows.total > 0 ? (rows.done / rows.total) * 100 : 0;

  // Work the plan has sailed past is still the first thing to do, so it is
  // carried into this view rather than left behind in "Whole plan" — otherwise
  // a slipped plan hides the one task the chart is calling current.
  const carried = firstOpen(
    schedule.weeks.filter((entry) => entry.index < schedule.currentWeekIndex),
  );
  // Only look forward once there is genuinely nothing left behind or due.
  const ahead =
    openThisWeek.length === 0 && !carried
      ? firstOpen(schedule.weeks.filter((entry) => entry.index > schedule.currentWeekIndex))
      : null;

  // Exactly one card opens its steps, wherever it came from: the thing to do
  // now. Two open cards would put a dozen checkable rows on a phone screen.
  const expandedId = (carried ?? ahead)?.task.id ?? openThisWeek[0]?.id ?? null;

  // A week can hold more hours than the pace and be perfectly on plan: a task
  // is filed under the week its LAST hour falls in, so a long task's week
  // carries work that started earlier. "10h of your 8h" would read as an
  // overrun that isn't one, so the shape of the sentence changes instead.
  const pace = formatDuration(hoursPerWeek * 60);
  const load =
    week.tasks.length === 0
      ? "nothing due"
      : week.hours <= hoursPerWeek
        ? `${formatDuration(week.hours * 60)} of your ${pace}`
        : `${formatDuration(week.hours * 60)} due · ${pace} a week`;

  // No week is named. `weeksBehind` now measures the hours owed by every week
  // that has fully passed, so the debt has no single author — and the week
  // this used to blame was the CURRENT one, which has barely started.
  const drift = schedule.weeksBehind === 1 ? "a week" : `${schedule.weeksBehind} weeks`;
  const behind = `The plan has drifted about ${drift} behind. Re-plan from today and the dates stay honest.`;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {/* The dates and the load, and nothing else on this line. These are the
          two readings the week cannot be understood without, so they are the
          two that hold their place above the fold — and alone the line never
          wraps, at any pace, in any month, even once the range carries a year.
          The step count that used to share it is what made it wrap. */}
      <p className="mono-label text-moonlight">
        <span className="whitespace-nowrap text-starlight">
          {formatWeekRange(week.start, week.end, schedule.today)}
        </span>{" "}
        · {load}
      </p>

      {/* Slipping is a re-plan, not a failure: no ember, no badge, and the
          recovery is the only thing offered.

          This is the screen's one gold fill, and it is spent here on purpose.
          The One Gold Rule is a ceiling with a duty: when several rows deserve
          the action, the recommended one takes the fill. A slipped week puts
          five secondary controls in front of the user — change pace, re-plan,
          mark as done, change destination — and re-dating the plan is the move
          that makes every other one honest. It exists only inside this branch,
          so the screen still never carries two. */}
      {schedule.weeksBehind >= 1 && (
        <div className="flex flex-col gap-3 rounded-xl border bg-night/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <p className="max-w-prose text-sm leading-relaxed text-moonlight">
            {behind}
          </p>
          <Button
            variant="primary"
            onClick={onReplan}
            loading={replanPending}
            className="w-full shrink-0 sm:w-auto"
          >
            Re-plan from today
          </Button>
        </div>
      )}

      {/* Carried work leads, because finishing it is what un-slips the plan. */}
      {carried && (
        <div className="flex flex-col gap-4">
          <p className="max-w-prose text-sm leading-relaxed text-moonlight">
            <span className="text-starlight">{carried.task.title}</span> is still
            open from{" "}
            {formatWeekRange(carried.week.start, carried.week.end, schedule.today)}.
            Finish that first.
          </p>
          <ol className="flex list-none flex-col gap-4">
            {cardFor(carried.task, {
              week: carried.week,
              expanded: carried.task.id === expandedId,
            })}
          </ol>
        </div>
      )}

      {week.tasks.length > 0 && (
        <ol className="flex list-none flex-col gap-4">
          {week.tasks.map((task) => cardFor(task, { expanded: task.id === expandedId }))}
        </ol>
      )}

      {/* Ahead of the plan, or a leading week the packing left empty. Hand over
          the next real thing, then explain why it is what you are looking at.

          The card leads and the sentence follows, for the reason the why sits
          below the steps: this branch is common — the packer files a task under
          the week its LAST hour falls in, so every week a long task spans
          arrives empty — and a two-line paragraph overhead pushed the first
          step's title to 609px on a 375×667 phone, seven pixels under the fold.
          Below the card it costs nothing, and the card was always the answer. */}
      {ahead && (
        <div className="flex flex-col gap-4">
          <ol className="flex list-none flex-col gap-4">
            {cardFor(ahead.task, { week: ahead.week, expanded: ahead.task.id === expandedId })}
          </ol>
          <p className="max-w-prose text-sm leading-relaxed text-moonlight">
            {week.tasks.length === 0 ? (
              <>
                Nothing is due this week. This is{" "}
                <span className="text-starlight">{ahead.task.title}</span>,
                pulled forward from{" "}
                {formatDay(ahead.week.end, schedule.today)}.
              </>
            ) : (
              <>
                Everything due this week is done. This is{" "}
                <span className="text-starlight">{ahead.task.title}</span>, next
                on the route, due{" "}
                {formatDay(ahead.week.end, schedule.today)}.
              </>
            )}
          </p>
        </div>
      )}

      {/* The week's progress, scoped to this week on purpose: a bar measuring
          the whole plan moves once a fortnight, where this one moves every time
          a step closes.

          It reads AFTER the work rather than before it, which is where the
          teaching line and the pace readout already sit for the same reason —
          36px above the first task is 36px the first step row does not have,
          and on a 375×667 phone that was the difference between seeing the
          first step and having to hunt for it. Nothing is lost by the move:
          this is a summary of the cards above it, it keeps its own count, and
          the dates and load it used to sit beside are still overhead. */}
      {rows.total > 0 && (
        <div className="flex flex-col gap-2">
          {/* "this week" is load-bearing, not decoration: "Whole plan" opens
              with a reading of exactly this shape against the plan's own
              denominator, and each has to name the run it measures or the
              smaller one reads as the larger one mislabelled. The noun comes
              from the count — a plan whose tasks predate steps has no steps to
              report, and says tasks. */}
          <p className="mono-label text-moonlight">
            {rows.done} of {formatRowCount(rows.total, rows.unit)} this week
          </p>
          <ProgressRoute
            percent={percent}
            waypoints={rows.total}
            label="This week's progress"
          />
        </div>
      )}
    </div>
  );
}
