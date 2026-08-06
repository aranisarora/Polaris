"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { ChoiceCard, ChoiceCardGroup } from "@/components/ui";
import { estimateWeeks, formatDay } from "@/lib/schedule";

/**
 * The one question the schedule is built from: how much time a week.
 *
 * The readout underneath recomputes on every change — the point of asking is
 * that the user watches the finish date move, so the trade is visible before
 * they commit rather than discovered a month in. When the maths is ugly we
 * say so in plain words instead of hiding it; that line is information, not
 * an error, so it carries no ember and blocks nothing.
 *
 * Works before generation (a tier band's midpoint, hedged) and after (the
 * plan's real summed hours), which is why `totalHours` arrives as a prop.
 */

export interface PaceChooserProps {
  /** The chosen weekly capacity, in hours. */
  value: number;
  onChange: (hoursPerWeek: number) => void;
  /**
   * Hours the whole plan is reckoned at — the tier band's midpoint before
   * generation, the summed task estimates after.
   */
  totalHours: number;
  /**
   * Day one of the plan, ISO `YYYY-MM-DD`. Today's date before generation,
   * the roadmap's `startDate` after. Weeks are counted from here.
   */
  startDate: string;
  /**
   * The day the finish date is read against, ISO `YYYY-MM-DD`. Passed in for
   * the reason lib/schedule.ts takes one everywhere: this component must not
   * read the clock, or a server render and its hydration could disagree. It
   * also decides whether the finish carries its year — on /roadmap this readout
   * sits inches below the header's own finish date, and the two must not speak
   * different dialects about the same day.
   */
  today: string;
  /**
   * `totalHours` is a band estimate rather than measured work. Default true:
   * hedging costs nothing, and claiming a precision we do not have is the one
   * thing this readout must never do.
   */
  approximate?: boolean;
  /** The question, shown above the cards and naming the group to assistive tech. */
  question?: string;
  className?: string;
}

const PACE_OPTIONS = [
  { hours: 4, title: "A couple of evenings", description: "4 hours a week" },
  { hours: 8, title: "Most evenings", description: "8 hours a week" },
  { hours: 12, title: "Evenings and a weekend day", description: "12 hours a week" },
  { hours: 25, title: "I'm full-time on this", description: "25 hours a week" },
] as const;

/** Past this, the plan is long enough that the pace deserves a comment. */
const LONG_PLAN_WEEKS = 20;

/**
 * Local midnight, mirroring lib/schedule.ts. `new Date("2026-08-24")` parses
 * as UTC and reads as the 23rd everywhere west of Greenwich, which would
 * misdate the finish for every US user.
 */
function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The last day of week N, counted in calendar days so a DST crossing cannot
 * shift it, then written by the one day formatter the whole product shares —
 * so this readout and the header's `Finishes …` are the same string for the
 * same day, year and all. An unreadable `today` falls back to the start date
 * rather than dropping the readout: the year rule then still fires when the
 * plan crosses New Year, which is the case that is ambiguous without it.
 */
function finishLabel(startDate: string, weeks: number, today: string): string | null {
  const start = parseISODate(startDate);
  if (!start || weeks <= 0) return null;
  const finish = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + weeks * 7 - 1,
  );
  return formatDay(finish, parseISODate(today) ?? start);
}

export function PaceChooser({
  value,
  onChange,
  totalHours,
  startDate,
  today,
  approximate = true,
  question = "How much time can you give this each week?",
  className,
}: PaceChooserProps) {
  const weeks = estimateWeeks(totalHours, value);
  const finish = finishLabel(startDate, weeks, today);

  // A pace outside the four bands (an older roadmap, a hand-edited row) must
  // leave every card focusable rather than selecting none and stranding the
  // keyboard on a group with no tab stop. The readout still uses the real
  // number, so the maths stays honest either way.
  const selected = PACE_OPTIONS.some((option) => option.hours === value)
    ? String(value)
    : null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="text-base font-medium text-starlight">{question}</p>

      <ChoiceCardGroup
        label={question}
        value={selected}
        onChange={(next) => onChange(Number(next))}
        className="sm:grid-cols-2"
      >
        {PACE_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.hours}
            value={String(option.hours)}
            title={option.title}
            description={option.description}
          />
        ))}
      </ChoiceCardGroup>

      {/* Announced on change: a sighted user watches the date move, and a
          screen-reader user is told it moved. */}
      <div aria-live="polite" className="flex flex-col gap-2">
        {weeks > 0 && (
          <p className="mono-label text-moonlight">
            <span className="text-starlight">
              {approximate ? "≈ " : ""}
              {weeks} {weeks === 1 ? "week" : "weeks"}
            </span>
            {finish && (
              <>
                {" · finishes "}
                {approximate ? "around " : ""}
                {finish}
              </>
            )}
          </p>
        )}

        {weeks > LONG_PLAN_WEEKS && (
          <p className="max-w-prose text-sm leading-relaxed text-moonlight">
            At {value}h a week this is {weeks} weeks. A heavier pace, or a
            nearer target, would land sooner.
          </p>
        )}
      </div>
    </div>
  );
}
