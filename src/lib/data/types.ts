/**
 * Shapes for the Phase 0 reference data.
 *
 * Everything in `src/lib/data` is *retrieved fact*. The rule from
 * `docs/product.md` §12.2 is that facts come from here and the model only
 * reasons over them — so every gate carries a source it can be checked against.
 */

export type BranchCode =
  | "CSE"
  | "ISE"
  | "IT"
  | "AIML"
  | "DS"
  | "CYBER"
  | "ECE"
  | "EEE"
  | "EIE"
  | "MECH"
  | "CIVIL"
  | "CHEM"
  | "BIOTECH"
  | "AERO"
  | "OTHER";

export const BRANCHES: { code: BranchCode; label: string }[] = [
  { code: "CSE", label: "CSE" },
  { code: "ISE", label: "ISE" },
  { code: "IT", label: "IT" },
  { code: "AIML", label: "AI/ML" },
  { code: "DS", label: "Data Science" },
  { code: "CYBER", label: "Cyber Security" },
  { code: "ECE", label: "ECE" },
  { code: "EEE", label: "EEE" },
  { code: "EIE", label: "EIE" },
  { code: "MECH", label: "Mech" },
  { code: "CIVIL", label: "Civil" },
  { code: "CHEM", label: "Chemical" },
  { code: "BIOTECH", label: "Biotech" },
  { code: "AERO", label: "Aero" },
  { code: "OTHER", label: "Other" },
];

/** Branch families, used for eligibility and for proof-record matching. */
export const CIRCUIT_BRANCHES: BranchCode[] = [
  "CSE",
  "ISE",
  "IT",
  "AIML",
  "DS",
  "CYBER",
  "ECE",
  "EEE",
  "EIE",
];

export type TargetSector =
  | "product"
  | "services"
  | "data"
  | "core"
  | "undecided";

export const TARGET_SECTORS: {
  code: TargetSector;
  initials: string;
  label: string;
  detail: string;
}[] = [
  {
    code: "product",
    initials: "PS",
    label: "Product engineering",
    detail: "Product companies and GCCs · ₹8–18 LPA",
  },
  {
    code: "services",
    initials: "IT",
    label: "IT services",
    detail: "TCS, Infosys, Wipro, Accenture · ₹3.5–7 LPA",
  },
  {
    code: "data",
    initials: "DA",
    label: "Data / analytics",
    detail: "Analyst, data engineering, ML-adjacent",
  },
  {
    code: "core",
    initials: "CO",
    label: "Core / embedded",
    detail: "Bosch, Continental, semiconductor",
  },
  {
    code: "undecided",
    initials: "??",
    label: "Not sure yet",
    detail: "We'll show what's in reach and you decide after",
  },
];

/**
 * How much we trust a criterion.
 *
 * `docs/product.md` §13.2: the bottleneck on this data is not collection but
 * *reconciliation* — sources contradict each other and go stale. Rather than
 * hide that, we grade it and show the grade.
 */
export type Confidence =
  /** Stated on the company's own careers page or an official drive notice. */
  | "verified"
  /** Consistent across independent placement-prep aggregators. */
  | "reported"
  /** Sources disagree. The row renders with the disagreement stated. */
  | "contested";

export type Source = {
  label: string;
  url: string;
  /** ISO date the value was last checked. */
  checkedOn: string;
};

/**
 * A published eligibility gate. Every field is optional because "not stated"
 * and "no requirement" are different facts and must not be conflated — an
 * absent gate never blocks a student.
 */
export type Criteria = {
  tenthPct?: number;
  twelfthPct?: number;
  /** Undergraduate aggregate, as a percentage. */
  ugPct?: number;
  /** Undergraduate aggregate, on a 10-point CGPA scale. */
  ugCgpa?: number;
  /** Active (uncleared) backlogs permitted at the time of the drive. */
  maxActiveBacklogs?: number;
  /** Whether every backlog must be cleared before joining. */
  backlogsClearedByJoining?: boolean;
  /** Total permitted education gap, in years. */
  maxGapYears?: number;
  /** `undefined` means all branches. */
  branches?: BranchCode[];
};

