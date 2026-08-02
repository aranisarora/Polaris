import { COMPANIES, REGISTRY_VERSION } from "../data/companies";
import type { Company, Source } from "../data/types";
import {
  CGPA_CHECKPOINT_SEMESTER,
  cgpaTrajectory,
  completedSemesters,
  percentToCgpa,
  type CgpaTrajectory,
  type StudentRecord,
} from "./record";

/**
 * The eligibility ledger — `docs/product.md` §9.2, the credibility artefact.
 *
 * 100% arithmetic, no model judgement anywhere in this file. That is the whole
 * point of it: it is undeniable, it states what is permanently closed, and it
 * cannot be produced without the registry — which is the checkable difference
 * between a product and a wrapper (§4).
 *
 * ## The asymmetry that governs every decision here
 *
 * A wrong "open" costs a student an application they were going to lose.
 * A wrong "settled" tells them to stop trying. Those are not symmetric, so:
 * an absent criterion never blocks, and anything we cannot establish resolves
 * towards open.
 */

export const ENGINE_VERSION = "eligibility-2026.08.02";

export type GateField =
  | "tenth"
  | "twelfth"
  | "ug"
  | "backlogs"
  | "gap"
  | "branch";

export type Fixability = "fixable" | "settled";

export type GateFailure = {
  field: GateField;
  /** Short label for the row: "12th", "Backlogs", "CGPA". */
  label: string;
  requiredText: string;
  actualText: string;
  /** The size of the gap, where it is meaningful. */
  shortfallText?: string;
  fixability: Fixability;
  /** The lever, in the student's terms. Never absent on a fixable failure. */
  fix?: string;
  trajectory?: CgpaTrajectory;
};

export type LedgerState = "open" | "reach" | "settled";

export type CompanyVerdict = {
  company: Company;
  state: LedgerState;
  failures: GateFailure[];
  /** The failure that decides the state, and the one the row leads with. */
  binding?: GateFailure;
  /** Stable key describing what blocks this row, used to group rows. */
  groupKey?: string;
};

export type ReachGroup = {
  key: string;
  /** Every blocker on this group's rows, joined. */
  headline: string;
  /** The lead blocker — the cheapest lever among them. */
  binding: GateFailure;
  /** All of them, so the UI can state what "opens" actually costs. */
  blockers: GateFailure[];
  verdicts: CompanyVerdict[];
  /**
   * How many doors clearing *every* blocker in this group opens. Exact,
   * because the group key is the full blocker set.
   */
  opens: number;
};

/**
 * Which shape of ledger this student got. `docs/product.md` §10.3 wants exactly
 * one permanent loss and at least one fixable win; three real records break
 * that, and the flow board designs all three (screens E1–E3). We detect the
 * shape rather than pretending it is always standard.
 */
export type LedgerShape =
  /** At least one settled row and at least one fixable row. The intended shock. */
  | "standard"
  /** Everything open. Eligibility is not their constraint. */
  | "all-open"
  /** Little open and mostly settled. The screen has to carry belief. */
  | "mostly-settled"
  /** Nothing permanently closed. No loss to deliver, so lead with the levers. */
  | "no-settled";

export type Ledger = {
  asOf: string;
  engineVersion: string;
  registryVersion: string;
  record: StudentRecord;
  verdicts: CompanyVerdict[];
  open: CompanyVerdict[];
  reach: CompanyVerdict[];
  settled: CompanyVerdict[];
  groups: ReachGroup[];
  shape: LedgerShape;
  counts: { total: number; open: number; reach: number; settled: number };
  /** Every distinct source behind the verdicts, for the provenance footer. */
  sources: Source[];
};

const pct = (n: number) => `${n.toFixed(1)}%`;
const cg = (n: number) => n.toFixed(2);

/**
 * A backlog is only fixable while an exam window remains before the drive.
 * For a final-year student in October it is not, and saying otherwise would be
 * the exact false hope this product exists to replace.
 */
function backlogsFixable(record: StudentRecord, asOf: Date): boolean {
  const done = completedSemesters(record.gradYear, asOf);
  return done < CGPA_CHECKPOINT_SEMESTER + 1;
}

