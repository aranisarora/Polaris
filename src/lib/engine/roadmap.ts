import { ACTIONS, ACTION_BY_SLUG, CATALOGUE_VERSION } from "../data/actions";
import {
  calendarFor,
  internshipApplicationWindowFor,
  placementRegistrationFor,
} from "../data/calendar";
import {
  ACTION_CATEGORY_ORDER,
  type Action,
  type ActionCategory,
  type CalendarEvent,
} from "../data/types";
import type { Audit } from "./audit";
import type { Ledger } from "./eligibility";
import { completedSemesters, type StudentRecord } from "./record";

/**
 * The roadmap engine — `docs/product.md` §9.4 and §11.
 *
 * Closable gaps scheduled against exam windows, placement dates and the
 * registration cutoff. Every deadline derives from the real calendar; none is
 * invented.
 *
 * Four rules from §11.3 are enforced here rather than left to the UI:
 *
 * - Tasks are sized to one week. The catalogue holds no item that does not fit.
 * - The plan is long, the view is short. `activeTasks` returns at most three.
 * - Nothing is scheduled inside an exam window. Those weeks have zero capacity
 *   and a revision buffer in front of them.
 * - Leverage order decides sequence, not convenience: eligibility repair before
 *   anything else, because it is binary and it gates the rest.
 */

export const ROADMAP_VERSION = `roadmap-2026.08.02+${CATALOGUE_VERSION}`;

export type Constraints = {
  /** The real week, not the ideal one. */
  hoursPerWeek: number;
  relocate: "bengaluru" | "anywhere" | "depends";
  minPackageLpa?: number;
};

export const DEFAULT_CONSTRAINTS: Constraints = {
  hoursPerWeek: 8,
  relocate: "bengaluru",
};

export type RoadmapTask = {
  id: string;
  action: Action;
  /** 0-indexed week from the plan start. */
  week: number;
  startsOn: string;
  dueOn: string;
  status: "todo" | "done" | "skipped";
  /** Why this task exists for this student, in one line. */
  because: string;
  /** How many companies this task's completion would open, where known. */
  opens?: number;
};

export type RoadmapPhase = {
  key: string;
  label: string;
  /** "Aug — Sep" */
  range: string;
  weekRange: string;
  category?: ActionCategory;
  headline?: string;
  body?: string;
  tasks: RoadmapTask[];
  /** Set for a protected exam window. */
  protectedWindow?: CalendarEvent;
};

export type Roadmap = {
  version: string;
  generatedAt: string;
  constraints: Constraints;
  startsOn: string;
  deadline: { label: string; on: string; projected: boolean };
  totalWeeks: number;
  /** Weeks with capacity, after exam windows are removed. */
  usableWeeks: number;
  usableHours: number;
  tasks: RoadmapTask[];
  phases: RoadmapPhase[];
  /** Windows the plan schedules around. */
  protectedWindows: CalendarEvent[];
};

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

function addWeeks(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_WEEK);
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const copy = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  // Weeks run Monday to Sunday; tasks fall due on the Sunday.
  const day = copy.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  return new Date(copy.getTime() + delta * 24 * 60 * 60 * 1000);
}

function monthShort(d: Date): string {
  return d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
}

function overlapsWeek(event: CalendarEvent, weekStart: Date): boolean {
  const weekEnd = addWeeks(weekStart, 1);
  return (
    new Date(event.startsOn) < weekEnd && new Date(event.endsOn) >= weekStart
  );
}

function weekIndexOf(date: Date, start: Date, totalWeeks: number): number {
  const idx = Math.floor((date.getTime() - start.getTime()) / MS_WEEK);
  return Math.max(0, Math.min(totalWeeks - 1, idx));
}

function nextEvent(
  calendar: CalendarEvent[],
  kind: CalendarEvent["kind"],
  after: Date,
): CalendarEvent | undefined {
  return calendar
    .filter((e) => e.kind === kind && new Date(e.endsOn) > after)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0];
}

/**
 * Turn an anchor into a week. Returns `undefined` when the calendar has no
 * matching window, in which case the task falls back to greedy placement
 * rather than inventing a date — `docs/product.md` §9.4 permits no invented
 * deadlines, and a wrong one is worse than a soft one.
 */
