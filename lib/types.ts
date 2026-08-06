/**
 * Polaris domain types — the shared contract for every feature.
 * Keep in sync with supabase/schema.sql and docs/CONTRACTS.md.
 */

// ---------------------------------------------------------------- job data

export type Country = "us" | "gb";

export interface JobQuery {
  keywords: string;
  location?: string;
  country: Country;
  limit?: number;
}

export interface JobSalary {
  min?: number;
  max?: number;
  currency?: string;
  /** Verbatim salary text when structured values are unavailable (Jooble). */
  text?: string;
}

export interface JobPosting {
  /** Stable Polaris id: `${source}:${sourceId}` */
  id: string;
  source: "jooble" | "adzuna";
  sourceId: string;
  title: string;
  company: string;
  location: string;
  country: Country;
  /** Full posting text/snippet as provided by the source. */
  description: string;
  salary?: JobSalary;
  url: string;
  postedAt?: string; // ISO date
}

/** One source's health for the "instruments" status readout. */
export interface ProviderStatus {
  name: "jooble" | "adzuna";
  configured: boolean;
  ok: boolean;
  count: number;
  error?: string;
}

export interface JobSearchResult {
  postings: JobPosting[];
  providers: ProviderStatus[];
  /** True when served from the 24h cache. */
  cached: boolean;
  fetchedAt: string; // ISO
}

// ------------------------------------------------------------ onboarding

export type SectorOption =
  | "engineering"
  | "design"
  | "product"
  | "data"
  | "marketing"
  | "operations"
  | "healthcare"
  | "other";

export type CompanyTypeOption =
  | "startup"
  | "scaleup"
  | "big-tech"
  | "enterprise"
  | "public-sector"
  | "agency"
  | "any";

/**
 * Gemini's structured reading of the dream text. `quotedPhrases` are verbatim
 * fragments of the user's own words, reused verbatim across the product.
 */
export interface DreamInterpretation {
  roleTitle?: string;
  seniority?: string;
  sector?: string;
  companyHints: string[];
  locationHints: string[];
  motivations: string[];
  quotedPhrases: string[];
  /** Search keywords derived for the job providers. */
  searchKeywords: string;
}

export interface OnboardingState {
  dreamText: string;
  dreamInterpretation: DreamInterpretation | null;
  sector: SectorOption | null;
  sectorOther: string | null;
  companyType: CompanyTypeOption | null;
  fastTrack: boolean;
  fastTrackCompany: string | null;
  fastTrackRole: string | null;
  /** 1-based index of the next incomplete step; steps: 1 dream, 2 sector, 3 company. */
  currentStep: number;
  completedAt: string | null;
}

// --------------------------------------------------------------- profile

export interface CVExperience {
  company: string;
  role: string;
  start?: string;
  end?: string;
  current?: boolean;
  bullets: string[];
}

export interface CVEducation {
  institution: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
}

export interface CVProject {
  name: string;
  description: string;
  tech: string[];
  link?: string;
}

export interface CVBasics {
  name: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  links: string[];
}

export interface CVData {
  basics: CVBasics;
  experience: CVExperience[];
  education: CVEducation[];
  skills: string[];
  projects: CVProject[];
}

export interface CareerProfile {
  cv: CVData | null;
  questionnaire: QuestionnaireAnswers | null;
  source: "cv" | "questionnaire" | "both";
  completedAt: string | null;
}

export interface QuestionnaireAnswers {
  currentRole?: string;
  yearsExperience?: string;
  topSkills?: string;
  proudestWork?: string;
  education?: string;
  certifications?: string;
  location?: string;
  workRights?: string;
  extras?: string;
}

// ---------------------------------------------------------- reality check

export type Tier = "ready" | "attainable" | "stretch";

/**
 * The row chips. These must stay identical to TIER_SHORT (the tab labels
 * above the same rows) — two names for one group is the fastest way to make
 * an honest reading look like two different readings.
 */
export const TIER_LABEL: Record<Tier, string> = {
  ready: "Ready now",
  attainable: "Almost there",
  stretch: "Not yet",
};

export interface TierAssessment {
  tier: Tier;
  /** One-to-two sentence why, referencing the user's profile. */
  reasoning: string;
  /** Requirements from the real posting the user already meets. */
  have: string[];
  /** Requirements from the real posting the user is missing. */
  missing: string[];
  /** 0–100 rough match. */
  matchScore: number;
}

