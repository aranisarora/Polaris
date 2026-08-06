import type { Roadmap, RoadmapTask, TaskCategory } from "@/lib/types";

/**
 * The roadmap's calendar. Pure — like lib/score.ts, no AI and no I/O, so a
 * plan can be re-flowed for free when the user changes pace or falls behind.
 *
 * `today` is always a parameter. Nothing in this file reads the clock, which
 * is what makes every date here testable and what keeps a server render and
 * the client hydration from disagreeing about what week it is.
 */

// ------------------------------------------------------------------- shapes

export interface ScheduleWeek {
  /** 0-based, counted from the roadmap's start date. */
  index: number;
  /** [start + 7N, start + 7N + 6] — local midnights, inclusive. */
  start: Date;
  end: Date;
  /** Tasks whose last hour falls in this week. May be empty (see below). */
  tasks: RoadmapTask[];
  /** Hours of work due this week — the sum of `tasks`. */
  hours: number;
}

export interface Schedule {
  weeks: ScheduleWeek[];
  totalWeeks: number;
  /** Which week `today` falls in, clamped to 0..totalWeeks-1. */
  currentWeekIndex: number;
  finishDate: Date;
  /**
   * Local midnight of the `today` this calendar was measured against. Carried
   * on the schedule so a consumer can date-format (`formatDay`,
   * `formatWeekRange`) without reading the clock itself and without a second
   * prop threaded beside the schedule it belongs to.
   */
  today: Date;
  /** Done tasks in full, plus done steps inside tasks still open. */
  hoursDone: number;
  /**
   * Hours whose due week has already passed — every task filed under a week
   * before the current one. Work sitting inside its own week is not owed yet,
   * so a plan that is simply mid-task reads 0.
   */
  hoursDue: number;
  /** Whole weeks of work owed. 0 when on or ahead of schedule, never negative. */
  weeksBehind: number;
}

/**
 * A step, shaped as a calendar event: title, description, duration, week.
 * Nothing here talks to Google — this is the shape a later sync would map
 * 1:1 onto, which is the whole reason `minutes` lives on steps.
 */
export interface PlannedBlock {
  id: string;
  title: string;
  detail: string;
  minutes: number;
  weekStart: Date;
  weekEnd: Date;
}

// -------------------------------------------------------------- date helpers

const MS_PER_DAY = 86_400_000;

/**
 * Month names are hard-coded rather than taken from Intl. The audience is US
 * and UK, the server and the browser can sit in different locales, and a date
 * that renders two ways across hydration is worse than one that never
 * localises at all.
 */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Local midnight of the same calendar day — never a UTC shift. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * `YYYY-MM-DD` (or the date half of an ISO timestamp) as a LOCAL midnight.
 * `new Date("2026-08-24")` is parsed as UTC, which reads as the 23rd
 * everywhere west of Greenwich — the one bug that would misdate the whole
 * plan for every US user.
 */