function anchorWeek(
  action: Action,
  calendar: CalendarEvent[],
  internshipWindow: CalendarEvent,
  start: Date,
  totalWeeks: number,
  asOf: Date,
): number | undefined {
  if (!action.anchor) return undefined;

  switch (action.anchor) {
    case "before-supplementary": {
      const supp = nextEvent(calendar, "supplementary", asOf);
      if (!supp) return undefined;
      // Registration closes well before the paper. Six weeks ahead of the
      // window is the latest a student can act and still be safe.
      const target = new Date(
        new Date(supp.startsOn).getTime() - 6 * MS_WEEK,
      );
      return weekIndexOf(target < asOf ? asOf : target, start, totalWeeks);
    }
    case "at-supplementary": {
      const supp = nextEvent(calendar, "supplementary", asOf);
      if (!supp) return undefined;
      return weekIndexOf(new Date(supp.endsOn), start, totalWeeks);
    }
    case "at-exam": {
      const exam = nextEvent(calendar, "exam", asOf);
      if (!exam) return undefined;
      return weekIndexOf(new Date(exam.endsOn), start, totalWeeks);
    }
    case "after-results": {
      const exam = nextEvent(calendar, "exam", asOf);
      if (!exam) return undefined;
      const results = new Date(new Date(exam.endsOn).getTime() + 4 * MS_WEEK);
      return weekIndexOf(results, start, totalWeeks);
    }
    case "internship-applications":
      return weekIndexOf(new Date(internshipWindow.startsOn), start, totalWeeks);
  }
}

/**
 * Which actions this student needs. Selection is where the engine stops being
 * generic: the catalogue is the same for everyone, the selection is not.
 */
function selectActions(
  record: StudentRecord,
  ledger: Ledger,
  audit: Audit,
  asOf: Date,
): { action: Action; because: string; opens?: number }[] {
  const picked: { action: Action; because: string; opens?: number }[] = [];
  const add = (slug: string, because: string, opens?: number) => {
    const action = ACTION_BY_SLUG.get(slug);
    if (action && !picked.some((p) => p.action.slug === slug)) {
      picked.push({ action, because, opens });
    }
  };

  // ── Eligibility repair. Highest leverage, and the only category with a hard
  // external deadline attached.
  const backlogGroup = ledger.groups.find(
    (g) => g.binding.field === "backlogs",
  );
  if (record.activeBacklogs > 0) {
    add(
      "register-supplementary",
      "Registration closes weeks before the exam. This is the only task on the plan that cannot be recovered if it is late.",
      backlogGroup?.opens,
    );
    add(
      "clear-backlog-subject",
      backlogGroup
        ? `Clearing these opens ${backlogGroup.opens} ${backlogGroup.opens === 1 ? "company" : "companies"} at once.`
        : "Active backlogs gate more companies than any other single fact about you.",
      backlogGroup?.opens,
    );
    add("upload-marksheet", "This is the task that re-runs your whole ledger.");
  }

  const cgpaGroup = ledger.groups.find((g) => g.binding.field === "ug");
  if (cgpaGroup?.binding.trajectory?.kind === "reachable") {
    add(
      "cgpa-semester-target",
      `${cgpaGroup.binding.fix} That opens ${cgpaGroup.opens} ${cgpaGroup.opens === 1 ? "company" : "companies"}.`,
      cgpaGroup.opens,
    );
  }

  // ── Aptitude. §11.1 ranks it second and calls it the most underrated: the
  // "employable but not hired" gap is often this round, and it is pure practice.
  add(
    "aptitude-baseline",
    "You cannot plan the practice until you know which section is costing the marks.",
  );
  add("aptitude-quant-drill", "The section that rewards repetition most.");
  add("aptitude-logical-drill", "The patterns are finite and they repeat across every company on your list.");
  add("aptitude-full-mock", "Sectional practice does not test pacing, and pacing is what fails on the day.");

  // ── Evidence hygiene that costs almost nothing.
  if (!audit.bySection.evidence.some((f) => f.slug === "leetcode-connect")) {
    add("leetcode-connect", "One field, and every DSA task after it verifies itself.");
  }

  // ── DSA, against the bar the open set actually sets.
  add("dsa-arrays-strings", "Every coding round on your list opens here.");
  add("dsa-move-to-mediums", "An easy-heavy profile predicts nothing about the rounds you will sit.");
  add("dsa-hashing-two-pointers", "The two patterns that most often turn a brute-force answer into an accepted one.");

  const wantsHigherTier = [...ledger.open, ...ledger.reach].some(
    (v) => v.company.tier !== "services",
  );
  if (wantsHigherTier) {
    add("dsa-trees-graphs", "Where the product and GCC rounds separate from the services rounds.");
    add("dsa-timed-contest", "Solving well with unlimited time is a different skill from the one being tested.");
  }

  // ── The differentiating project. Always, regardless of the audit — Hard
  // Rule 5 makes differentiation the objective function, not an extra.
  const projectReason =
    audit.differentiatingSignal === "none"
      ? "Your differentiating signal is: none. This track is the fix."
      : "The one project you can defend is what the interview will run on.";
  for (const action of ACTIONS.filter((a) => a.category === "project")) {
    add(action.slug, projectReason);
  }

  // ── Internship. Only worth scheduling while a summer remains.
  const done = completedSemesters(record.gradYear, asOf);
  if (done <= 5) {
    add("internship-shortlist", "A summer internship that converts is the highest-leverage move available to you this year.");
    add("internship-applications", "Applications sent late compete against a shortlist that has already formed.");
    if (wantsHigherTier) {
      add(
        "internship-outreach",
        "The higher-paying centres in Bangalore mostly do not come to campus. A direct approach is the route that exists instead.",
      );
    }
  }

  // ── Core CS.
  add("core-cs-dbms", "Asked in almost every technical round on your list.");
  add("core-cs-os", "The second most-asked core subject.");
  add("core-cs-networks", "One question carries most of the syllabus.");

  // ── Hygiene, last, once there is something real to tidy.
  add("github-commit-habit", "A history spread over weeks reads as sustained work.");
  add("github-profile", "This is what opens when someone clicks the link on your CV.");
  add("cv-export", "Your CV has been rebuilding itself. This is where you check it.");
  add("linkedin-headline", "Recruiters sourcing outside campus search here first.");

  return picked;
}