function evaluate(
  company: Company,
  record: StudentRecord,
  asOf: Date,
): CompanyVerdict {
  const c = company.criteria;
  const failures: GateFailure[] = [];

  // ── School marks. Permanently settled: nothing a student does changes them.
  if (c.tenthPct !== undefined && record.tenthPct < c.tenthPct) {
    failures.push({
      field: "tenth",
      label: "10th",
      requiredText: pct(c.tenthPct),
      actualText: pct(record.tenthPct),
      shortfallText: pct(c.tenthPct - record.tenthPct),
      fixability: "settled",
    });
  }
  if (c.twelfthPct !== undefined && record.twelfthPct < c.twelfthPct) {
    failures.push({
      field: "twelfth",
      label: "12th",
      requiredText: pct(c.twelfthPct),
      actualText: pct(record.twelfthPct),
      shortfallText: pct(c.twelfthPct - record.twelfthPct),
      fixability: "settled",
    });
  }

  // ── Undergraduate aggregate. Fixable only while semesters remain.
  // Where a company states both a percentage and a CGPA, take the lower bar —
  // they are two spellings of one gate and the student needs to clear one.
  const ugTargets: number[] = [];
  if (c.ugCgpa !== undefined) ugTargets.push(c.ugCgpa);
  if (c.ugPct !== undefined) ugTargets.push(percentToCgpa(c.ugPct));
  const ugTarget = ugTargets.length ? Math.min(...ugTargets) : undefined;

  if (ugTarget !== undefined && record.cgpa < ugTarget) {
    const trajectory = cgpaTrajectory(
      record.cgpa,
      ugTarget,
      record.gradYear,
      asOf,
    );
    const fixable = trajectory.kind === "reachable";
    failures.push({
      field: "ug",
      label: "CGPA",
      requiredText: cg(ugTarget),
      actualText: cg(record.cgpa),
      shortfallText: cg(ugTarget - record.cgpa),
      fixability: fixable ? "fixable" : "settled",
      trajectory,
      fix:
        trajectory.kind === "reachable"
          ? `Average ${trajectory.requiredAverage.toFixed(2)} across your remaining ${trajectory.semestersRemaining} ${trajectory.semestersRemaining === 1 ? "semester" : "semesters"}.`
          : undefined,
    });
  }

  // ── Active backlogs.
  if (
    c.maxActiveBacklogs !== undefined &&
    record.activeBacklogs > c.maxActiveBacklogs
  ) {
    const toClear = record.activeBacklogs - c.maxActiveBacklogs;
    const fixable = backlogsFixable(record, asOf);
    failures.push({
      field: "backlogs",
      label: "Backlogs",
      requiredText:
        c.maxActiveBacklogs === 0 ? "0" : `max ${c.maxActiveBacklogs}`,
      actualText: String(record.activeBacklogs),
      shortfallText: `${toClear} to clear`,
      fixability: fixable ? "fixable" : "settled",
      fix: fixable
        ? `Clear ${toClear === 1 ? "one" : toClear} at the next backlog window.`
        : undefined,
    });
  }

  // ── Education gap. Only evaluated when the student has told us.
  if (
    c.maxGapYears !== undefined &&
    record.gapYears !== undefined &&
    record.gapYears > c.maxGapYears
  ) {
    failures.push({
      field: "gap",
      label: "Education gap",
      requiredText: `max ${c.maxGapYears} ${c.maxGapYears === 1 ? "year" : "years"}`,
      actualText: `${record.gapYears} ${record.gapYears === 1 ? "year" : "years"}`,
      fixability: "settled",
    });
  }

  // ── Branch.
  if (c.branches && !c.branches.includes(record.branch)) {
    failures.push({
      field: "branch",
      label: "Branch",
      requiredText: c.branches.join(", "),
      actualText: record.branch,
      fixability: "settled",
    });
  }

  const state: LedgerState = failures.length === 0
    ? "open"
    : failures.some((f) => f.fixability === "settled")
      ? "settled"
      : "reach";

  // Lead with the failure that decides the row.
  //
  // A settled failure always wins, because there is no point offering a lever
  // on a door that stays shut. Among settled failures the school marks lead,
  // since they are the most permanent thing on the record.
  //
  // Among *fixable* failures the order inverts to cheapest-lever-first:
  // backlogs before CGPA. A student failing both is one exam window from the
  // backlog and three semesters from the average, and §11.1 ranks eligibility
  // repair by exactly that leverage. Leading with the CGPA would hand them the
  // slower fix and bury the fast one.
  const settledOrder: GateField[] = [
    "twelfth",
    "tenth",
    "gap",
    "branch",
    "ug",
    "backlogs",
  ];
  const fixableOrder: GateField[] = [
    "backlogs",
    "ug",
    "gap",
    "branch",
    "tenth",
    "twelfth",
  ];

  const binding = [...failures].sort((a, b) => {
    if (a.fixability !== b.fixability) return a.fixability === "settled" ? -1 : 1;
    const order = a.fixability === "settled" ? settledOrder : fixableOrder;
    return order.indexOf(a.field) - order.indexOf(b.field);
  })[0];

  return {
    company,
    state,
    failures,
    binding,
    groupKey: failures.length ? groupKeyFor(failures) : undefined,
  };
}

