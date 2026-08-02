import type { CompanyVerdict, Ledger } from "./eligibility";

/**
 * The reachability set — `docs/product.md` §9 and the `/reach` route.
 *
 * §5 ranks realism second only to calibration, and notes that students err in
 * *both* directions: some fixate on Google, others accept 3.5 LPA when 12 was
 * reachable. So this deliberately separates "open today" from "worth aiming
 * at", and labels the safe tier as what it is — a floor to stand on, in the
 * slowest-growing part of the market (§2).
 */

export type ReachBandKey = "safe" | "stretch" | "reach";

export type ReachBand = {
  key: ReachBandKey;
  label: string;
  /** One line. What this band is. */
  lede: string;
  /** The requirement line, in figures. */
  requirement: string;
  verdicts: CompanyVerdict[];
  packageMin: number;
  packageMax: number;
};

export type ReachSet = {
  bands: ReachBand[];
  /**
   * True when eligibility is not the student's binding constraint, so the
   * bands split by ambition rather than by gate (flow board screen E1).
   */
  eligibilityIsNotTheConstraint: boolean;
};

function packageRange(verdicts: CompanyVerdict[]): [number, number] {
  if (!verdicts.length) return [0, 0];
  return [
    Math.min(...verdicts.map((v) => v.company.packageMinLpa)),
    Math.max(...verdicts.map((v) => v.company.packageMaxLpa)),
  ];
}

function lpa(min: number, max: number): string {
  if (!min && !max) return "—";
  return `₹${min}–${max} LPA`;
}

export function buildReachSet(ledger: Ledger): ReachSet {
  const openVerdicts = ledger.open;

  // ── The strong record. Nothing is gating them, so a safe/stretch/reach split
  // on eligibility would have one band and say nothing. Split on tier instead:
  // the honest message is that their outcome is now decided by what they can
  // show, not by their marks.
  if (ledger.counts.reach === 0 && ledger.counts.settled === 0) {
    const comfortable = openVerdicts.filter(
      (v) => v.company.tier === "services",
    );
    const aim = openVerdicts.filter((v) => v.company.tier !== "services");
    const [cMin, cMax] = packageRange(comfortable);
    const [aMin, aMax] = packageRange(aim);

    const strongBands: ReachBand[] = [
        {
          key: "safe",
          label: "Comfortable",
          lede: "Clear on paper today.",
          requirement: `${lpa(cMin, cMax)} · no prep needed · slowest-growing tier`,
          verdicts: comfortable,
          packageMin: cMin,
          packageMax: cMax,
        },
        {
          key: "reach",
          label: "Worth aiming at",
          lede: "Also open to you, and paying several times more.",
          requirement: `${lpa(aMin, aMax)} · decided on projects, not grades`,
          verdicts: aim,
          packageMin: aMin,
          packageMax: aMax,
        },
    ];

    return {
      eligibilityIsNotTheConstraint: true,
      bands: strongBands.filter((b) => b.verdicts.length > 0),
    };
  }

  // ── The standard split. Safe is open now; stretch is one exam window away;
  // reach needs sustained work across semesters.
  //
  // Split on the *whole* blocker set, not the leading one. A row behind both a
  // backlog and a CGPA floor is not one exam window away, and filing it under
  // Stretch would promise a timeline we cannot keep.
  const needsCgpa = (v: CompanyVerdict) =>
    v.failures.some((f) => f.field === "ug");

  const stretch = ledger.reach.filter((v) => !needsCgpa(v));
  const reach = ledger.reach.filter(needsCgpa);

  const [sMin, sMax] = packageRange(openVerdicts);
  const [tMin, tMax] = packageRange(stretch);
  const [rMin, rMax] = packageRange(reach);

  const bands: ReachBand[] = [
    {
      key: "safe",
      label: "Safe",
      lede: openVerdicts.length
        ? "Open today, on paper."
        : "Nothing is open on paper today.",
      requirement: openVerdicts.length
        ? `${lpa(sMin, sMax)} · open today · a floor to stand on`
        : "Clearing one gate changes this.",
      verdicts: openVerdicts,
      packageMin: sMin,
      packageMax: sMax,
    },
    {
      key: "stretch",
      label: "Stretch",
      lede: "Closed by backlogs, and one exam window from open.",
      requirement: `${lpa(tMin, tMax)} · one exam window away`,
      verdicts: stretch,
      packageMin: tMin,
      packageMax: tMax,
    },
    {
      key: "reach",
      label: "Reach",
      lede: "Closed on the aggregate, and movable across the semesters you have left.",
      requirement: `${lpa(rMin, rMax)} · CGPA, plus one project you can defend`,
      verdicts: reach,
      packageMin: rMin,
      packageMax: rMax,
    },
  ];

  return {
    eligibilityIsNotTheConstraint: false,
    bands: bands.filter((b) => b.verdicts.length > 0),
  };
}

/**
 * The GCC argument, from `docs/research.md` §1.4. Shown alongside the bands
 * because the single most common calibration error in this segment is aiming
 * at the shrinking tier by default.
 */
export function gccContext(ledger: Ledger): {
  gccCount: number;
  servicesCount: number;
  show: boolean;
} {
  const reachable = [...ledger.open, ...ledger.reach];
  const gccCount = reachable.filter(
    (v) => v.company.tier === "gcc" || v.company.tier === "product",
  ).length;
  const servicesCount = reachable.filter(
    (v) => v.company.tier === "services",
  ).length;

  return { gccCount, servicesCount, show: gccCount > 0 };
}