/** Stable topological order: prerequisites first, then leverage order. */
function order(
  picked: { action: Action; because: string; opens?: number }[],
): typeof picked {
  const bySlug = new Map(picked.map((p) => [p.action.slug, p]));
  const out: typeof picked = [];
  const seen = new Set<string>();
  const visiting = new Set<string>();

  const byLeverage = [...picked].sort((a, b) => {
    const ca =
      ACTION_CATEGORY_ORDER.indexOf(a.action.category) -
      ACTION_CATEGORY_ORDER.indexOf(b.action.category);
    if (ca !== 0) return ca;
    // Within a category: deadline-driven first, then cheapest win first —
    // a first win inside seven days is what stops the plan being abandoned.
    if (a.action.deadlineSensitive !== b.action.deadlineSensitive) {
      return a.action.deadlineSensitive ? -1 : 1;
    }
    return a.action.effortHours - b.action.effortHours;
  });

  const visit = (slug: string) => {
    if (seen.has(slug) || visiting.has(slug)) return;
    const node = bySlug.get(slug);
    if (!node) return;
    visiting.add(slug);
    for (const pre of node.action.prerequisites) visit(pre);
    visiting.delete(slug);
    seen.add(slug);
    out.push(node);
  };

  for (const p of byLeverage) visit(p.action.slug);
  return out;
}