export type ProcessStage = {
  name: string;
  minutes?: number;
  topics?: string[];
};

export type CompanyTier =
  /** Bulk IT services intake. The shrinking tier (`docs/product.md` §2). */
  | "services"
  /** Global Capability Centre. */
  | "gcc"
  /** Product engineering. */
  | "product"
  /** Core / embedded / manufacturing. */
  | "core";

export type Company = {
  slug: string;
  name: string;
  /** Named drive or hiring programme, where one exists. */
  programme?: string;
  tier: CompanyTier;
  sectors: TargetSector[];
  packageMinLpa: number;
  packageMaxLpa: number;
  /** Batch year the criteria below were published for. */
  batchYear: number;
  criteria: Criteria;
  confidence: Confidence;
  /** Rendered verbatim when confidence is `contested`. */
  contestedNote?: string;
  notes?: string;
  sources: Source[];
  process: ProcessStage[];
  campusTypes: ("on-campus" | "pool" | "off-campus")[];
  /** Rough month the drive usually opens, 1-indexed. */
  typicalDriveMonth?: number;
};

export type University = {
  code: string;
  name: string;
  shortName: string;
  state: string;
  /** Whether Polaris holds this university's calendar. */
  calendarMapped: boolean;
  sources: Source[];
};

export type College = {
  slug: string;
  name: string;
  universityCode: string;
  city: string;
  area?: string;
  /**
   * 1 = IIT/NIT/IIIT-class, 2 = established private/autonomous,
   * 3 = the rest. Used for proof-record matching, never shown as a judgement.
   */
  tier: 1 | 2 | 3;
  autonomous: boolean;
  sources: Source[];
};

export type CalendarEventKind =
  | "exam"
  | "supplementary"
  | "results"
  | "teaching"
  | "internship-window"
  | "placement-registration";

export type CalendarEvent = {
  universityCode: string;
  kind: CalendarEventKind;
  label: string;
  /** ISO dates. */
  startsOn: string;
  endsOn: string;
  /** Which semester numbers this window applies to. */
  semesters?: number[];
  /** True when the window is derived rather than published verbatim. */
  projected?: boolean;
  sources: Source[];
};

export type CgpaBand =
  | "<6.0"
  | "6.0-6.5"
  | "6.5-7.0"
  | "7.0-7.5"
  | "7.5-8.0"
  | "8.0+";

/**
 * A record of one person's run at one company.
 *
 * ## Why almost everything here is optional
 *
 * `docs/research.md` §3.3 expects the GeeksforGeeks corpus to yield the
 * company × college-tier layer, on the grounds that its contribution format
 * asks authors to state their college, the percentage criteria that applied,
 * and whether they were selected. Reading the actual published articles, that
 * expectation does not survive: the format *asks*, and authors mostly do not
 * answer. Sampled TCS experiences state the rounds in detail and state neither
 * CGPA, nor college, nor backlogs.
 *
 * So the corpus splits in two, and the type has to admit it:
 *
 * - **Process** — the round-by-round, which GfG genuinely does carry. Real,
 *   citable, and useful on every company page.
 * - **Profile** — tier, CGPA band, backlogs. The matching keys that
 *   `docs/product.md` §9.2.1's proof record needs, and the part public
 *   scraping does not reliably provide.
 *
 * `hasProfile` marks which records can carry the proof component. Only those
 * are eligible for an exact match; the rest can still show a process. §16 Q4
 * already names the route to profile data — collect it from students directly,
 * paying a premium for rejections — and this shape is what that fills.
 */
