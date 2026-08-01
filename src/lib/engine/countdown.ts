import {
  calendarFor,
  internshipApplicationWindowFor,
  placementRegistrationFor,
} from "../data/calendar";
import type { CalendarEvent } from "../data/types";
import { completedSemesters } from "./record";

/**
 * The countdown — `docs/product.md` §9.1 and `docs/platform.md` §3.2.
 *
 * §9.1 concedes the countdown has low standalone value. It has high value as
 * the *wait*: while eligibility resolves, the screen counts up the weeks, the
 * exam windows and the usable hours. Dead time becomes emotional priming and
 * it costs one component.
 *
 * It is still pure calendar arithmetic. `docs/brand.md` §10.3 permits it to
 * count up — one of only two carve-outs in the whole motion system — precisely
 * because it is a wait rather than a measurement being reported.
 */

export type Countdown = {
  weeks: number;
  examWindows: number;
  /** Hours left after exam windows are removed, at a stated weekly rate. */
  usableHours: number;
  hoursPerWeek: number;
  deadlineLabel: string;
  deadlineOn: string;
  deadlineProjected: boolean;
  protectedWindows: CalendarEvent[];
};

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

/** The rate the countdown assumes before the student has told us theirs. */
export const ASSUMED_HOURS_PER_WEEK = 8;

export function buildCountdown(
  gradYear: number,
  universityCode: string,
  asOf: Date = new Date(),
  hoursPerWeek: number = ASSUMED_HOURS_PER_WEEK,
): Countdown {
  const calendar = calendarFor(universityCode);
  const done = completedSemesters(gradYear, asOf);

  // A student with a summer left is racing the internship window — the PPO
  // route, which §11.1 ranks as the highest-leverage move available. Only once
  // that is gone does placement registration become the binding date.
  const internship = internshipApplicationWindowFor(gradYear);
  const registration = placementRegistrationFor(gradYear);
  const deadline =
    done <= 5 && new Date(internship.endsOn) > asOf ? internship : registration;

  const end = new Date(deadline.endsOn);
  const weeks = Math.max(
    0,
    Math.round((end.getTime() - asOf.getTime()) / MS_WEEK),
  );

  const protectedWindows = calendar.filter(
    (e) =>
      e.kind === "exam" &&
      new Date(e.endsOn) >= asOf &&
      new Date(e.startsOn) <= end,
  );

  const examWeeks = protectedWindows.reduce((sum, e) => {
    const from = Math.max(new Date(e.startsOn).getTime(), asOf.getTime());
    const to = Math.min(new Date(e.endsOn).getTime(), end.getTime());
    return sum + Math.max(0, Math.round((to - from) / MS_WEEK));
  }, 0);

  // Two weeks of revision in front of each window are not free either.
  const revisionWeeks = protectedWindows.length * 2 * 0.5;
  const usableWeeks = Math.max(0, weeks - examWeeks - revisionWeeks);

  return {
    weeks,
    examWindows: protectedWindows.length,
    usableHours: Math.round(usableWeeks * hoursPerWeek),
    hoursPerWeek,
    deadlineLabel: deadline.label,
    deadlineOn: deadline.endsOn,
    deadlineProjected: deadline.projected ?? false,
    protectedWindows,
  };
}