export function buildRoadmap(
  record: StudentRecord,
  ledger: Ledger,
  audit: Audit,
  constraints: Constraints = DEFAULT_CONSTRAINTS,
  asOf: Date = new Date(),
): Roadmap {
  const calendar = calendarFor(record.universityCode);

  // Anything the plan must not schedule into.
  const allProtected: CalendarEvent[] = [
    ...calendar.filter((e) => e.kind === "exam"),
    ...(record.manualExamWindow
      ? [
          {
            universityCode: record.universityCode,
            kind: "exam" as const,
            label: "Your exam window",
            startsOn: record.manualExamWindow.startsOn,
            endsOn: record.manualExamWindow.endsOn,
            sources: [],
          },
        ]
      : []),
  ].filter((e) => new Date(e.endsOn) >= asOf);

  // The deadline the whole plan runs at. For a student with a summer left that
  // is the internship application window — the PPO route — not the placement
  // registration a year later.
  const done = completedSemesters(record.gradYear, asOf);
  const internship = internshipApplicationWindowFor(record.gradYear);
  const registration = placementRegistrationFor(record.gradYear);
  const deadlineEvent =
    done <= 5 && new Date(internship.endsOn) > asOf ? internship : registration;

  const start = startOfWeek(asOf);
  const end = new Date(deadlineEvent.endsOn);
  const totalWeeks = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / MS_WEEK),
  );

  // Only windows inside the plan's horizon. The calendar runs years ahead;
  // showing a student a December 2029 exam on a plan that ends in March is
  // noise, and noise on this surface reads as padding.
  const protectedWindows = allProtected.filter(
    (e) => new Date(e.startsOn) <= end,
  );

  // Capacity per week. Exam weeks are zero, and the two weeks before an exam
  // window are halved — revision is real work and pretending otherwise is how
  // a plan gets abandoned in December.
  const capacity: number[] = [];
  for (let w = 0; w < totalWeeks; w++) {
    const weekStart = addWeeks(start, w);
    const inExam = protectedWindows.some((e) => overlapsWeek(e, weekStart));
    if (inExam) {
      capacity.push(0);
      continue;
    }
    const revisionSoon = protectedWindows.some((e) => {
      const gap = new Date(e.startsOn).getTime() - weekStart.getTime();
      return gap > 0 && gap <= 2 * MS_WEEK;
    });
    capacity.push(
      revisionSoon ? constraints.hoursPerWeek * 0.5 : constraints.hoursPerWeek,
    );
  }

  const usableWeeks = capacity.filter((c) => c > 0).length;
  const usableHours = Math.round(capacity.reduce((a, b) => a + b, 0));

  // ── Schedule. Greedy fill, respecting prerequisite order and week capacity.
  const picked = order(selectActions(record, ledger, audit, asOf));
  const remaining = [...capacity];
  const tasks: RoadmapTask[] = [];
  let cursor = 0;

  for (const { action, because, opens } of picked) {
    // A task never starts before its prerequisites have finished.
    const preFinish = Math.max(
      0,
      ...action.prerequisites.map((slug) => {
        const t = tasks.find((x) => x.action.slug === slug);
        return t ? t.week + 1 : 0;
      }),
    );

    // A calendar-anchored task is pinned, not placed. Its deadline is the
    // whole content of the task, so capacity does not get a vote — the exam
    // is on that date whether or not the week was already full.
    const pinned = anchorWeek(
      action,
      calendar,
      internship,
      start,
      totalWeeks,
      asOf,
    );

    let week: number;

    if (pinned !== undefined) {
      week = Math.max(pinned, preFinish);
      // Anchored work still consumes hours, so the rest of the plan sees the
      // load. Revision for a backlog paper is why December is not free.
      let hours = action.effortHours;
      for (let w = week; w >= 0 && hours > 0; w--) {
        const take = Math.min(hours, Math.max(0, remaining[w]));
        remaining[w] -= take;
        hours -= take;
      }
    } else {
      week = Math.max(cursor, preFinish);
      let hours = action.effortHours;

      // Find the first week with room.
      while (week < totalWeeks && remaining[week] <= 0) week += 1;
      if (week >= totalWeeks) week = totalWeeks - 1;

      while (hours > 0 && week < totalWeeks) {
        const take = Math.min(hours, Math.max(0, remaining[week]));
        remaining[week] -= take;
        hours -= take;
        if (hours > 0) {
          week += 1;
          while (week < totalWeeks && remaining[week] <= 0) week += 1;
        }
      }
    }

    if (week >= totalWeeks) week = totalWeeks - 1;

    const weekStart = addWeeks(start, week);
    const dueOn = addWeeks(weekStart, 1);
    dueOn.setUTCDate(dueOn.getUTCDate() - 1);

    tasks.push({
      id: action.slug,
      action,
      week,
      startsOn: isoDay(weekStart),
      dueOn: isoDay(dueOn),
      status: "todo",
      because,
      opens,
    });

    // Only advance the shared cursor for tasks that must be done in sequence.
    // Practice tracks run alongside the project rather than after it.
    if (action.category === "eligibility") cursor = Math.max(cursor, week);
  }

  tasks.sort((a, b) => a.week - b.week);

  // ── Phases, for the timeline view.
  const phases: RoadmapPhase[] = [];
  const byCategory = new Map<ActionCategory, RoadmapTask[]>();
  for (const t of tasks) {
    const list = byCategory.get(t.action.category) ?? [];
    list.push(t);
    byCategory.set(t.action.category, list);
  }

  for (const category of ACTION_CATEGORY_ORDER) {
    const list = byCategory.get(category);
    if (!list?.length) continue;
    const first = new Date(list[0].startsOn);
    const last = new Date(list[list.length - 1].dueOn);
    phases.push({
      key: category,
      label: CATEGORY_HEADLINE[category].label,
      range:
        monthShort(first) === monthShort(last)
          ? `${monthShort(first)} ${first.getUTCFullYear()}`
          : `${monthShort(first)} — ${monthShort(last)}`,
      weekRange:
        list.length === 1
          ? `Week ${list[0].week + 1}`
          : `Weeks ${list[0].week + 1}–${list[list.length - 1].week + 1}`,
      category,
      headline: CATEGORY_HEADLINE[category].headline,
      body: CATEGORY_HEADLINE[category].body,
      tasks: list,
    });
  }

  for (const window of protectedWindows) {
    const from = new Date(window.startsOn);
    phases.push({
      key: `protected-${window.startsOn}`,
      label: "Protected",
      range: `${monthShort(from)} ${from.getUTCFullYear()}`,
      weekRange: "Nothing scheduled",
      protectedWindow: window,
      tasks: [],
    });
  }

  phases.sort((a, b) => {
    const aDate = a.protectedWindow?.startsOn ?? a.tasks[0]?.startsOn ?? "";
    const bDate = b.protectedWindow?.startsOn ?? b.tasks[0]?.startsOn ?? "";
    return aDate.localeCompare(bDate);
  });

  return {
    version: ROADMAP_VERSION,
    generatedAt: asOf.toISOString(),
    constraints,
    startsOn: isoDay(start),
    deadline: {
      label: deadlineEvent.label,
      on: deadlineEvent.endsOn,
      projected: deadlineEvent.projected ?? false,
    },
    totalWeeks,
    usableWeeks,
    usableHours,
    tasks,
    phases,
    protectedWindows,
  };
}

