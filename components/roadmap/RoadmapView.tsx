"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  Button,
  Dialog,
  NorthStarGlyph,
  ViewSwitch,
  useReducedMotion,
  useToast,
} from "@/components/ui";
import { computeScore } from "@/lib/score";
import { buildSchedule, countRows, formatRowCount } from "@/lib/schedule";
import type { CVData, LockedTarget, Roadmap, RoadmapTask } from "@/lib/types";
import {
  changePace,
  replanFromToday,
  toggleStep,
  toggleTask,
} from "@/app/(app)/roadmap/actions";
import { PaceChooser } from "./PaceChooser";
import { RouteChart } from "./RouteChart";
import { ThisWeek } from "./ThisWeek";
import { WholePlan } from "./WholePlan";

/**
 * The living roadmap, in one column at every width: header readouts, the
 * full-width timeline band, a two-segment switch, and the plan itself — this
 * week by default, the whole route one tap away.
 *
 * The order above the switch is a budget, not a preference. A 375×667 phone
 * shows 603px of content above the fixed tab bar, and the header, the band and
 * the switch spend 466px of it before the plan starts; anything else placed up
 * there pushes the one thing four visits in five came for off the screen. So
 * the vocabulary line, the pace readout and its chooser sit BELOW the plan, and
 * the header carries measured readings only.
 *
 * This file owns the state and the writes; nothing below it holds server
 * state. It calls buildSchedule ONCE and hands the result down, so the chart,
 * the week and the plan can never disagree about which week it is. Every
 * toggle is optimistic behind a single in-flight guard, and every failure puts
 * the previous state back before it says so.
 */

export interface RoadmapViewProps {
  target: LockedTarget;
  roadmap: Roadmap;
  /**
   * The day the plan is read against. Passed in rather than read: this file
   * must not touch the clock, or a server render and its hydration could
   * disagree about what week it is (RoadmapScreen owns it).
   */
  today: Date;
  /**
   * Latest stored readiness at server render — the opening floor for the
   * readout, which then takes the higher of that floor and the live count.
   * Every write raises the floor to the score the server returns.
   */
  storedScore: number;
  /** Play the route draw-in (arriving fresh from generation). */
  reveal?: boolean;
}

type View = "week" | "plan";

/**
 * computeScore reads the profile only to decide whether its 35-point base
 * applies — the rest is the weighted task total. A roadmap is never drawn
 * without a completed profile, so the client reproduces the server's number
 * exactly without the CV ever being shipped to the browser.
 */