/**
 * Rows that share a blocking reason group into one line — "Wipro +4" rather
 * than five near-identical rows. The grouping is what turns a list into an
 * argument, because it puts a number on what one fix is worth.
 *
 * The key is the **full set** of remaining blockers, not just the leading one.
 * Grouping on the leading failure alone would let a row blocked by backlogs
 * *and* a CGPA floor sit under "clear 2 backlogs — opens 18 companies", which
 * is false: clearing the backlogs opens twelve of them and leaves six still
 * shut. An overstated lever is the same failure mode as a wrong "settled" —
 * the student acts on it, and finds out we were wrong at the drive.
 */
function groupKeyFor(failures: GateFailure[]): string {
  return failures
    .map((f) => `${f.field}:${f.requiredText}`)
    .sort()
    .join("+");
}

function headlineFor(f: GateFailure): string {
  switch (f.field) {
    case "backlogs":
      return `Backlogs · requires ${f.requiredText} · you have ${f.actualText}`;
    case "ug":
      return `CGPA · requires ${f.requiredText} · you have ${f.actualText}`;
    case "tenth":
    case "twelfth":
      return `${f.label} · requires ${f.requiredText} · you have ${f.actualText}`;
    case "gap":
      return `Education gap · allows ${f.requiredText} · you have ${f.actualText}`;
    default:
      return `${f.label} · ${f.requiredText}`;
  }
}

function shapeOf(
  open: CompanyVerdict[],
  reach: CompanyVerdict[],
  settled: CompanyVerdict[],
  total: number,
): LedgerShape {
  if (open.length === total) return "all-open";
  if (settled.length > total / 2 && open.length <= 4) return "mostly-settled";
  if (settled.length === 0) return "no-settled";
  if (reach.length > 0) return "standard";
  return "no-settled";
}

export function buildLedger(
  record: StudentRecord,
  asOf: Date = new Date(),
  companies: Company[] = COMPANIES,
): Ledger {
  const verdicts = companies.map((c) => evaluate(c, record, asOf));

  const open = verdicts.filter((v) => v.state === "open");
  const reach = verdicts.filter((v) => v.state === "reach");
  const settled = verdicts.filter((v) => v.state === "settled");

  // Group the reachable rows, largest lever first — the biggest number is the
  // most persuasive thing on the screen and should not be buried.
  const byKey = new Map<string, CompanyVerdict[]>();
  for (const v of reach) {
    if (!v.groupKey) continue;
    const list = byKey.get(v.groupKey) ?? [];
    list.push(v);
    byKey.set(v.groupKey, list);
  }

  const groups: ReachGroup[] = [...byKey.entries()]
    .map(([key, list]) => {
      const failures = list[0].failures;
      return {
        key,
        binding: list[0].binding!,
        // Every blocker, in the order they need doing. A row with two gates
        // says so rather than advertising the cheaper one.
        headline: failures.map(headlineFor).join("  ·  "),
        blockers: failures,
        verdicts: list.sort(
          (a, b) => b.company.packageMaxLpa - a.company.packageMaxLpa,
        ),
        opens: list.length,
      };
    })
    .sort((a, b) => {
      // Single-gate groups first — the fastest genuine wins lead.
      if (a.blockers.length !== b.blockers.length) {
        return a.blockers.length - b.blockers.length;
      }
      return b.opens - a.opens;
    });

  const sourceMap = new Map<string, Source>();
  for (const v of verdicts) {
    for (const s of v.company.sources) sourceMap.set(s.url, s);
  }

  const byPackage = (a: CompanyVerdict, b: CompanyVerdict) =>
    b.company.packageMaxLpa - a.company.packageMaxLpa;

  return {
    asOf: asOf.toISOString(),
    engineVersion: ENGINE_VERSION,
    registryVersion: REGISTRY_VERSION,
    record,
    verdicts,
    open: [...open].sort(byPackage),
    reach: [...reach].sort(byPackage),
    settled: [...settled].sort(byPackage),
    groups,
    shape: shapeOf(open, reach, settled, verdicts.length),
    counts: {
      total: verdicts.length,
      open: open.length,
      reach: reach.length,
      settled: settled.length,
    },
    sources: [...sourceMap.values()],
  };
}

/**
 * Re-run the ledger against a hypothetical record. Powers the re-shock: clear
 * the backlogs, and count how many rows move.
 */
export function ledgerDelta(
  before: Ledger,
  after: Ledger,
): { opened: CompanyVerdict[]; closed: CompanyVerdict[] } {
  const wasOpen = new Set(before.open.map((v) => v.company.slug));
  const isOpen = new Set(after.open.map((v) => v.company.slug));

  return {
    opened: after.open.filter((v) => !wasOpen.has(v.company.slug)),
    closed: before.open.filter((v) => !isOpen.has(v.company.slug)),
  };
}

/** What the ledger would look like with every fixable gate closed. */
export function repairedRecord(record: StudentRecord): StudentRecord {
  return { ...record, activeBacklogs: 0 };
}
