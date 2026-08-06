import "server-only";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { generateJSON, GeminiError } from "@/lib/gemini/json";
import {
  buildGapsPrompt,
  buildRoadmapPrompt,
  GapsSchema,
  GAPS_SYSTEM,
  ROADMAP_SYSTEM,
  RoadmapDraftSchema,
  type ProfileFacts,
  type RequirementCount,
  type TargetFacts,
} from "@/lib/gemini/prompts/roadmap";
import { defaultHours, formatEffort } from "@/lib/schedule";
import type {
  CVData,
  DreamInterpretation,
  GenerationEvent,
  JobPosting,
  QuestionnaireAnswers,
  Roadmap,
  RoadmapStep,
  RoadmapTask,
  Tier,
} from "@/lib/types";

/**
 * POST /api/roadmap/generate — the narrated generation moment.
 *
 * Body: `{ "hoursPerWeek": number }`, optional. Missing, empty or unreadable
 * bodies fall back to 8 — the request predates the pace question and must
 * still draw a route.
 *
 * Streams NDJSON GenerationEvents (content-type application/x-ndjson).
 * Every stage is REAL work on the user's own data:
 *   reading    — profile facts (skill count, a named project or role)
 *   comparing  — real cached-posting + assessment counts vs the target
 *   gaps       — Gemini names the 3 biggest gaps from missing[] + profile
 *   sequencing — ordering statement, then the main Gemini call
 *   done       — roadmap persisted (prior deactivated) and returned whole
 * Any failure emits a valid `error` NDJSON line — the stream never breaks
 * mid-line, and the locked target is never touched on failure.
 */

export const runtime = "nodejs";
// The narrated generation streams through 2 Gemini calls (gaps + main draft),
// with one retry each — allow the full moment on short-timeout platforms.
export const maxDuration = 120;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MSG_GENERIC = "The route couldn't be drawn. Your destination is still locked — try again.";

/** Most evenings. What the pace chooser preselects for an attainable target. */
const DEFAULT_HOURS_PER_WEEK = 8;
const MIN_HOURS_PER_WEEK = 1;
const MAX_HOURS_PER_WEEK = 60;

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status });
}

// ------------------------------------------------------------- request body

const bodySchema = z.object({
  hoursPerWeek: z.number().optional(),
});

/**
 * The user's weekly capacity, clamped to 1–60 hours.
 *
 * Nothing here rejects: a body that is absent, empty, malformed or carrying a
 * nonsense number falls back to 8 rather than 400ing. The pace only sets how
 * far apart the dates sit, and refusing to draw a route over an unparseable
 * number would be a worse answer than drawing it at a sensible default. There
 * is no DB check constraint behind this — the clamp lives here, at the only
 * door hours_per_week comes through on generation.
 */
async function readHoursPerWeek(request: Request): Promise<number> {
  const raw: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  const wanted = parsed.success ? parsed.data.hoursPerWeek : undefined;

  if (wanted === undefined || !Number.isFinite(wanted)) {
    return DEFAULT_HOURS_PER_WEEK;
  }
  // The column is an int, so round before clamping — 0.4 must not floor to 0.
  return Math.min(MAX_HOURS_PER_WEEK, Math.max(MIN_HOURS_PER_WEEK, Math.round(wanted)));
}

/**
 * The server's calendar day as `YYYY-MM-DD` — day one of the plan.
 * Written explicitly rather than left to the column default so the row and
 * the roadmap streamed back on `done` can never name two different dates.
 */
function todayISO(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** job_assessments.tier is free text at the type level; narrow it or drop it. */
function readTier(value: unknown): Tier | null {
  return value === "ready" || value === "attainable" || value === "stretch"
    ? value
    : null;
}

/** A row read back from roadmap_steps — there are no generated DB types. */
interface StepRow {
  id: string;
  task_id: string;
  position: number;
  title: string;
  detail: string | null;
  minutes: number;
  done: boolean;
  done_at: string | null;
}

// ------------------------------------------------------- stage composition

function composeReadingText(profile: ProfileFacts): string {
  const cv = profile.cv;
  const q = profile.questionnaire;

  const skillCount =
    cv && cv.skills.length > 0
      ? cv.skills.length
      : (q?.topSkills
          ?.split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean).length ?? 0);

  const project = cv?.projects[0]?.name;
  const experience = cv?.experience.find((e) => e.current) ?? cv?.experience[0];
  // The role anchor always opens a sentence in both compositions below —
  // keep it capitalized (the project variant opens with a quoted name).
  const role = experience
    ? `Your time as ${experience.role}${experience.company ? ` at ${experience.company}` : ""}`
    : q?.currentRole
      ? `Your work as ${q.currentRole}`
      : null;

  const anchor = project ? `"${project}" stands out in your log` : role ? `${role} is on the record` : null;

  if (skillCount > 0 && anchor) {
    return `${skillCount} skills charted. ${anchor}.`;
  }
  if (skillCount > 0) {
    return `${skillCount} skills charted from your profile — every waypoint ahead builds on them.`;
  }
  if (anchor) {
    return `Your position is plotted. ${anchor}.`;
  }
  return "Your position is plotted from your profile — the route ahead builds on it.";
}

