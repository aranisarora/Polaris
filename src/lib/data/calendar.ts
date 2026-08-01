import type { CalendarEvent, Source } from "./types";

/**
 * The VTU calendar — asset 3 of `docs/product.md` §13.1.
 *
 * This is the layer that comes free across ~200 colleges and is the reason VTU
 * is the starting point (§6). Its only job in the product is negative: the
 * roadmap must never schedule work into an exam window.
 *
 * ## What is published and what is derived
 *
 * VTU publishes each semester's calendar as a scanned PDF, per scheme and per
 * semester, a few months ahead. Two consequences:
 *
 * 1. Windows more than a semester out do not exist yet. They are derived from
 *    VTU's long-standing term pattern and carry `projected: true`. Every
 *    surface that renders a projected window says so.
 * 2. Autonomous colleges set their own dates entirely, so for those the student
 *    enters two dates a semester and those override everything here.
 *
 * A projected window is worth having: being approximately right about December
 * keeps three weeks of revision clear, and being silent about it does not.
 */

const VTU_CALENDAR_PAGE: Source = {
  label: "VTU academic calendar",
  url: "https://vtu.ac.in/academic-calendar/",
  checkedOn: "2026-08-02",
};

/**
 * VTU's term pattern, as month/day pairs. Odd semesters (1, 3, 5, 7) examine in
 * December–January; even semesters (2, 4, 6, 8) in June–July.
 */
const TERM_PATTERN = {
  odd: {
    teachingStart: { month: 9, day: 15 },
    examStart: { month: 12, day: 21 },
    /** Runs into the following calendar year. */
    examEnd: { month: 1, day: 24, nextYear: true },
    resultsBy: { month: 2, day: 21, nextYear: true },
  },
  even: {
    teachingStart: { month: 2, day: 16 },
    examStart: { month: 6, day: 14 },
    examEnd: { month: 7, day: 18 },
    resultsBy: { month: 8, day: 16 },
  },
} as const;

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Windows VTU has actually notified. These override anything derived for the
 * same period, and drop the `projected` flag.
 */
const PUBLISHED: CalendarEvent[] = [
  {
    universityCode: "VTU",
    kind: "exam",
    label: "Semester end examinations · Dec 2025 / Jan 2026",
    startsOn: "2025-12-22",
    endsOn: "2026-01-24",
    semesters: [1, 3, 5, 7],
    sources: [
      {
        label: "VTU — Schedule of events, Dec 2025 / Jan 2026 examinations",
        url: "https://vtu.ac.in/en/2026/01/38870/",
        checkedOn: "2026-08-02",
      },
    ],
  },
  {
    universityCode: "VTU",
    kind: "exam",
    label: "Semester end examinations · June / July 2026",
    startsOn: "2026-06-15",
    endsOn: "2026-07-18",
    semesters: [2, 4, 6, 8],
    sources: [
      {
        label: "VTU — Schedule of events, June / July 2026 examinations",
        url: "https://vtu.ac.in/en/2026/05/40162/",
        checkedOn: "2026-08-02",
      },
      {
        label: "VTU — UG/PG semester end examination timetable, June / July 2026",
        url: "https://vtu.ac.in/en/2026/05/40157/",
        checkedOn: "2026-08-02",
      },
    ],
  },
];

/**
 * Derive the windows for one academic year starting in `startYear`
 * (so 2026 means the 2026–27 session).
 */