export type InterviewRecord = {
  id: string;
  companySlug: string;
  role: string;
  /** Undefined when the article does not date the drive. */
  year?: number;
  campusType: "on-campus" | "pool" | "off-campus" | "referral";
  collegeTier?: 1 | 2 | 3;
  universityCode?: string;
  collegeName?: string;
  branch?: BranchCode;
  cgpaBand?: CgpaBand;
  /** As reported, e.g. "1 cleared before the drive". */
  backlogNote?: string;
  outcome: "selected" | "rejected";
  rounds: ProcessStage[];
  /** What the author credited, or blamed. One or two sentences. */
  takeaway: string;
  /**
   * True when tier, CGPA band and branch are all present — the condition for
   * this record to answer "can someone like me get in".
   */
  hasProfile: boolean;
  /** How the record reached us. Drives trust and how it is labelled. */
  provenance: "public-corpus" | "student-submitted" | "tpo";
  source: Source;
};

export type AntiPatternCategory =
  | "project"
  | "evidence"
  | "document"
  | "framing";

export type AntiPattern = {
  slug: string;
  label: string;
  category: AntiPatternCategory;
  /** Lower-cased substrings matched against project titles and blurbs. */
  match: string[];
  /** The stamp on the row: "Very common", "Easiest win"… */
  verdict: string;
  /** Severity drives ordering, not colour. */
  weight: number;
  /** The finding. Harsh about the artefact, never about the person. */
  finding: string;
  /** Every finding carries its fix, sized in hours (`brand.md` §3.1). */
  fix: string;
  fixHours: number;
};

export type ActionCategory =
  | "eligibility"
  | "aptitude"
  | "dsa"
  | "project"
  | "internship"
  | "core-cs"
  | "hygiene";

/** Leverage order, from `docs/product.md` §11.1. */
export const ACTION_CATEGORY_ORDER: ActionCategory[] = [
  "eligibility",
  "aptitude",
  "dsa",
  "project",
  "internship",
  "core-cs",
  "hygiene",
];

export const ACTION_CATEGORY_LABEL: Record<ActionCategory, string> = {
  eligibility: "Eligibility",
  aptitude: "Aptitude",
  dsa: "DSA",
  project: "Project",
  internship: "Internship",
  "core-cs": "Core CS",
  hygiene: "Artefact hygiene",
};

/**
 * Where a deadline-sensitive task hangs off the real calendar.
 *
 * `docs/product.md` §9.4: every deadline is derived from the real calendar,
 * never invented. These are the derivation rules.
 */
export type CalendarAnchor =
  /** Six weeks before the next backlog window opens — registration closes early. */
  | "before-supplementary"
  /** The backlog window itself. The task completes when the paper is sat. */
  | "at-supplementary"
  /** The next semester-end examination. An SGPA target resolves there. */
  | "at-exam"
  /** Roughly four weeks after an examination window, when results publish. */
  | "after-results"
  /** The summer internship application window. */
  | "internship-applications";

export type VerifyVia =
  | "github"
  | "leetcode"
  | "marksheet"
  | "credential"
  | "self";

export type Action = {
  slug: string;
  title: string;
  category: ActionCategory;
  effortHours: number;
  /** Weeks between starting and the evidence existing. */
  leadTimeWeeks: number;
  /** 1–5. How much a recruiter would weigh the artefact this produces. */
  evidenceValue: 1 | 2 | 3 | 4 | 5;
  /** True when the task is pinned to a calendar deadline. */
  deadlineSensitive: boolean;
  /**
   * Pins the task to a real window rather than letting the scheduler place it
   * greedily. Without this, "register for the supplementary" lands in whatever
   * week has spare hours, which is worse than useless — the deadline is the
   * entire content of that task.
   */
  anchor?: CalendarAnchor;
  prerequisites: string[];
  verifyVia: VerifyVia;
  /** Checklist rendered on `/roadmap/[task]`. */
  doneMeans: { label: string; via: VerifyVia; detail?: string }[];
  /** One paragraph: why this one, now. */
  whyNow: string;
  /** Only scheduled when the student's target includes one of these. */
  sectors?: TargetSector[];
  /** CV entities this action produces when it completes. */
  produces?: { kind: "project" | "skill" | "certification"; hint: string }[];
};