function composeComparingText(
  postingCount: number,
  assessedCount: number,
  targetTitle: string,
): string {
  if (postingCount > 0 && assessedCount > 0) {
    return `${postingCount} cached postings on file — ${assessedCount} assessed against your position for ${targetTitle}.`;
  }
  if (assessedCount > 0) {
    return `${assessedCount} assessed postings measured against your position for ${targetTitle}.`;
  }
  if (postingCount > 0) {
    return `${postingCount} cached postings compared against ${targetTitle}'s requirements.`;
  }
  return `No cached postings tonight — measuring ${targetTitle}'s recorded requirements directly.`;
}

function composeGapsText(gaps: string[], targetTitle: string): string {
  if (gaps.length === 0) {
    return `Few gaps remain between you and ${targetTitle} — sequencing what's left.`;
  }
  return `Between you and ${targetTitle}: ${gaps.join(" · ")}.`;
}

const SEQUENCING_TEXT =
  "Ordering your route — the first waypoint is reachable this week, the heaviest climbs come later.";

// ---------------------------------------------------------------- handler

export async function POST(request: Request): Promise<Response> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json(401, { error: "Sign in to draw your route." });
  }

  // Read the pace before anything else: the body can only be consumed once,
  // and the stream below is opened long after this point.
  const hoursPerWeek = await readHoursPerWeek(request);
  const startDate = todayISO(new Date());

  // ---- preconditions: active locked target + completed profile (409s) ----

  const [targetRes, profileRes, onboardingRes] = await Promise.all([
    supabase
      .from("locked_targets")
      .select("id, assessment_id, title, company, location, posting, is_dream, dream_beyond")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("career_profiles")
      .select("cv_structured, questionnaire, completed_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("onboarding")
      .select("dream_text, dream_interpretation")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const targetRow = targetRes.data;
  if (!targetRow) {
    return json(409, {
      error: "No destination is locked yet. Open Matches and lock one — your roadmap draws from there.",
    });
  }

  const profileRow = profileRes.data;
  if (!profileRow?.completed_at) {
    return json(409, {
      error: "Your profile isn't complete yet. Finish it so the route starts from where you truly stand.",
    });
  }

  const profile: ProfileFacts = {
    cv: (profileRow.cv_structured as CVData | null) ?? null,
    questionnaire: (profileRow.questionnaire as QuestionnaireAnswers | null) ?? null,
  };
  const dreamText = (onboardingRes.data?.dream_text as string | undefined) ?? "";
  const interpretation =
    (onboardingRes.data?.dream_interpretation as DreamInterpretation | null) ?? null;

  // ------------------------------------------------------------ the stream

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const transcript: Array<{ key: string; text: string }> = [];

      const emit = (event: GenerationEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        if (event.type === "stage") {
          transcript.push({ key: event.key, text: event.text });
        }
      };

      try {
        // ---- stage 1: reading — real profile facts, no AI call ----
        emit({ type: "stage", key: "reading", text: composeReadingText(profile) });

        // ---- stage 2: comparing — real cached postings + assessments ----
        const [cacheRes, assessRes] = await Promise.all([
          supabase
            .from("job_search_cache")
            .select("results, fetched_at")
            .eq("user_id", user.id)
            .order("fetched_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("job_assessments")
            .select("id, posting_id, tier, reasoning, have, missing, is_dream")
            .eq("user_id", user.id),
        ]);

        let postingCount = 0;
        const cacheRow = cacheRes.data;
        if (cacheRow) {
          const age = Date.now() - new Date(cacheRow.fetched_at as string).getTime();
          const results = cacheRow.results as { postings?: unknown } | null;
          if (
            Number.isFinite(age) &&
            age >= 0 &&
            age < CACHE_TTL_MS &&
            Array.isArray(results?.postings)
          ) {
            postingCount = results.postings.length;
          }
        }

        const assessments = assessRes.data ?? [];
        const jobAssessments = assessments.filter((a) => !a.is_dream);

        emit({
          type: "stage",
          key: "comparing",
          text: composeComparingText(postingCount, jobAssessments.length, targetRow.title),
        });

        // ---- target's own assessment → have/missing for the prompts ----
        const targetAssessment =
          (targetRow.assessment_id
            ? assessments.find((a) => a.id === targetRow.assessment_id)
            : undefined) ??
          (targetRow.is_dream ? assessments.find((a) => a.is_dream) : undefined) ??
          (targetRow.posting
            ? assessments.find(
                (a) => a.posting_id === (targetRow.posting as JobPosting).id,
              )
            : undefined);

        const targetMissing = Array.isArray(targetAssessment?.missing)
          ? (targetAssessment.missing as string[])
          : [];
        const targetHave = Array.isArray(targetAssessment?.have)
          ? (targetAssessment.have as string[])
          : [];
        // How far the target sits from the user sets how heavy the route
        // should be. Null when the target was locked without an assessment on
        // file — the prompt then asks for honest hours with no band at all.
        const targetTier = readTier(targetAssessment?.tier);

        const target: TargetFacts = {
          title: targetRow.title,
          company: targetRow.company,
          location: targetRow.location ?? "",
          isDream: Boolean(targetRow.is_dream),
          dreamBeyond: (targetRow.dream_beyond as string | null) ?? null,
          have: targetHave,
          missing: targetMissing,
          reasoning: (targetAssessment?.reasoning as string | undefined) ?? "",
        };

        // ---- aggregate real requirement counts across assessments ----
        const countsByKey = new Map<string, RequirementCount>();
        for (const a of jobAssessments) {
          const missing = Array.isArray(a.missing) ? (a.missing as string[]) : [];
          for (const raw of missing) {
            const requirement = raw.trim();
            if (!requirement) continue;
            const key = requirement.toLowerCase();
            const existing = countsByKey.get(key);
            if (existing) existing.count += 1;
            else countsByKey.set(key, { requirement, count: 1 });
          }
        }
        const requirementCounts = [...countsByKey.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        const promptContext = {
          dreamText,
          interpretation,
          target,
          profile,
          requirementCounts,
          totalAssessed: jobAssessments.length,
        };

        // ---- stage 3: gaps — Gemini names the 3 biggest gaps ----
        let gaps: string[];
        try {
          const result = await generateJSON({
            prompt: buildGapsPrompt(promptContext),
            schema: GapsSchema,
            system: GAPS_SYSTEM,
            temperature: 0.4,
          });
          gaps = result.gaps;
        } catch {
          // The moment survives a gaps-call failure: fall back to the
          // target's own recorded missing requirements, no AI needed.
          gaps = targetMissing.slice(0, 3);
        }

        emit({ type: "stage", key: "gaps", text: composeGapsText(gaps, target.title) });

        // ---- stage 4: sequencing, then the main call ----
        emit({ type: "stage", key: "sequencing", text: SEQUENCING_TEXT });

        const draft = await generateJSON({
          prompt: buildRoadmapPrompt({ ...promptContext, gaps, tier: targetTier }),
          schema: RoadmapDraftSchema,
          system: ROADMAP_SYSTEM,
          temperature: 0.6,
        });

        // Normalize: order by position, re-number 1..n, firstWeek on task 1 only.
        const drafts = [...draft.tasks]
          .sort((a, b) => a.position - b.position)
          .slice(0, 10)
          .map((t, i) => ({ ...t, position: i + 1, firstWeek: i === 0 }));

        // ---- persist: build the new roadmap fully BEFORE touching actives.
        // Order matters for crash-safety: insert the row inactive, insert
        // its tasks, insert their steps, and only then flip actives. A failure
        // at any earlier step leaves the prior roadmap active and untouched —
        // never an active zero-task roadmap, never an active roadmap whose
        // tasks lost their steps, never a silently discarded route.
        const { data: roadmapRow, error: roadmapError } = await supabase
          .from("roadmaps")
          .insert({
            user_id: user.id,
            target_id: targetRow.id,
            dream_beyond: target.dreamBeyond,
            narrative: transcript,
            start_date: startDate,
            hours_per_week: hoursPerWeek,
            active: false,
          })
          .select("id, generated_at, start_date, hours_per_week")
          .single();
        if (roadmapError || !roadmapRow) {
          throw new Error(`roadmap insert failed: ${roadmapError?.message ?? "no row"}`);
        }

        const { data: taskRows, error: tasksError } = await supabase
          .from("roadmap_tasks")
          .insert(
            drafts.map((t) => ({
              roadmap_id: roadmapRow.id,
              user_id: user.id,
              position: t.position,
              title: t.title,
              why: t.why,
              category: t.category,
              // Derived, never generated: the prose and the number the dates
              // are built from come from one source (lib/schedule.ts), so the
              // column stays non-null and can never contradict the calendar.
              effort: formatEffort(t.estimateHours),
              estimate_hours: t.estimateHours,
              done: false,
              done_at: null,
              first_week: t.firstWeek,
              cv_line: t.cvLine,
            })),
          )
          .select(
            "id, position, title, why, category, effort, estimate_hours, done, done_at, first_week, cv_line",
          );
        if (tasksError || !taskRows) {
          throw new Error(`task insert failed: ${tasksError?.message ?? "no rows"}`);
        }

        // Steps hang off the task rows we just got back, matched on position —
        // the drafts were re-numbered 1..n above, and the insert preserves it.
        const taskIdByPosition = new Map<number, string>(
          taskRows.map((row) => [row.position as number, row.id as string]),
        );
        const stepInserts = drafts.flatMap((t) => {
          const taskId = taskIdByPosition.get(t.position);
          if (!taskId) return [];
          return t.steps.map((s, i) => ({
            task_id: taskId,
            user_id: user.id,
            position: i + 1,
            title: s.title,
            detail: s.detail,
            minutes: s.minutes,
            done: false,
            done_at: null,
          }));
        });

        const stepRows: StepRow[] = [];
        if (stepInserts.length > 0) {
          const { data, error: stepsError } = await supabase
            .from("roadmap_steps")
            .insert(stepInserts)
            .select("id, task_id, position, title, detail, minutes, done, done_at");
          if (stepsError || !data) {
            throw new Error(`step insert failed: ${stepsError?.message ?? "no rows"}`);
          }
          stepRows.push(...(data as StepRow[]));
        }

        // Flip actives last (roadmaps_one_active demands deactivate-first).
        // These two statements are the one window this route cannot make
        // atomic: a reset connection or a maxDuration cut between them leaves
        // the user owning roadmaps with none active. That is not a dead end —
        // app/(app)/roadmap/page.tsx adopts the newest roadmap of the active
        // target that has tasks and re-flags it, so the next load lands on the
        // plan rather than on an offer to redraw one they already have.
        const { error: deactivateError } = await supabase
          .from("roadmaps")
          .update({ active: false })
          .eq("user_id", user.id)
          .eq("active", true)
          .neq("id", roadmapRow.id);
        if (deactivateError) {
          throw new Error(`roadmap deactivate failed: ${deactivateError.message}`);
        }

        const { error: activateError } = await supabase
          .from("roadmaps")
          .update({ active: true })
          .eq("id", roadmapRow.id)
          .eq("user_id", user.id);
        if (activateError) {
          throw new Error(`roadmap activate failed: ${activateError.message}`);
        }

        const stepsByTask = new Map<string, RoadmapStep[]>();
        for (const row of stepRows) {
          const step: RoadmapStep = {
            id: row.id,
            position: row.position,
            title: row.title,
            detail: row.detail ?? "",
            minutes: Number(row.minutes) || 0,
            done: Boolean(row.done),
            doneAt: row.done_at ?? null,
          };
          const existing = stepsByTask.get(row.task_id);
          if (existing) existing.push(step);
          else stepsByTask.set(row.task_id, [step]);
        }
        for (const steps of stepsByTask.values()) {
          steps.sort((a, b) => a.position - b.position);
        }

        const tasks: RoadmapTask[] = taskRows
          .slice()
          .sort((a, b) => (a.position as number) - (b.position as number))
          .map((row) => {
            const category = row.category as RoadmapTask["category"];
            return {
              id: row.id as string,
              position: row.position as number,
              title: row.title as string,
              why: row.why as string,
              category,
              effort: row.effort as string,
              // numeric(5,2) can come back as a string; 0 and null both mean
              // "never estimated", which the category fallback covers.
              estimateHours: Number(row.estimate_hours) || defaultHours(category),
              steps: stepsByTask.get(row.id as string) ?? [],
              done: Boolean(row.done),
              doneAt: (row.done_at as string | null) ?? null,
              firstWeek: Boolean(row.first_week),
              cvLine: (row.cv_line as RoadmapTask["cvLine"]) ?? null,
            };
          });

        const roadmap: Roadmap = {
          id: roadmapRow.id as string,
          targetId: targetRow.id as string,
          targetTitle: target.title,
          targetCompany: target.company,
          tasks,
          dreamBeyond: target.dreamBeyond,
          startDate: (roadmapRow.start_date as string | null) ?? startDate,
          hoursPerWeek: Number(roadmapRow.hours_per_week) || hoursPerWeek,
          generatedAt: roadmapRow.generated_at as string,
        };

        emit({ type: "done", roadmap });
      } catch (err) {
        const message = err instanceof GeminiError ? err.message : MSG_GENERIC;
        try {
          emit({ type: "error", message });
        } catch {
          // Stream already closed by the client — nothing to emit into.
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      // Defeat proxy buffering so stages arrive as they're worked.
      "x-accel-buffering": "no",
    },
  });
}
