"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, StarGlyph, WaypointGlyph, type WaypointState } from "@/components/ui";
import { formatDuration } from "@/lib/schedule";
import type { RoadmapTask } from "@/lib/types";
import { StepRow } from "./StepRow";

/**
 * One waypoint on the route: title, mono readouts (position, category, hours,
 * and the week it falls in), the why (verbatim dream quotes rendered in
 * starlight italic), the steps that unpack it, and the done toggle. Completing
 * shows the acknowledgment line — the finished CV line this task just earned.
 *
 * A task with no steps — every roadmap generated before steps existed —
 * renders exactly as it did then: no expander, no empty affordance, and the
 * "Mark as done" button still carries the whole task.
 *
 * ── the same card reads two ways ───────────────────────────────────────────
 * `context` is not a style flag; it is which question the card is answering.
 *
 * In "Whole plan" the user is DECIDING — is this worth doing, when does it
 * land — so the why is prose on the surface and the steps stay folded away.
 *
 * In "This week" the user has already accepted this task and is DOING it, and
 * the panel exists to answer "what do I do now" in one glance on a 375×667
 * phone. There the order inverts: title, the step readout, then the steps
 * themselves. The why is read once and then never again, so it moves behind
 * "Why this matters" — one tap, never deleted, because it carries the user's
 * own words. The task-level "Mark as done" is an escape hatch for someone who
 * did the work their own way, so it moves below the list it is an escape from,
 * next to the plan metadata that belongs to the deciding context too.
 *
 * That reordering is worth ~135px of a ~545px budget above the fold — the
 * difference between a first step the user can see and one they must hunt for.
 */

export interface TaskCardProps {
  task: RoadmapTask;
  /** Waypoint state on the chart — done / current / pending. */
  state: WaypointState;
  /** Toggle request in flight for this task. */
  pending?: boolean;
  /** Ignition flare (just completed). */
  flare?: boolean;
  onToggle: (taskId: string, done: boolean) => void;
  /** Step toggle, with the state the user is asking for. */
  onToggleStep: (stepId: string, done: boolean) => void;
  /** Step whose toggle is in flight. */
  pendingStepId?: string | null;
  /** 1-based week this task is due in. Omit when a week header sits above. */
  weekNumber?: number | null;
  /**
   * That week's dates from `formatWeekRange()` — "24–30 Aug", or
   * "17–23 Jan 2026" once the week is far enough from today to need its year.
   */
  weekRange?: string | null;
  /**
   * Open the step list. Defaults to the current task, and it is reconciled
   * rather than snapshotted: a card that only later becomes the one to open
   * unpacks itself when this flips true.
   */
  defaultExpanded?: boolean;
  /**
   * Render the `task-{id}` anchor `/cv` deep-links to. Both roadmap views are
   * mounted at once (the unselected tabpanel is only `hidden`), so exactly one
   * of them may claim the id — WholePlan does, since it holds every task.
   */
  anchor?: boolean;
  /**
   * Which question this card is answering — see the note above. "plan" is the
   * deciding order (why first, steps folded); "week" is the doing order (steps
   * first, why one tap away).
   */
  context?: TaskCardContext;
  className?: string;
}

/** Deciding ("Whole plan") or doing ("This week"). */
export type TaskCardContext = "plan" | "week";

/**
 * Render the why with the model's double-quoted verbatim fragments (the
 * user's own dream words) in starlight italic — never paraphrased, never
 * flattened. Curly quotes are normalized so both survive.
 */
function renderWhy(why: string): React.ReactNode {
  const normalized = why.replace(/[“”]/g, '"');
  const parts = normalized.split(/"([^"]*)"/g);
  if (parts.length === 1) return normalized;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="italic text-starlight">
        &ldquo;{part}&rdquo;
      </em>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

/** Both disclosures wear the same 44px row, so a card never mixes two. */
const DISCLOSURE =
  "-mx-1 mt-2 flex min-h-11 items-center gap-2 rounded-lg px-1 text-left transition-colors duration-150 hover:bg-veil/20";