const PROFILE_ON_FILE: CVData = {
  basics: { name: "", links: [] },
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

/** Local `YYYY-MM-DD` — never toISOString(), which would shift the day west of Greenwich. */
function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The `#task-…` deep link /cv points at a CV line's source. It is read through
 * useSyncExternalStore rather than an effect: the hash never reaches the
 * server, so the server snapshot is empty and React re-reads it once mounted —
 * no hydration mismatch, and no state written from an effect.
 */
function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
function readHash(): string {
  return window.location.hash;
}
function noHash(): string {
  return "";
}

export function RoadmapView({
  target,
  roadmap,
  today,
  storedScore,
  reveal = false,
}: RoadmapViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const reduced = useReducedMotion();
  const ids = React.useId();

  // Everything the writes below can change lives here; the roadmap prop stays
  // the record as it was loaded, so a rollback is a single assignment.
  const [tasks, setTasks] = React.useState<RoadmapTask[]>(roadmap.tasks);
  const [startDate, setStartDate] = React.useState(roadmap.startDate);
  const [hoursPerWeek, setHoursPerWeek] = React.useState(roadmap.hoursPerWeek);
  /**
   * The never-decrease floor for the readiness READOUT. `storedScore` is the
   * page's server render and never moves again in this session, so a floor read
   * straight off the prop would let the display fall the moment a waypoint is
   * reopened — the live count drops back while the stored number is stale. Every
   * write returns the score the server actually holds, so each success raises
   * this and the readout holds exactly what the toast promises.
   */
  const [scoreFloor, setScoreFloor] = React.useState(storedScore);

  const [pendingTaskId, setPendingTaskId] = React.useState<string | null>(null);
  const [pendingStepId, setPendingStepId] = React.useState<string | null>(null);
  const [replanPending, setReplanPending] = React.useState(false);
  const [pacePending, setPacePending] = React.useState(false);
  const [flareId, setFlareId] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [paceOpen, setPaceOpen] = React.useState(false);
  const [chosenView, setChosenView] = React.useState<View | null>(null);

  // One guard for every write: two optimistic updates in flight at once could
  // roll back to each other's state.
  const busy =
    pendingTaskId !== null || pendingStepId !== null || replanPending || pacePending;

  // The one build. The chart, the week and the plan all read this — recomputing
  // it in three places is how they would come to disagree.
  const schedule = React.useMemo(
    () => buildSchedule({ ...roadmap, tasks, startDate, hoursPerWeek }, today),
    [roadmap, tasks, startDate, hoursPerWeek, today],
  );

  const ordered = React.useMemo(
    () => [...tasks].sort((a, b) => a.position - b.position),
    [tasks],
  );
  const currentTaskId = ordered.find((task) => !task.done)?.id ?? null;
  const rows = React.useMemo(() => countRows(tasks), [tasks]);

  // Never-decrease: the floor is what /cv already promised the user, raised by
  // every write this session so the readout can never fall behind its own toast.
  const readiness = Math.max(scoreFloor, computeScore(PROFILE_ON_FILE, tasks));
  // The same sum the calendar is packed from, so the pace readout and the
  // chart's finish date can never name two different days.
  const totalHours = schedule.weeks.reduce((sum, week) => sum + week.hours, 0);

  const hash = React.useSyncExternalStore(subscribeHash, readHash, noHash);
  const focusTaskId = React.useMemo(() => {
    const id = hash.startsWith("#task-") ? hash.slice("#task-".length) : "";
    return id && tasks.some((task) => task.id === id) ? id : null;
  }, [hash, tasks]);

  // A deep link opens the whole plan, because that is the view that holds
  // every task. The user's own choice outranks it from then on.
  const view: View = chosenView ?? (focusTaskId ? "plan" : "week");

  // Bringing the linked task into sight is the other half of the deep link:
  // the browser cannot scroll to it itself, since the panel holding it is
  // `hidden` until the switch selects it.
  React.useEffect(() => {
    if (!focusTaskId || view !== "plan") return;
    document.getElementById(`task-${focusTaskId}`)?.scrollIntoView({
      block: "start",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [focusTaskId, view, reduced]);

  const weekTabId = `${ids}-tab-week`;
  const weekPanelId = `${ids}-panel-week`;
  const planTabId = `${ids}-tab-plan`;
  const planPanelId = `${ids}-panel-plan`;
  const paceId = `${ids}-pace`;

  const options = React.useMemo(
    () =>
      [
        {
          value: "week",
          label: "This week",
          tabId: weekTabId,
          panelId: weekPanelId,
        },
        {
          value: "plan",
          label: "Whole plan",
          tabId: planTabId,
          panelId: planPanelId,
        },
      ] as const,
    [weekTabId, weekPanelId, planTabId, planPanelId],
  );

  /** The completion toast, shared by both paths that can close a task. */
  function celebrate(delta: number) {
    toast(
      delta > 0
        ? `+${delta} — your chart brightens`
        : "Waypoint ignited — your chart brightens",
      { tone: "success" },
    );
  }

  async function handleToggleTask(taskId: string, done: boolean) {
    if (busy) return;
    const previous = tasks;
    setPendingTaskId(taskId);
    setTasks((current) =>
      current.map((t) =>
        t.id === taskId
          ? { ...t, done, doneAt: done ? new Date().toISOString() : null }
          : t,
      ),
    );
    if (done) setFlareId(taskId);

    const result = await toggleTask({ taskId, done });
    setPendingTaskId(null);

    if (!result.ok) {
      setTasks(previous);
      setFlareId(null);
      toast(result.error, { tone: "error" });
      return;
    }
    // The score the server now holds. Banking it here is what makes "it never
    // falls" true of the readout as well as the record.
    setScoreFloor((floor) => Math.max(floor, result.score));
    if (done) {
      celebrate(result.delta);
    } else {
      toast("Waypoint reopened. Your score holds — it never falls.");
    }
  }

  async function handleToggleStep(stepId: string, done: boolean) {
    if (busy) return;
    const previous = tasks;
    const parent = previous.find((task) =>
      task.steps.some((step) => step.id === stepId),
    );
    if (!parent) return;

    const stamp = done ? new Date().toISOString() : null;
    const steps = parent.steps.map((step) =>
      step.id === stepId ? { ...step, done, doneAt: stamp } : step,
    );
    // Checking the last open step closes the task — the server does exactly
    // this, and waiting on the round trip would leave the card half-lit.
    const closes = done && !parent.done && steps.every((step) => step.done);

    setPendingStepId(stepId);
    setTasks((current) =>
      current.map((t) =>
        t.id === parent.id
          ? {
              ...t,
              steps,
              done: closes ? true : t.done,
              doneAt: closes ? stamp : t.doneAt,
            }
          : t,
      ),
    );
    if (closes) setFlareId(parent.id);

    const result = await toggleStep({ stepId, done });
    setPendingStepId(null);

    if (!result.ok) {
      setTasks(previous);
      if (closes) setFlareId(null);
      toast(result.error, { tone: "error" });
      return;
    }
    setScoreFloor((floor) => Math.max(floor, result.score));

    // The server is the authority on whether the task closed: our copy of the
    // steps can be one write behind another tab's.
    const taskDone = parent.done || result.taskCompleted;
    if (taskDone !== (parent.done || closes)) {
      setTasks((current) =>
        current.map((t) =>
          t.id === parent.id
            ? {
                ...t,
                done: taskDone,
                doneAt: taskDone ? (t.doneAt ?? new Date().toISOString()) : null,
              }
            : t,
        ),
      );
      setFlareId(taskDone ? parent.id : null);
    }
    if (result.taskCompleted) celebrate(result.delta);
  }

  async function handleReplan() {
    if (busy) return;
    const previous = startDate;
    const day = toISODate(today);
    setReplanPending(true);
    setStartDate(day);

    // The user's day, not the server's. "Your dates run from today" is a
    // promise about their calendar: a server on UTC would write tomorrow for
    // someone in Los Angeles at 17:00 and open the plan on a week that has not
    // started. The action clamps an implausible claim rather than trusting it.
    const result = await replanFromToday({ today: day });
    setReplanPending(false);

    if (!result.ok) {
      setStartDate(previous);
      toast(result.error, { tone: "error" });
      return;
    }
    // The day the server actually wrote, which is the one the next load reads.
    setStartDate(result.startDate);
    toast("Re-planned. Your dates run from today.");
  }

  async function handlePace(next: number) {
    if (busy || next === hoursPerWeek) return;
    const previous = hoursPerWeek;
    setPacePending(true);
    setHoursPerWeek(next);

    const result = await changePace({ hoursPerWeek: next });
    setPacePending(false);

    if (!result.ok) {
      setHoursPerWeek(previous);
      toast(result.error, { tone: "error" });
      return;
    }
    // The clamped value actually stored. No toast: the dates moved as they
    // were asked to, in front of the user, which is the whole answer.
    setHoursPerWeek(result.hoursPerWeek);
  }

  return (
    // 20px between panels below md — the documented stack rhythm, and twelve
    // pixels of the phone's fold budget handed to the plan.
    <div className={cn("flex flex-col gap-5 md:gap-6", reveal && "animate-fade-up")}>
      {/* Voyage header: the plan's name, and nothing else. Only three things
          stand between the top of the page and the view switch, because "what
          do I do now" is four visits in five and every line added here is a
          line the first step loses on a 375×667 phone. The teaching sentence
          and the pace control both moved below the plan.

          The second header line went the same way, and for the stronger reason:
          READINESS, WEEK i OF n and FINISHES are printed verbatim in the chart
          frame's four corners 20px below. A caption that repeats the instrument
          it sits on is not a second reading, it is the same reading twice — and
          DESIGN.md's own rule puts mono readouts inside the instrument, which
          is finally true of every one of them here.

          There is no progress bar here either. The dots it drew were waypoints
          while its fill was step-weighted, so eight steps of one task lit two
          dots with no task finished — a reading the timeline band flatly
          contradicted. The band already plots position against time and "This
          week" carries its own step-weighted bar, so the honest fix is one
          fewer instrument, not a third unit on the same screen.

          The step count went down into "Whole plan" for a related reason: it is
          that panel's denominator. Two readings of the same shape ("N of M
          steps") stood on one screen against two different totals, and only the
          lower one named its run. The one with a progress bar under it won, and
          this one read as that one mislabelled. The obvious fix is to say which
          is which, and it does not fit: measured in Chromium against the
          self-hosted faces, "Your roadmap" is 208.4px at the 2rem h1 step and a
          mono-label character is 8.34px, so of a 375px phone's 343px measure
          this line has 118.6px spare and the reading spends 116.7px. The shortest
          scope worth writing ("ON THE PLAN") is another 91.7px, which flexbox
          answers by moving the whole readout to a second header row — 20.5px
          off a fold budget that was bought a pass ago to get the first step
          above it.

          So the reading moves instead of shrinking. Inside its own panel it has
          a full 343px line to name its scope on, the week's reading names its
          own, and the switch makes them mutually exclusive: the two can no
          longer be read against each other, because they are never on screen at
          the same time. Nothing is lost from this view — READINESS in the chart
          corner is the plan-wide progress reading, and it never left. */}
      <header>
        <h1 className="text-h1 text-starlight">Your roadmap</h1>
      </header>

      {/* the timeline band — full width at every size. It brings its own
          ChartFrame and corner readouts, so it is never wrapped in one. */}
      <RouteChart
        schedule={schedule}
        targetTitle={roadmap.targetTitle}
        readiness={readiness}
        today={today}
        reveal={reveal}
        flareTaskId={flareId}
      />

      <ViewSwitch
        label="Roadmap view"
        value={view}
        onChange={(next) => setChosenView(next)}
        options={options}
      />

      {/* Both panels stay mounted so the switch costs nothing to cross, and
          `hidden` sits on a bare wrapper — a display utility on the panel
          itself would out-rank the UA rule and leave it on screen. */}
      <div
        id={weekPanelId}
        role="tabpanel"
        aria-labelledby={weekTabId}
        hidden={view !== "week"}
      >
        <ThisWeek
          schedule={schedule}
          hoursPerWeek={hoursPerWeek}
          currentTaskId={currentTaskId}
          onToggleTask={handleToggleTask}
          onToggleStep={handleToggleStep}
          pendingTaskId={pendingTaskId}
          pendingStepId={pendingStepId}
          flareTaskId={flareId}
          onReplan={handleReplan}
          replanPending={replanPending}
        />
      </div>
      <div
        id={planPanelId}
        role="tabpanel"
        aria-labelledby={planTabId}
        hidden={view !== "plan"}
      >
        <WholePlan
          schedule={schedule}
          currentTaskId={currentTaskId}
          onToggleTask={handleToggleTask}
          onToggleStep={handleToggleStep}
          pendingTaskId={pendingTaskId}
          pendingStepId={pendingStepId}
          flareTaskId={flareId}
          focusTaskId={focusTaskId}
        />
      </div>

      {/* The one place "waypoint" is taught, and "step" with it. It sits under
          the plan rather than over it: this line is read once and never again,
          where the week above it is read every visit. The destination is named
          in the bar below, so the line keeps only the vocabulary.

          A roadmap written before steps existed has none to teach, and every
          card on it renders a bare waypoint with no step list — so the second
          clause goes, rather than naming a thing the user cannot find. */}
      <p className="max-w-prose text-sm text-moonlight">
        {rows.unit === "step"
          ? "Each waypoint is one thing to finish; each step inside it is one sitting."
          : "Each waypoint is one thing to finish."}
      </p>

      {/* The pace is a readout you can edit — the only number the whole calendar
          is divided by. It follows the plan instead of preceding it: the chooser
          moves the finish date live as you change it, so the trade stays visible
          right here, and the dates it sets are the ones you have just read. */}
      <section aria-label="Weekly pace" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <span className="mono-label text-moonlight">{hoursPerWeek}h a week</span>
          <Button
            variant="secondary"
            onClick={() => setPaceOpen((open) => !open)}
            aria-expanded={paceOpen}
            aria-controls={paceId}
          >
            Change pace
          </Button>
        </div>
        {/* No card around it: the choice cards are cards already, and this
            system never nests one inside another. */}
        <div id={paceId} hidden={!paceOpen}>
          <PaceChooser
            value={hoursPerWeek}
            onChange={handlePace}
            totalHours={totalHours}
            startDate={startDate || toISODate(today)}
            today={toISODate(today)}
            // These hours are the plan's own estimates, not a band's midpoint,
            // so the readout drops its hedge.
            approximate={false}
            question="How much time can you give this each week?"
            className="pt-1"
          />
        </div>
      </section>

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
        // Same noun as the readouts, for the same reason: on a roadmap written
        // before steps existed, the rows the user closed were whole waypoints.
        // Nothing done is the common case here — someone locks a destination,
        // reconsiders, and comes straight back. "The 0 steps you've completed"
        // is true and unsayable, so that case keeps the promise and drops the
        // count, which is the half of the sentence that still means something.
        description={
          rows.done === 0
            ? "Locking a new destination replaces this roadmap. Nothing is lost — your score never falls."
            : `Locking a new destination replaces this roadmap. The ${formatRowCount(rows.done, rows.unit)} you've completed ${rows.done === 1 ? "stays" : "stay"} on your record — your score never falls.`
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Stay on course
            </Button>
            <Button onClick={() => router.push("/bearing")}>
              Choose from your matches
            </Button>
          </>
        }
      />

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
            there, <em className="italic text-starlight">{roadmap.dreamBeyond}</em>{" "}
            becomes attainable.
          </p>
        </aside>
      )}
    </div>
  );
}
