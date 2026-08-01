import { ACTIONS } from "../data/actions";
import { ANTI_PATTERNS, TAXONOMY_VERSION } from "../data/anti-patterns";
import type { AntiPattern } from "../data/types";

/**
 * The signal audit — `docs/product.md` §9.3, the emotional payload.
 *
 * Brutal, specific, unflattering, and never a verdict on the person
 * (`docs/brand.md` §2.2). Being usefully harsh is a deliberate product
 * decision: a general assistant will not tell someone their three projects are
 * worth nothing, and nobody else in their life will either.
 *
 * Every finding carries its fix, sized in hours. A finding without a lever is
 * an insult, and the audit is not for that.
 */

export const AUDIT_VERSION = `audit-2026.08.02+${TAXONOMY_VERSION}`;

export type ProjectInput = {
  title: string;
  blurb?: string;
  deployedUrl?: string;
};

export type GithubSignals = {
  username: string;
  publicRepos: number;
  totalCommits: number;
  /** The number that matters — four commits on one day is the finding. */
  distinctCommitDays: number;
  hasProfileReadme: boolean;
};

export type LeetcodeSignals = {
  username: string;
  solved: number;
  easy: number;
  medium: number;
  hard: number;
};

export type ProfileSignals = {
  projects: ProjectInput[];
  github?: GithubSignals;
  leetcode?: LeetcodeSignals;
  courses?: { name: string; percentComplete?: number }[];
  certifications?: { name: string; proctored: boolean }[];
  skillsListed?: string[];
  hasObjectiveStatement?: boolean;
  usesTeamLanguage?: boolean;
};

export type FindingSection = "projects" | "evidence" | "document";

export type Finding = {
  slug: string;
  section: FindingSection;
  /** What the finding is about: the project title, or "GitHub". */
  subject: string;
  verdict: string;
  detail: string;
  fix?: string;
  fixHours: number;
  weight: number;
};

export type DifferentiatingSignal = "none" | "thin" | "present";

export type Audit = {
  version: string;
  findings: Finding[];
  bySection: Record<FindingSection, Finding[]>;
  differentiatingSignal: DifferentiatingSignal;
  /**
   * Hours to a profile that stands out — the project track from the action
   * catalogue plus the cheap evidence fixes. Derived, never asserted.
   */
  hoursToDifferentiate: number;
  /** The one verdict line for the screen. Under seven words. */
  verdict: string;
  /** The closing statement of where this lands. */
  destination: string;
};

const PROJECT_TRACK_HOURS = ACTIONS.filter((a) => a.category === "project")
  .reduce((sum, a) => sum + a.effortHours, 0);

function matchAntiPattern(text: string): AntiPattern | undefined {
  const haystack = text.toLowerCase();
  return ANTI_PATTERNS.filter((p) => p.category === "project")
    .filter((p) => p.match.some((m) => haystack.includes(m)))
    .sort((a, b) => b.weight - a.weight)[0];
}

function byWeight(a: Finding, b: Finding) {
  return b.weight - a.weight;
}