function deriveYear(startYear: number): CalendarEvent[] {
  const odd = TERM_PATTERN.odd;
  const even = TERM_PATTERN.even;

  return [
    {
      universityCode: "VTU",
      kind: "exam",
      label: `Semester end examinations · Dec ${startYear} / Jan ${startYear + 1}`,
      startsOn: iso(startYear, odd.examStart.month, odd.examStart.day),
      endsOn: iso(startYear + 1, odd.examEnd.month, odd.examEnd.day),
      semesters: [1, 3, 5, 7],
      projected: true,
      sources: [VTU_CALENDAR_PAGE],
    },
    {
      universityCode: "VTU",
      kind: "supplementary",
      /**
       * VTU runs backlog papers alongside the regular examination of the same
       * parity semester, which is why a backlog picked up in an odd semester
       * has its next clearing opportunity the following December–January. This
       * single fact is what makes eligibility repair a schedulable task rather
       * than a wish.
       */
      label: `Backlog papers, sat alongside the Dec ${startYear} / Jan ${startYear + 1} examinations`,
      startsOn: iso(startYear, odd.examStart.month, odd.examStart.day),
      endsOn: iso(startYear + 1, odd.examEnd.month, odd.examEnd.day),
      semesters: [1, 3, 5, 7],
      projected: true,
      sources: [VTU_CALENDAR_PAGE],
    },
    {
      universityCode: "VTU",
      kind: "exam",
      label: `Semester end examinations · June / July ${startYear + 1}`,
      startsOn: iso(startYear + 1, even.examStart.month, even.examStart.day),
      endsOn: iso(startYear + 1, even.examEnd.month, even.examEnd.day),
      semesters: [2, 4, 6, 8],
      projected: true,
      sources: [VTU_CALENDAR_PAGE],
    },
    {
      universityCode: "VTU",
      kind: "supplementary",
      label: `Backlog papers, sat alongside the June / July ${startYear + 1} examinations`,
      startsOn: iso(startYear + 1, even.examStart.month, even.examStart.day),
      endsOn: iso(startYear + 1, even.examEnd.month, even.examEnd.day),
      semesters: [2, 4, 6, 8],
      projected: true,
      sources: [VTU_CALENDAR_PAGE],
    },
    {
      universityCode: "VTU",
      kind: "internship-window",
      label: `Summer internship window · ${startYear + 1}`,
      startsOn: iso(startYear + 1, 6, 1),
      endsOn: iso(startYear + 1, 7, 31),
      projected: true,
      sources: [VTU_CALENDAR_PAGE],
    },
  ];
}

function overlaps(a: CalendarEvent, b: CalendarEvent): boolean {
  return (
    a.kind === b.kind && a.startsOn <= b.endsOn && b.startsOn <= a.endsOn
  );
}

/** Published windows win; derived ones fill the gaps. */
export const VTU_CALENDAR: CalendarEvent[] = (() => {
  const derived = [2025, 2026, 2027, 2028, 2029].flatMap(deriveYear);
  const kept = derived.filter(
    (d) => !PUBLISHED.some((p) => overlaps(p, d)),
  );
  return [...PUBLISHED, ...kept].sort((a, b) =>
    a.startsOn.localeCompare(b.startsOn),
  );
})();

/**
 * Campus placement registration for a batch opens in the odd semester of the
 * final year. For a 2028 batch that is roughly August 2027. Derived, and
 * labelled as such wherever it is shown.
 */
export function placementRegistrationFor(gradYear: number): CalendarEvent {
  return {
    universityCode: "VTU",
    kind: "placement-registration",
    label: `Campus placement registration · ${gradYear} batch`,
    startsOn: iso(gradYear - 1, 8, 1),
    endsOn: iso(gradYear - 1, 9, 30),
    projected: true,
    sources: [VTU_CALENDAR_PAGE],
  };
}

/**
 * The summer internship a 3rd-year is actually racing towards — the PPO route,
 * which `docs/product.md` §11.1 ranks as the highest-leverage move available.
 * Applications open the winter before the internship.
 */
export function internshipApplicationWindowFor(gradYear: number): CalendarEvent {
  return {
    universityCode: "VTU",
    kind: "internship-window",
    label: `Summer internship applications · ${gradYear} batch`,
    startsOn: iso(gradYear - 2, 12, 1),
    endsOn: iso(gradYear - 1, 3, 31),
    projected: true,
    sources: [VTU_CALENDAR_PAGE],
  };
}

export function calendarFor(universityCode: string): CalendarEvent[] {
  return universityCode === "VTU" ? VTU_CALENDAR : [];
}
