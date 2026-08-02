import type { Audit } from "./audit";
import type { Ledger } from "./eligibility";
import type { StudentRecord } from "./record";

/**
 * Altitude — the readiness score.
 *
 * `docs/brand.md` §15 #1 settles the naming: the angle of Polaris above your
 * horizon equals your latitude, so measuring the fixed star tells you where you
 * are. A degree scale also avoids being read as an exam mark by someone who is
 * graded constantly — 34/100 is a fail, 34° is a position. Runs 0–90°.
 *
 * ## The honesty problem this file has to solve
 *
 * `docs/product.md` §6 is emphatic that calibration — *which actions actually
 * change outcomes* — is the moat, cannot be reasoned out, and only exists after
 * running cohorts through a full cycle. We have not run a cohort. So the
 * benchmark cannot honestly be "converts at 62", because nobody has measured
 * that.
 *
 * What we can state without inventing anything is the requirement implied by
 * the student's own reach set: the altitude a record would need to clear the
 * gates and carry the evidence those companies ask for. That is arithmetic over
 * the registry, not a claim about conversion. `basis` marks which one is being
 * shown, and every surface renders the distinction.
 */

export const ALTITUDE_VERSION = "altitude-2026.08.02";

export const ALTITUDE_MAX = 90;

export type AltitudeComponent = {
  key: "eligibility" | "evidence" | "differentiation" | "preparation";
  label: string;
  /** Contribution earned, in degrees. */
  earned: number;
  /** Maximum this component can contribute. */
  available: number;
  /** One line explaining the number, in the student's own figures. */
  detail: string;
};

export type Altitude = {
  version: string;
  /** 0–90. */
  value: number;
  components: AltitudeComponent[];
  /**
   * The altitude the student's reach set implies. Not an observed conversion
   * threshold — see the note above.
   */
  benchmark: number;
  basis: "modelled" | "calibrated";
  benchmarkLabel: string;
};

const WEIGHTS = {
  /** Gates come first because they are binary and gate everything else. */
  eligibility: 32,
  /** Evidence a recruiter can check without asking. */
  evidence: 22,
  /** The differentiating project. The objective function (Hard Rule 5). */
  differentiation: 24,
  /** Aptitude, DSA, core CS. */
  preparation: 12,
} as const;

export type PreparationSignals = {
  /** Completed roadmap tasks, by category. */
  completedByCategory?: Partial<Record<string, number>>;
  leetcodeMediums?: number;
  aptitudeSessions?: number;
};

