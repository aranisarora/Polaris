import "server-only";
import { COLLEGE_BY_SLUG } from "./data/colleges";
import { buildAudit, type Audit, type ProfileSignals } from "./engine/audit";
import { computeAltitude, projectedAltitude, type Altitude } from "./engine/altitude";
import { buildCountdown, type Countdown } from "./engine/countdown";
import {
  buildLedger,
  repairedRecord,
  type Ledger,
} from "./engine/eligibility";
import { buildReachSet, type ReachSet } from "./engine/reach";
import { matchProof, type ProofMatch } from "./engine/proof";
import {
  DEFAULT_CONSTRAINTS,
  buildRoadmap,
  type Constraints,
  type Roadmap,
} from "./engine/roadmap";
import type { StudentRecord } from "./engine/record";
import { readAnonRecord } from "./session";
import { createClient, getUser } from "./supabase/server";

/**
 * Everything the app surfaces need, assembled once.
 *
 * The engine is pure, so this is cheap: the whole chain from seven fields to a
 * scheduled roadmap is arithmetic over in-process data with no database round
 * trips. That is what lets `docs/platform.md` §1.5's <3s budget hold, and what
 * makes `docs/product.md` §13's "useful cold" constraint true rather than
 * aspirational.
 */

export type Viewer = {
  record: StudentRecord;
  userId: string | null;
  collegeLabel: string;
  signals: ProfileSignals;
  ledger: Ledger;
  repairedLedger: Ledger;
  reach: ReachSet;
  proof: ProofMatch;
  audit: Audit;
  altitude: Altitude;
  altitudeAfterRepair: number;
  countdown: Countdown;
  constraints: Constraints;
  roadmap: Roadmap;
  /** §7's freemium line: the mechanism locks, the content never does. */
  freeUntil: string | null;
  /** Computed here rather than at render — the clock is not a pure function. */
  freeDaysLeft: number | null;
  plan: "free" | "paid";
  mechanismLocked: boolean;
};

const EMPTY_SIGNALS: ProfileSignals = { projects: [] };

export async function loadViewer(): Promise<Viewer | null> {
  const record = await readAnonRecord();
  if (!record) return null;

  const user = await getUser();

  let signals: ProfileSignals = EMPTY_SIGNALS;
  const constraints: Constraints = DEFAULT_CONSTRAINTS;
  let freeUntil: string | null = null;
  let plan: "free" | "paid" = "free";

  if (user) {
    const supabase = await createClient();
    if (supabase) {
      const [{ data: profile }, { data: entities }, { data: connections }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("free_until, plan")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("cv_entities")
            .select("kind, data")
            .eq("profile_id", user.id)
            .is("archived_at", null),
          supabase
            .from("connections")
            .select("provider, handle, data")
            .eq("profile_id", user.id),
        ]);

      if (profile) {
        freeUntil = profile.free_until as string;
        plan = (profile.plan as "free" | "paid") ?? "free";
      }

      signals = buildSignals(entities ?? [], connections ?? []);
    }
  }

  const ledger = buildLedger(record);
  const repaired = buildLedger(repairedRecord(record));
  const audit = buildAudit(signals);
  const proof = matchProof(record, ledger);
  const reach = buildReachSet(ledger);
  const altitude = computeAltitude(ledger, audit, record, {}, repaired);
  const countdown = buildCountdown(
    record.gradYear,
    record.universityCode,
    new Date(),
    constraints.hoursPerWeek,
  );
  const roadmap = buildRoadmap(record, ledger, audit, constraints);

  const college = record.collegeSlug
    ? COLLEGE_BY_SLUG.get(record.collegeSlug)
    : undefined;

  const now = Date.now();
  const mechanismLocked =
    plan === "free" && freeUntil !== null && new Date(freeUntil).getTime() < now;
  const freeDaysLeft = freeUntil
    ? Math.max(0, Math.ceil((new Date(freeUntil).getTime() - now) / 86_400_000))
    : null;

  return {
    record,
    userId: user?.id ?? null,
    collegeLabel: college
      ? `${college.name} · ${record.branch} · ${record.gradYear}`
      : `${record.branch} · ${record.gradYear}`,
    signals,
    ledger,
    repairedLedger: repaired,
    reach,
    proof,
    audit,
    altitude,
    altitudeAfterRepair: projectedAltitude(repaired, record),
    countdown,
    constraints,
    roadmap,
    freeUntil,
    freeDaysLeft,
    plan,
    mechanismLocked,
  };
}

type EntityRow = { kind: string; data: Record<string, unknown> };
type ConnectionRow = {
  provider: string;
  handle: string;
  data: Record<string, unknown>;
};

function buildSignals(
  entities: EntityRow[],
  connections: ConnectionRow[],
): ProfileSignals {
  const projects = entities
    .filter((e) => e.kind === "project")
    .map((e) => ({
      title: String(e.data.title ?? "Untitled"),
      blurb: e.data.blurb ? String(e.data.blurb) : undefined,
      deployedUrl: e.data.deployedUrl ? String(e.data.deployedUrl) : undefined,
    }));

  const skills = entities
    .filter((e) => e.kind === "skill")
    .map((e) => String(e.data.name ?? ""));

  const certifications = entities
    .filter((e) => e.kind === "certification")
    .map((e) => ({
      name: String(e.data.name ?? ""),
      proctored: Boolean(e.data.proctored),
    }));

  const github = connections.find((c) => c.provider === "github");
  const leetcode = connections.find((c) => c.provider === "leetcode");

  return {
    projects,
    skillsListed: skills.length ? skills : undefined,
    certifications: certifications.length ? certifications : undefined,
    github: github
      ? {
          username: github.handle,
          publicRepos: Number(github.data.publicRepos ?? 0),
          totalCommits: Number(github.data.totalCommits ?? 0),
          distinctCommitDays: Number(github.data.distinctCommitDays ?? 0),
          hasProfileReadme: Boolean(github.data.hasProfileReadme),
        }
      : undefined,
    leetcode: leetcode
      ? {
          username: leetcode.handle,
          solved: Number(leetcode.data.solved ?? 0),
          easy: Number(leetcode.data.easy ?? 0),
          medium: Number(leetcode.data.medium ?? 0),
          hard: Number(leetcode.data.hard ?? 0),
        }
      : undefined,
  };
}