function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number): Date {
  // Calendar arithmetic, not milliseconds: crossing a DST boundary must still
  // land on midnight of the right day.
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

// ------------------------------------------------------------------ effort

/**
 * Hours to assume when a task has no estimate — roadmaps generated before
 * `estimate_hours` existed. Sized off the category weights in lib/score.ts:
 * the things that move a CV most are also the things that cost most.
 */
export function defaultHours(category: TaskCategory): number {
  switch (category) {
    case "project":
      return 12;
    case "certification":
      return 10;
    case "experience":
      return 8;
    case "skill":
      return 5;
    default:
      return 8;
  }
}

/** A task's hours, falling back to its category when it was never estimated. */
function taskHours(task: RoadmapTask): number {
  const estimate = task.estimateHours;
  return typeof estimate === "number" && Number.isFinite(estimate) && estimate > 0
    ? estimate
    : defaultHours(task.category);
}

/**
 * A duration as an instrument reading — "45 min", "3h", "1h 20m". The ONE
 * duration dialect the roadmap speaks: a card's estimated hours, a step's
 * minutes, a week's load and the weekly pace all come through here, so
 * "· 12H" above "2H 30M LEFT" reads as one instrument rather than two.
 *
 * It lives beside formatEffort() because they are the same quantity in two
 * registers. formatEffort's hedged prose ("about 12 hours") is a sentence, not
 * a reading — mono is reserved for measured values and "about" is a hedge — so
 * it stays out of every mono-label and lives on where the text is genuinely
 * prose. The units here are written to survive `mono-label`'s uppercasing.
 *
 * ── zero is a dash, not "0 min" ────────────────────────────────────────────
 * Nothing in this product legitimately takes no time: a step is one sitting and
 * every task carries an estimate. A zero therefore only ever arrives where a
 * value was missing and got coerced on the way in — `Number(row.minutes) || 0`
 * when steps are read back, an `estimate_hours` written before that column
 * existed. "0 MIN" asserts a measurement of no work, which is never true; the
 * dash says the instrument has no reading, which is exactly what happened. The
 * two places a real zero is meaningful — a task with no minutes left, a week
 * with nothing due — test for it before asking and say something else.
 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * Prose for an hours figure — "about 4 hours". Derived rather than generated,
 * so the number and the words can never disagree.
 */
export function formatEffort(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "under an hour";

  if (hours < 1) {
    // Nearest 5 minutes: "about 37 minutes" is a precision nobody has.
    const minutes = Math.max(5, Math.round((hours * 60) / 5) * 5);
    return minutes === 60 ? "about an hour" : `about ${minutes} minutes`;
  }

  const rounded = Math.round(hours);
  return rounded === 1 ? "about an hour" : `about ${rounded} hours`;
}

/**
 * Whether a date has to carry its year to be read correctly today.
 *
 * Two cases, and the second is the one that bit us: a plan whose start date
 * was backfilled from `generated_at` can finish months in the PAST, and a bare
 * "23 Jan" then reads as the January that is coming rather than the one that
 * has gone. So: a different year, or any day already behind us.
 */
function needsYear(date: Date, today: Date): boolean {
  return (
    date.getFullYear() !== today.getFullYear() ||
    startOfDay(date).getTime() < startOfDay(today).getTime()
  );
}

/**
 * A single date — "21 Oct", or "23 Jan 2026" once the year matters.
 *
 * The one canonical day formatter: the chart's corner, its aria-label, the
 * finish line and the "due" sentences all read from here, so a date can never
 * render two ways in one screen. `today` is a parameter for the reason
 * everything in this file takes one — nothing here reads the clock.
 */
export function formatDay(date: Date, today: Date): string {
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return needsYear(date, today) ? `${day} ${date.getFullYear()}` : day;
}

/**
 * A week as one line: "24–30 Aug", or "31 Aug–6 Sep" when it crosses a month.
 * En dash, per DESIGN.md.
 *
 * The year appears once, at the end, when the week is not plainly this year's
 * — and on both ends when the week straddles New Year, which is ambiguous
 * without it. A range counts as past only when its END has passed, so the
 * current week never picks up a year just because it began on Monday.
 */
export function formatWeekRange(start: Date, end: Date, today: Date): string {
  const startMonth = MONTHS[start.getMonth()];
  const endMonth = MONTHS[end.getMonth()];

  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.getDate()} ${startMonth} ${start.getFullYear()}–${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }

  const year =
    start.getFullYear() !== today.getFullYear() || needsYear(end, today)
      ? ` ${end.getFullYear()}`
      : "";

  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${endMonth}${year}`;
  }
  return `${start.getDate()} ${startMonth}–${end.getDate()} ${endMonth}${year}`;
}

/** Whole weeks needed to absorb `totalHours` at `hoursPerWeek`. */
export function estimateWeeks(totalHours: number, hoursPerWeek: number): number {
  if (!Number.isFinite(totalHours) || totalHours <= 0) return 0;
  return ceilWeeks(totalHours, normalizePace(hoursPerWeek));
}

/** A pace that can never divide by zero or run the plan backwards. */
function normalizePace(hoursPerWeek: number): number {
  if (!Number.isFinite(hoursPerWeek) || hoursPerWeek <= 0) return 1;
  return hoursPerWeek;
}

/**
 * Weeks a run of hours occupies. The epsilon is load-bearing: estimate_hours
 * is numeric(5,2), so a cumulative sum of four 2.5h tasks lands at
 * 10.000000000000002 and a bare ceil() would buy the user a whole extra week.
 */
function ceilWeeks(hours: number, hoursPerWeek: number): number {
  return Math.ceil(hours / hoursPerWeek - 1e-9);
}

// --------------------------------------------------------------- the packer

/**
 * Turn hours + capacity into a calendar.
 *
 * Packing is cumulative:
 *
 *   cum(i)       = Σ estimateHours of tasks 0..i
 *   weekIndex(i) = ceil(cum(i) / hoursPerWeek) - 1
 *
 * so a task is filed under the week its LAST hour falls in. Two consequences,
 * both intended: several small tasks share a week, and a task larger than one
 * week's capacity lands in a later week with the weeks before it empty — it is
 * being worked on throughout, and it is only *due* at the end. No special case
 * for oversized tasks, which is the point of counting cumulatively.
 */
export function buildSchedule(roadmap: Roadmap, today: Date): Schedule {
  const hoursPerWeek = normalizePace(roadmap.hoursPerWeek);
  const start = startOfDay(parseISODate(roadmap.startDate ?? "") ?? today);
  const now = startOfDay(today);

  // Defensive sort: a packing rule that depends on order must not depend on
  // the order rows happened to come back in.
  const tasks = [...(roadmap.tasks ?? [])].sort((a, b) => a.position - b.position);

  let cumulative = 0;
  const placements = tasks.map((task) => {
    const hours = taskHours(task);
    cumulative += hours;
    return {
      task,
      hours,
      index: Math.max(0, ceilWeeks(cumulative, hoursPerWeek) - 1),
    };
  });

  const totalHours = cumulative;
  const totalWeeks = tasks.length === 0 ? 0 : Math.max(1, estimateWeeks(totalHours, hoursPerWeek));

  const weeks: ScheduleWeek[] = Array.from({ length: totalWeeks }, (_, index) => ({
    index,
    start: addDays(start, index * 7),
    end: addDays(start, index * 7 + 6),
    tasks: [],
    hours: 0,
  }));

  for (const placement of placements) {
    const week = weeks[Math.min(placement.index, totalWeeks - 1)];
    if (!week) continue;
    week.tasks.push(placement.task);
    week.hours += placement.hours;
  }

  // An empty roadmap finishes the day it starts rather than pretending to a
  // week of work that does not exist.
  const finishDate = weeks.length > 0 ? weeks[weeks.length - 1].end : start;

  const elapsedDays = daysBetween(start, now);
  const rawWeekIndex = Math.floor(elapsedDays / 7);
  const currentWeekIndex = Math.min(
    Math.max(0, totalWeeks - 1),
    Math.max(0, rawWeekIndex),
  );

  const hoursDone = placements.reduce(
    (sum, { task, hours }) => sum + (task.done ? hours : doneStepHours(task)),
    0,
  );

  // Whole weeks only: three days into week 0 the user owes nothing yet.
  const weeksElapsed = Math.min(totalWeeks, Math.max(0, rawWeekIndex));

  /*
   * Debt is measured against work that was actually DUE, never against a
   * straight-line hoursPerWeek × weeksElapsed accrual.
   *
   * The packer files a task under the week its LAST hour falls in, so a task
   * bigger than one week's capacity is *being worked* through the weeks before
   * it and is only owed at the end. Straight-line accrual doesn't know that:
   * eight 12h tasks at 8h/week would report the plan a week behind on day 7
   * with nothing late, re-planning would reset the start date, and the same
   * line would return seven days later, forever.
   *
   * A task is due at the end of its week, so it enters the debt only once that
   * week has fully passed — index < weeksElapsed. Inside its own week it owes
   * nothing.
   */
  const hoursDue = placements.reduce(
    (sum, { hours, index }) => (index < weeksElapsed ? sum + hours : sum),
    0,
  );

  // Floor, so half a week's slippage reads as on track. Falling behind must
  // not feel like failure — it is a re-plan, not a red badge. Work finished
  // ahead of its week counts against the backlog too, which is what keeps a
  // user who is working out of order from being told they have slipped.
  const weeksBehind = Math.max(0, Math.floor((hoursDue - hoursDone) / hoursPerWeek));

  return {
    weeks,
    totalWeeks,
    currentWeekIndex,
    finishDate,
    today: now,
    hoursDone,
    hoursDue,
    weeksBehind,
  };
}

/** Hours banked inside a task that is still open, from its finished steps. */
function doneStepHours(task: RoadmapTask): number {
  const steps = task.steps ?? [];
  const minutes = steps.reduce(
    (sum, step) => sum + (step.done && Number.isFinite(step.minutes) ? step.minutes : 0),
    0,
  );
  return minutes / 60;
}

// ---------------------------------------------------------------- progress

/**
 * What a progress reading is counting. A roadmap generated before steps
 * existed has none to count, so its rows are whole tasks — and any readout
 * reporting them has to say "tasks" rather than claim steps that aren't there.
 */
export type RowUnit = "step" | "task";

export interface RowCount {
  /** Checkable rows in the set. */
  total: number;
  /** Rows already closed. */
  done: number;
  /** The noun those rows are — "step" as soon as any task in the set has steps. */
  unit: RowUnit;
}

/**
 * Checkable rows in a set of tasks, step-weighted, so a bar reading them moves
 * several times a week instead of once a fortnight. A task with no steps is one
 * row — roadmaps written before steps existed still report progress — and a task
 * closed by hand counts every one of its rows, because the escape hatch must not
 * leave the readout claiming work is outstanding.
 *
 * The number was always right for those older plans; the NOUN was not, which is
 * what `unit` fixes. A set whose tasks all predate steps is measured in tasks
 * and says so. A mixed set reads as steps: it is the dominant row and the only
 * honest single noun for a set that holds both.
 *
 * It takes tasks rather than a schedule because the whole plan and one week are
 * the same reading at two scopes — RoadmapView passes every task, ThisWeek
 * passes one week's — and the two must not drift into two implementations.
 */
export function countRows(tasks: RoadmapTask[]): RowCount {
  let total = 0;
  let done = 0;
  let unit: RowUnit = "task";
  for (const task of tasks) {
    const steps = task.steps ?? [];
    if (steps.length > 0) unit = "step";
    const rows = steps.length || 1;
    total += rows;
    done += task.done ? rows : steps.filter((step) => step.done).length;
  }
  return { total, done, unit };
}

/** A count and its noun, agreeing: "8 steps", "1 step", "1 task". */
export function formatRowCount(count: number, unit: RowUnit): string {
  return `${count} ${count === 1 ? unit : `${unit}s`}`;
}

// ------------------------------------------------------------ calendar shape

/**
 * Every step in the plan as a dated block, in the order it should be worked.
 * A task with no steps — a roadmap generated before steps existed — becomes a
 * single block for the whole task, so old plans map too.
 *
 * Done steps are included: this is a pure projection, and what to do with
 * finished work is the caller's decision.
 */
export function toPlannedBlocks(schedule: Schedule): PlannedBlock[] {
  const blocks: PlannedBlock[] = [];

  for (const week of schedule.weeks) {
    for (const task of week.tasks) {
      const steps = [...(task.steps ?? [])].sort((a, b) => a.position - b.position);

      if (steps.length === 0) {
        blocks.push({
          id: task.id,
          title: task.title,
          detail: task.why,
          minutes: Math.round(taskHours(task) * 60),
          weekStart: week.start,
          weekEnd: week.end,
        });
        continue;
      }

      for (const step of steps) {
        blocks.push({
          id: step.id,
          title: step.title,
          detail: step.detail,
          minutes: step.minutes,
          weekStart: week.start,
          weekEnd: week.end,
        });
      }
    }
  }

  return blocks;
}