export interface ClassifiedJob extends TierAssessment {
  id: string; // assessment id (db) or posting id before persistence
  posting: JobPosting;
  isDream: boolean;
  /** One highlighted "recommended target" per tier. */
  recommended: boolean;
}

/** The dream itself, assessed honestly even without a matching live posting. */
export interface DreamAssessment extends TierAssessment {
  dreamText: string;
  /** Verbatim user phrase the reasoning quotes. */
  quoted: string;
}

export interface LockedTarget {
  id: string;
  title: string;
  company: string;
  location: string;
  posting: JobPosting | null;
  isDream: boolean;
  /** When the target is a stepping-stone, the dream it leads toward. */
  dreamBeyond: string | null;
  lockedAt: string;
}

// ---------------------------------------------------------------- roadmap

export type TaskCategory = "project" | "skill" | "certification" | "experience";

export interface CVLine {
  /** Which CV section the completed task adds a line to. */
  section: "experience" | "skills" | "projects" | "education";
  text: string;
}

/**
 * One sitting's work inside a task — the unpacking that makes an estimate
 * trustworthy. Shaped so a later calendar sync is a mapping, not a rewrite:
 * a title, a description, a duration (see lib/schedule.ts `PlannedBlock`).
 */
export interface RoadmapStep {
  id: string;
  position: number;
  /** Imperative, one sitting: "Scaffold the repo". */
  title: string;
  /** What to literally do first, then why this step exists. */
  detail: string;
  /** Honest minute estimate for this one sitting. */
  minutes: number;
  done: boolean;
  doneAt: string | null;
}

export interface RoadmapTask {
  id: string;
  position: number;
  title: string;
  /** Why this matters for THIS user and THIS target — always shown. */
  why: string;
  category: TaskCategory;
  /** Human effort estimate, e.g. "2 weekends", "3 weeks of evenings". */
  effort: string;
  /**
   * Hours of work this task costs — the only input the schedule is built
   * from. Roadmaps generated before dates existed have none, so readers fill
   * from `defaultHours(category)` (lib/schedule.ts) rather than dropping them.
   */
  estimateHours: number;
  /** 3–6 concrete steps. Empty on roadmaps generated before steps existed. */
  steps: RoadmapStep[];
  done: boolean;
  doneAt: string | null;
  /** First task is always achievable this week. */
  firstWeek: boolean;
  cvLine: CVLine | null;
}

export interface Roadmap {
  id: string;
  targetId: string;
  targetTitle: string;
  targetCompany: string;
  tasks: RoadmapTask[];
  /** Footer when target is a stepping-stone: "This gets you to X. From there, Y becomes attainable." */
  dreamBeyond: string | null;
  /**
   * Day one of the plan, ISO date (`YYYY-MM-DD`). Weeks are 7-day blocks from
   * here — never locale weeks, which would put US and UK users on different
   * calendars. Re-planning from today rewrites this and nothing else.
   */
  startDate: string;
  /** The weekly capacity the user chose. Dates are hours ÷ this. */
  hoursPerWeek: number;
  generatedAt: string;
}

/** Streaming events emitted by POST /api/roadmap/generate (NDJSON lines). */
export type GenerationEvent =
  | {
      type: "stage";
      key: "reading" | "comparing" | "gaps" | "sequencing";
      /** Personalized narration line referencing the user's real data. */
      text: string;
    }
  | { type: "done"; roadmap: Roadmap }
  | { type: "error"; message: string };

// ------------------------------------------------------------- living CV

export interface CVVersion {
  id: string;
  score: number;
  reason: string;
  createdAt: string;
  snapshot: CVData;
}

/** A rendered CV line in the diff view. */
export interface CVDiffLine {
  section: CVLine["section"];
  text: string;
  /** false = not yet earned (greyed); true = present today. */
  earned: boolean;
  /** Task that un-greys this line, when not yet earned. */
  taskId: string | null;
}

export interface CheckinQuestion {
  taskId: string;
  question: string; // "Have you finished X?"
}

export interface Checkin {
  id: string;
  askedAt: string;
  questions: CheckinQuestion[];
  completedAt: string | null;
}

// ------------------------------------------------------------------ flow

/** Where the user must resume. Computed server-side by lib/flow.ts. */
export type FlowPhase =
  | "onboarding"
  | "profile"
  | "bearing"
  | "roadmap"
  | "cv";

export const FLOW_ROUTE: Record<FlowPhase, string> = {
  onboarding: "/onboarding",
  profile: "/profile",
  bearing: "/bearing",
  roadmap: "/roadmap",
  cv: "/cv",
};