export function buildAudit(signals: ProfileSignals): Audit {
  const findings: Finding[] = [];

  // ── Projects ────────────────────────────────────────────────────────────
  let distinctiveProjects = 0;

  for (const project of signals.projects) {
    const pattern = matchAntiPattern(`${project.title} ${project.blurb ?? ""}`);
    if (pattern) {
      findings.push({
        slug: pattern.slug,
        section: "projects",
        subject: project.title,
        verdict: pattern.verdict,
        detail: pattern.finding,
        fix: pattern.fixHours > 0 ? pattern.fix : pattern.fix,
        fixHours: pattern.fixHours,
        weight: pattern.weight,
      });
    } else if (project.deployedUrl) {
      distinctiveProjects += 1;
    } else {
      distinctiveProjects += 0.5;
    }
  }

  if (signals.projects.length === 0) {
    findings.push({
      slug: "no-projects",
      section: "projects",
      subject: "Projects",
      verdict: "Nothing listed",
      detail:
        "No projects on record. For a software role the project section is the only part of a fresher CV that is genuinely yours — everything else is a number the university assigned you.",
      fix: "One project a stranger can use. The roadmap starts it this week.",
      fixHours: PROJECT_TRACK_HOURS,
      weight: 99,
    });
  }

  const deployed = signals.projects.filter((p) => p.deployedUrl).length;
  if (signals.projects.length > 0 && deployed === 0) {
    const p = ANTI_PATTERNS.find((x) => x.slug === "no-deployment")!;
    findings.push({
      slug: p.slug,
      section: "document",
      subject: "Nothing running",
      verdict: p.verdict,
      detail: p.finding,
      fix: p.fix,
      fixHours: p.fixHours,
      weight: p.weight,
    });
  }

  // ── Evidence ────────────────────────────────────────────────────────────
  const gh = signals.github;
  if (!gh || gh.publicRepos === 0) {
    const p = ANTI_PATTERNS.find((x) => x.slug === "github-empty")!;
    findings.push({
      slug: p.slug,
      section: "evidence",
      subject: "GitHub",
      verdict: gh ? p.verdict : "Not connected",
      detail: gh
        ? p.finding
        : "No GitHub connected. It is the cheapest evidence available for a software role, and the one interviewers actually open.",
      fix: p.fix,
      fixHours: p.fixHours,
      weight: p.weight,
    });
  } else if (gh.distinctCommitDays <= 3 && gh.totalCommits > 0) {
    const p = ANTI_PATTERNS.find((x) => x.slug === "github-thin")!;
    findings.push({
      slug: p.slug,
      section: "evidence",
      subject: "GitHub",
      verdict: p.verdict,
      detail: `${gh.totalCommits} ${gh.totalCommits === 1 ? "commit" : "commits"}, across ${gh.distinctCommitDays} ${gh.distinctCommitDays === 1 ? "day" : "days"}. ${p.finding}`,
      fix: p.fix,
      fixHours: p.fixHours,
      weight: p.weight,
    });
  }

  const lc = signals.leetcode;
  if (lc && lc.solved > 0) {
    const easyShare = lc.easy / Math.max(1, lc.solved);
    if (easyShare > 0.7) {
      const p = ANTI_PATTERNS.find((x) => x.slug === "leetcode-easy-heavy")!;
      findings.push({
        slug: p.slug,
        section: "evidence",
        subject: "LeetCode",
        verdict: p.verdict,
        detail: `${lc.solved} solved · ${Math.round(easyShare * 100)}% easy. ${p.finding}`,
        fix: p.fix,
        fixHours: p.fixHours,
        weight: p.weight,
      });
    }
  }

  for (const course of signals.courses ?? []) {
    if ((course.percentComplete ?? 0) < 100) {
      const p = ANTI_PATTERNS.find((x) => x.slug === "course-no-artefact")!;
      findings.push({
        slug: p.slug,
        section: "evidence",
        subject: course.name,
        verdict: p.verdict,
        detail: `${course.percentComplete ?? 0}% complete. ${p.finding}`,
        fix: p.fix,
        fixHours: p.fixHours,
        weight: p.weight,
      });
    }
  }

  const unproctored = (signals.certifications ?? []).filter((c) => !c.proctored);
  if (unproctored.length >= 3) {
    const p = ANTI_PATTERNS.find((x) => x.slug === "certificates-over-artefacts")!;
    findings.push({
      slug: p.slug,
      section: "evidence",
      subject: "Certificates",
      verdict: p.verdict,
      detail: `${unproctored.length} unproctored certificates listed. ${p.finding}`,
      fix: p.fix,
      fixHours: p.fixHours,
      weight: p.weight,
    });
  }

  // ── Document and framing ────────────────────────────────────────────────
  if ((signals.skillsListed?.length ?? 0) > 12) {
    const p = ANTI_PATTERNS.find((x) => x.slug === "skill-list-inflation")!;
    findings.push({
      slug: p.slug,
      section: "document",
      subject: "Skills section",
      verdict: p.verdict,
      detail: `${signals.skillsListed!.length} technologies listed. ${p.finding}`,
      fix: p.fix,
      fixHours: p.fixHours,
      weight: p.weight,
    });
  }

  if (signals.hasObjectiveStatement) {
    const p = ANTI_PATTERNS.find((x) => x.slug === "generic-objective")!;
    findings.push({
      slug: p.slug,
      section: "document",
      subject: "Objective statement",
      verdict: p.verdict,
      detail: p.finding,
      fix: p.fix,
      fixHours: p.fixHours,
      weight: p.weight,
    });
  }

  if (signals.usesTeamLanguage) {
    const p = ANTI_PATTERNS.find((x) => x.slug === "unclear-contribution")!;
    findings.push({
      slug: p.slug,
      section: "document",
      subject: "Project descriptions",
      verdict: p.verdict,
      detail: p.finding,
      fix: p.fix,
      fixHours: p.fixHours,
      weight: p.weight,
    });
  }

  findings.sort(byWeight);

  const differentiatingSignal: DifferentiatingSignal =
    distinctiveProjects >= 1 && deployed > 0
      ? "present"
      : distinctiveProjects > 0
        ? "thin"
        : "none";

  // The cheap evidence fixes, plus the whole project track. Every hour here is
  // a number from the action catalogue rather than an estimate.
  const evidenceFixHours = findings
    .filter((f) => f.section !== "projects" && f.fixHours > 0)
    .reduce((sum, f) => sum + f.fixHours, 0);

  const hoursToDifferentiate =
    differentiatingSignal === "present"
      ? Math.round(evidenceFixHours)
      : Math.round(PROJECT_TRACK_HOURS + evidenceFixHours);

  const verdict =
    differentiatingSignal === "none"
      ? `You're ${hoursToDifferentiate} hours from standing out.`
      : differentiatingSignal === "thin"
        ? `One project short of a real answer.`
        : `Your evidence is ${hoursToDifferentiate} hours from tidy.`;

  const destination =
    differentiatingSignal === "present"
      ? "You have something to defend. The work left is making it easy to find."
      : "One project you can defend for twenty minutes, with commits proving you built it.";

  return {
    version: AUDIT_VERSION,
    findings,
    bySection: {
      projects: findings.filter((f) => f.section === "projects"),
      evidence: findings.filter((f) => f.section === "evidence"),
      document: findings.filter((f) => f.section === "document"),
    },
    differentiatingSignal,
    hoursToDifferentiate,
    verdict,
    destination,
  };
}