export function TaskCard({
  task,
  state,
  pending = false,
  flare = false,
  onToggle,
  onToggleStep,
  pendingStepId = null,
  weekNumber = null,
  weekRange = null,
  defaultExpanded = state === "current",
  anchor = true,
  context = "plan",
  className,
}: TaskCardProps) {
  const ids = React.useId();
  const stepsPanelId = `${ids}-steps`;
  const whyPanelId = `${ids}-why`;
  const [open, setOpen] = React.useState(defaultExpanded);
  const [whyOpen, setWhyOpen] = React.useState(false);

  // `defaultExpanded` is reconciled, not snapshotted. Cards genuinely arrive
  // collapsed and only later become the one to open: a hard load of
  // /roadmap#task-… mounts every card with it false, because the hash is not
  // readable during hydration and only flips true on the pass after mount; and
  // finishing the open task hands the default to the next task in the week,
  // which has been mounted collapsed the whole time. Snapshotting the prop into
  // useState ignored both. Adjusting state during render is React's supported
  // derive-from-props path; an effect would paint the wrong state for a frame.
  //
  // It follows the prop only when the PROP changes, so a card the user opened
  // or closed by hand is never overruled in between — ticking a step, or a
  // toggle going out and coming back, moves nothing. And it follows the prop
  // down as well as up, which is what keeps ThisWeek's promise that exactly one
  // step list is open: the card that just closed gives up its rows to the card
  // that just inherited them, instead of both staying open on a phone.
  const [lastDefault, setLastDefault] = React.useState(defaultExpanded);
  if (defaultExpanded !== lastDefault) {
    setLastDefault(defaultExpanded);
    setOpen(defaultExpanded);
  }

  const steps = React.useMemo(
    () => [...(task.steps ?? [])].sort((a, b) => a.position - b.position),
    [task.steps],
  );
  const doneSteps = steps.filter((step) => step.done).length;
  const remainingMinutes = steps.reduce(
    (sum, step) => (step.done ? sum : sum + step.minutes),
    0,
  );
  const why = React.useMemo(() => renderWhy(task.why), [task.why]);

  const doing = context === "week";
  /**
   * In "This week" the one card that IS the thing to do now is opened for the
   * user and stays open: a control to re-fold the only answer on the panel is
   * 52px spent to take that answer away. Every other card in the week keeps
   * its expander, so the promise that one step list is open at a time still
   * holds, and a card that loses the default (its task just finished) collapses
   * and gets its expander back in the same pass.
   */
  const lockedOpen = doing && defaultExpanded && steps.length > 0;
  const showSteps = steps.length > 0 && (lockedOpen || open);

  const heading = (
    <h3
      className={cn(
        "font-sans text-base font-medium leading-snug",
        task.done ? "text-moonlight" : "text-starlight",
      )}
    >
      {task.title}
    </h3>
  );

  // Each measurement is one unbreakable unit — the line may wrap between
  // readings, never inside one ("· WEEK 3" stays whole). The hours are derived
  // from estimateHours rather than read off task.effort: the schedule is built
  // from that same number, and a roadmap written before hours existed carries
  // prose ("2 weekends") that would quietly contradict its own dates. They go
  // through formatDuration, not formatEffort, for two reasons: a mono-label
  // carries measured values only, and "ABOUT 12 HOURS" above "2H 30M LEFT"
  // would give one card two dialects for the same quantity.
  const metaReadout = (
    <>
      <span className="whitespace-nowrap">
        {String(task.position).padStart(2, "0")}
      </span>{" "}
      <span className="whitespace-nowrap">· {task.category}</span>{" "}
      <span className="whitespace-nowrap">
        · {formatDuration(task.estimateHours * 60)}
      </span>
      {weekNumber != null && (
        <>
          {" "}
          <span className="whitespace-nowrap">· Week {weekNumber}</span>
        </>
      )}
      {weekRange && (
        <>
          {" "}
          <span className="whitespace-nowrap">· {weekRange}</span>
        </>
      )}
    </>
  );

  // The escape hatch: people who did the work their own way, or whose steps
  // never existed, close the whole task here. Secondary in both contexts — the
  // screen's one gold fill belongs to "Re-plan from today".
  const doneButton = (
    <Button
      variant="secondary"
      onClick={() => onToggle(task.id, !task.done)}
      loading={pending}
      aria-pressed={task.done}
      aria-label={
        task.done
          ? `Mark "${task.title}" as not done`
          : `Mark "${task.title}" as done`
      }
      className={cn(
        "w-full shrink-0 sm:w-auto",
        task.done && "border-gold/50 text-gold-bright hover:bg-gold/10",
      )}
    >
      {task.done && <Check size={16} strokeWidth={1.5} aria-hidden />}
      {task.done ? "Done" : "Mark as done"}
    </Button>
  );

  // The goal-gradient readout: it moves several times a week, where the task
  // count moves once a fortnight.
  const stepReadout = `${doneSteps} of ${steps.length} steps${
    remainingMinutes > 0 ? ` · ${formatDuration(remainingMinutes)} left` : ""
  }`;

  const stepToggle = steps.length > 0 && !lockedOpen && (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={stepsPanelId}
      onClick={() => setOpen((value) => !value)}
      className={DISCLOSURE}
    >
      <span className="mono-label text-moonlight">{stepReadout}</span>
      <ChevronDown
        size={16}
        strokeWidth={1.5}
        aria-hidden
        className={cn(
          "shrink-0 text-moonlight transition-transform duration-150",
          open && "rotate-180",
        )}
      />
    </button>
  );

  // `hidden` sits on a bare wrapper: a display utility on the element itself
  // would out-rank the UA rule and leave the list on screen.
  const stepList = steps.length > 0 && (
    <div id={stepsPanelId} hidden={!showSteps}>
      {/* Pulled out to the card's own padding so the whole row — box, title,
          instruction, minutes — is one 44px target. */}
      <ul className="-mx-2 mt-1 flex list-none flex-col">
        {steps.map((step) => (
          <StepRow
            key={step.id}
            title={step.title}
            detail={step.detail}
            minutes={step.minutes}
            done={step.done}
            pending={pendingStepId === step.id}
            onToggle={(next) => onToggleStep(step.id, next)}
          />
        ))}
      </ul>
    </div>
  );

  const doneNote = task.done && (
    <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-moonlight">
      <StarGlyph size={11} className="mt-1 shrink-0 text-gold-bright" />
      {task.cvLine ? (
        <span>
          Your CV now carries:{" "}
          <span className="text-starlight">&ldquo;{task.cvLine.text}&rdquo;</span>
        </span>
      ) : (
        <span>Charted. The route ahead is shorter.</span>
      )}
    </p>
  );

  return (
    <li
      id={anchor ? `task-${task.id}` : undefined}
      className={cn(
        // 16px of padding on a phone, 20px from sm — the documented list-row
        // card step, and eight more pixels of measure for the title.
        "scroll-mt-24 rounded-xl border bg-depth p-4 shadow-panel transition-colors duration-400 sm:p-5",
        state === "current" && "border-gold/40",
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={cn("mt-1 shrink-0", flare && "animate-waypoint-flare")}
          aria-hidden
        >
          <WaypointGlyph size={16} state={state} />
        </span>

        <div className="min-w-0 flex-1">
          {doing ? (
            <>
              {heading}
              {/* The one reading that survives above the steps, because it is
                  the only one about the work still to do. */}
              {lockedOpen && (
                <p className="mono-label mt-1.5 text-moonlight">{stepReadout}</p>
              )}
              {stepToggle}
              {stepList}

              <button
                type="button"
                aria-expanded={whyOpen}
                aria-controls={whyPanelId}
                onClick={() => setWhyOpen((value) => !value)}
                className={cn(
                  DISCLOSURE,
                  "text-sm text-moonlight hover:text-starlight",
                )}
              >
                Why this matters
                <ChevronDown
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden
                  className={cn(
                    "shrink-0 transition-transform duration-150",
                    whyOpen && "rotate-180",
                  )}
                />
              </button>
              <div id={whyPanelId} hidden={!whyOpen}>
                <p className="mt-1 max-w-prose text-sm leading-relaxed text-moonlight">
                  {why}
                </p>
              </div>

              {/* Where this sits in the plan, and the way out of it — both
                  belong to the deciding question, so both wait until the
                  doing question has been answered. */}
              <div className="mt-4 grid grid-cols-1 items-center gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <p className="mono-label text-moonlight">{metaReadout}</p>
                {doneButton}
              </div>
            </>
          ) : (
            <>
              {/* Below sm the title owns the full measure and the action sits
                  full-width beneath it — a ~140px button in the same row costs
                  a phone ~40% of the line and shreds every title into 3–4
                  ragged lines. From sm up the two-column composition returns:
                  the button anchors top-right at every title length, so the
                  action never jumps position between cards. */}
              <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-y-2">
                <div className="min-w-0">
                  {heading}
                  <p className="mono-label mt-1.5 text-moonlight">{metaReadout}</p>
                </div>
                {doneButton}
              </div>

              <p className="mt-3 max-w-prose text-sm leading-relaxed text-moonlight">
                {why}
              </p>

              {stepToggle}
              {stepList}
            </>
          )}

          {doneNote}
        </div>
      </div>
    </li>
  );
}