const CATEGORY_HEADLINE: Record<
  ActionCategory,
  { label: string; headline: string; body: string }
> = {
  eligibility: {
    label: "Eligibility repair",
    headline: "Eligibility repair.",
    body: "Binary, verifiable, and it gates everything else. Your highest-value weeks.",
  },
  aptitude: {
    label: "Aptitude",
    headline: "Aptitude.",
    body: "Underrated and the highest return per hour on this plan. It decides more outcomes than DSA does at this tier, and it rewards repetition.",
  },
  dsa: {
    label: "DSA",
    headline: "DSA, against the real bar.",
    body: "Patterns and volume, sized to what the companies on your list actually set.",
  },
  project: {
    label: "Your project",
    headline: "Your project.",
    body: "Shipped, deployed, used by someone who is not you. This is the part that separates you.",
  },
  internship: {
    label: "Summer internships",
    headline: "Summer internships.",
    body: "The PPO route — the highest-leverage move available to a third-year.",
  },
  "core-cs": {
    label: "Core CS",
    headline: "Core CS.",
    body: "OS, DBMS, networks. Interview fodder, answerable from your own project.",
  },
  hygiene: {
    label: "Artefact hygiene",
    headline: "Artefact hygiene.",
    body: "CV, GitHub and LinkedIn polished last, once there is something real on them.",
  },
};

/** §11.3: surface at most three. The rest of the plan stays visible elsewhere. */
export function activeTasks(roadmap: Roadmap, limit = 3): RoadmapTask[] {
  return roadmap.tasks.filter((t) => t.status === "todo").slice(0, limit);
}