export function computeAltitude(
  ledger: Ledger,
  audit: Audit,
  _record: StudentRecord,
  prep: PreparationSignals = {},
  /**
   * The ledger the roadmap is aiming at — normally the same record with its
   * backlogs cleared. Supplying it makes the benchmark a derived fact about
   * this student rather than a number we made up.
   */
  benchmarkLedger?: Ledger,
): Altitude {
  const total = Math.max(1, ledger.counts.total);

  // ── Eligibility. The share of the roster that is open, weighted so that
  // being open at higher-tier companies counts for more — 20 open service
  // companies and nothing else is not the same position as 12 mixed.
  const openShare = ledger.counts.open / total;
  const openHigherTier = ledger.open.filter(
    (v) => v.company.tier !== "services",
  ).length;
  const higherTierShare =
    openHigherTier /
    Math.max(1, ledger.verdicts.filter((v) => v.company.tier !== "services").length);
  const eligibility =
    WEIGHTS.eligibility * (openShare * 0.6 + higherTierShare * 0.4);

  // ── Evidence. Cheap to move, and the first thing anyone checks.
  //
  // Scored from what *exists*, not from the absence of complaints. Scoring
  // "no findings" as clean would mean a student who has told us nothing
  // outranks one who has shown us thin evidence — which is both wrong and
  // exactly backwards as an incentive, since it would reward not connecting
  // anything. Absence of evidence is not evidence.
  const gh = audit.githubHealth;
  const lc = audit.leetcodeHealth;
  const shipped = audit.hasShippedArtefact;

  const evidencePoints =
    (gh === "healthy" ? 0.5 : gh === "thin" ? 0.2 : 0) +
    (lc === "healthy" ? 0.3 : lc === "thin" ? 0.12 : 0) +
    (shipped ? 0.2 : 0);

  const evidence = WEIGHTS.evidence * Math.min(1, evidencePoints);

  // ── Differentiation.
  const differentiation =
    audit.differentiatingSignal === "present"
      ? WEIGHTS.differentiation
      : audit.differentiatingSignal === "thin"
        ? WEIGHTS.differentiation * 0.4
        : 0;

  // ── Preparation.
  const mediums = prep.leetcodeMediums ?? 0;
  const sessions = prep.aptitudeSessions ?? 0;
  const preparation =
    WEIGHTS.preparation *
    Math.min(1, mediums / 40) *
    0.6 +
    WEIGHTS.preparation * Math.min(1, sessions / 6) * 0.4;

  const components: AltitudeComponent[] = [
    {
      key: "eligibility",
      label: "Eligibility",
      earned: eligibility,
      available: WEIGHTS.eligibility,
      detail: `${ledger.counts.open} of ${total} open${
        ledger.counts.reach ? `, ${ledger.counts.reach} within reach` : ""
      }`,
    },
    {
      key: "evidence",
      label: "Evidence",
      earned: evidence,
      available: WEIGHTS.evidence,
      detail:
        gh === "absent" && lc === "absent"
          ? "Nothing connected a recruiter could check"
          : `GitHub ${gh} · practice ${lc}`,
    },
    {
      key: "differentiation",
      label: "Differentiation",
      earned: differentiation,
      available: WEIGHTS.differentiation,
      detail:
        audit.differentiatingSignal === "none"
          ? "No project that separates you"
          : audit.differentiatingSignal === "thin"
            ? "One project started, nothing shipped"
            : "One project shipped and defensible",
    },
    {
      key: "preparation",
      label: "Preparation",
      earned: preparation,
      available: WEIGHTS.preparation,
      detail: `${mediums} mediums · ${sessions} aptitude ${sessions === 1 ? "session" : "sessions"}`,
    },
  ];

  const value = Math.round(
    components.reduce((sum, c) => sum + c.earned, 0),
  );

  // ── The benchmark.
  //
  // Derived, not asserted, and it is exactly one thing: where this plan lands
  // them. Same arithmetic, run over the ledger they get once the backlogs
  // clear, with the evidence findings cleared, one project shipped and the
  // practice done — every one of which is a task on their own roadmap.
  //
  // Settled rows stay settled. The bar never assumes away a door that is
  // genuinely shut, because a target a student cannot reach is precisely the
  // despair §10.3 warns about.
  const benchmark = benchmarkLedger
    ? idealAltitudeOver(benchmarkLedger, _record)
    : Math.round(value + (ALTITUDE_MAX - value) * 0.5);

  return {
    version: ALTITUDE_VERSION,
    value: Math.max(0, Math.min(ALTITUDE_MAX, value)),
    components,
    benchmark: Math.min(ALTITUDE_MAX, benchmark),
    basis: "modelled",
    benchmarkLabel: "Where this plan lands you",
  };
}

/**
 * Altitude over a given ledger assuming the evidence is clean, one project is
 * shipped and the practice is done — every one of which the roadmap schedules.
 */
function idealAltitudeOver(ledger: Ledger, record: StudentRecord): number {
  const idealAudit: Audit = {
    version: "ideal",
    findings: [],
    bySection: { projects: [], evidence: [], document: [] },
    differentiatingSignal: "present",
    githubHealth: "healthy",
    leetcodeHealth: "healthy",
    hasShippedArtefact: true,
    hoursToDifferentiate: 0,
    verdict: "",
    destination: "",
  };
  return computeAltitude(ledger, idealAudit, record, {
    leetcodeMediums: 40,
    aptitudeSessions: 6,
  }).value;
}

/**
 * What altitude becomes once the fixable gates close.
 *
 * Shown next to a low score so a bad position always arrives with its lever
 * attached — `docs/brand.md` §2.2: never despair without a lever.
 */
export function projectedAltitude(
  repairedLedger: Ledger,
  record: StudentRecord,
): number {
  return idealAltitudeOver(repairedLedger, record);
}
