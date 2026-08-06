import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { generateJSON, GeminiError } from "@/lib/gemini/json";
import { parsePosting, postingSchema } from "@/lib/jobs/posting";
import {
  buildClassifyPrompt,
  buildProfileSummary,
  CLASSIFY_BATCH_SIZE,
  CLASSIFY_SYSTEM,
  classifyResponseSchema,
  type ClassifyItem,
} from "@/lib/gemini/prompts/classify";
import {
  recommendedPostingIds,
  rowToClassifiedJob,
  type AssessmentRow,
} from "@/components/bearing/assessments";
import type {
  ClassifiedJob,
  CVData,
  DreamInterpretation,
  JobPosting,
  QuestionnaireAnswers,
  Tier,
} from "@/lib/types";

/**
 * POST /api/jobs/classify — docs/CONTRACTS.md.
 * Body: { postings: JobPosting[] } (≤24, zod-validated) plus an optional
 * `reset` flag the retake flow sends with its first batch so stale
 * assessments don't linger. Every posting id must belong to a search this
 * user actually ran: the server rehydrates the posting objects from
 * `job_search_cache` and discards the client's copies, so fabricated text can
 * never reach a Gemini prompt or a job_assessments row. Gemini then runs in
 * batches of CLASSIFY_BATCH_SIZE — ONE call per batch returning a JSON array
 * — assessments are upserted, then the one recommended target per tier (top
 * matchScore, above the minimum) is recomputed and persisted.
 *
 * SPENDING THE FREE TIER WELL. The measured ceiling is 5 requests/minute AND
 * 20 requests/DAY per project per model, so a bearing that costs one model
 * call per eight postings costs the user a quarter of their day. Two rules
 * here bring a 24-posting bearing down to two calls however the client
 * chooses to chunk it:
 *
 *  1. A posting that already has a stored assessment is never re-read. The
 *     bearing renders the stored row either way, so a second call would buy
 *     nothing. (`reset` clears the rows first, so a retake still re-reads.)
 *  2. A short batch is topped up with not-yet-assessed postings from the
 *     same search — the ones the next request was going to ask about. The
 *     response still returns only what was asked for; the look-ahead just
 *     means the next request finds its work already done.
 *
 * Consecutive model calls are paced by CALL_SPACING_MS so a multi-batch
 * request stays under the per-minute ceiling instead of racing it.
 *
 * This route is fail-closed by design, and `lib/jobs/search.ts` is what makes
 * that safe to be: it validates against this same `postingSchema` before it
 * caches, and it throws rather than returning postings it couldn't record.
 * So the "not part of your current search" refusal below can only fire on a
 * genuinely unknown id — never on a posting the bearing actually showed.
 * Loosening either side re-opens the dead end; do not trust the request body.
 * The look-ahead pool obeys the same rule: it is drawn from this user's own
 * cache rows, never from anything the client sent.
 */

/**
 * Minimum gap between the START of two Gemini calls in one request. Measured
 * from the start, so a call that already took longer than this waits not at
 * all — it only paces batches that would otherwise fire back-to-back.
 */
const CALL_SPACING_MS = 12_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const bodySchema = z.object({
  postings: z.array(postingSchema).min(1).max(24),
  reset: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You're signed out. Sign in to take your bearing." },
        { status: 401 },
      );
    }

    const raw: unknown = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "The postings couldn't be read. Retake the bearing." },
        { status: 400 },
      );
    }
    const { postings: requestedPostings, reset } = parsed.data;

    const [profileRes, onboardingRes] = await Promise.all([
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

    const profile = profileRes.data;
    if (!profile?.completed_at) {
      return NextResponse.json(
        { error: "Your position isn't charted yet — complete your profile first." },
        { status: 400 },
      );
    }

    // Only postings this user's own search actually returned may be
    // classified. The cached copy — not the request body — is what reaches
    // Gemini and the database. The 24h TTL is ignored here so a delayed
    // retry of a failed batch still validates against its own search.
    const { data: cacheRows } = await supabase
      .from("job_search_cache")
      .select("results")
      .eq("user_id", user.id)
      .order("fetched_at", { ascending: false })
      .limit(5);

    const cachedById = new Map<string, JobPosting>();
    /**
     * The newest search, in the order the bearing shows it — the only pool
     * the batch top-up may draw from. Older cache rows still validate ids
     * (a delayed retry must work) but must never pull a stale search's
     * postings into a model call the user didn't ask for.
     */
    let latestSearch: JobPosting[] = [];
    (cacheRows ?? []).forEach((row, rowIndex) => {
      const results = (row as { results?: unknown }).results;
      const list =
        results &&
        typeof results === "object" &&
        Array.isArray((results as { postings?: unknown }).postings)
          ? (results as { postings: unknown[] }).postings
          : [];
      const parsedRow: JobPosting[] = [];
      for (const rawPosting of list) {
        // Same schema searchJobs validated with before caching, so anything
        // it recorded parses back out here — and only http(s) urls do.
        const cached = parsePosting(rawPosting);
        if (!cached) continue;
        parsedRow.push(cached);
        if (!cachedById.has(cached.id)) cachedById.set(cached.id, cached);
      }
      if (rowIndex === 0) latestSearch = parsedRow;
    });

    const postings: JobPosting[] = [];
    for (const requested of requestedPostings) {
      const cached = cachedById.get(requested.id);
      if (!cached) {
        // Unreachable from a healthy bearing (see the header note). Name a
        // recovery that actually works: a reload with no stored assessments
        // re-runs the search from scratch.
        return NextResponse.json(
          {
            error:
              "Those postings aren't in your current bearing. Reload the page to take a fresh one.",
          },
          { status: 400 },
        );
      }
      postings.push(cached);
    }

    if (reset) {
      await supabase
        .from("job_assessments")
        .delete()
        .eq("user_id", user.id)
        .eq("is_dream", false);
    }

    const cv = (profile.cv_structured ?? null) as CVData | null;
    const questionnaire = (profile.questionnaire ?? null) as QuestionnaireAnswers | null;
    const interp = (onboardingRes.data?.dream_interpretation ??
      null) as DreamInterpretation | null;
    const dreamText = ((onboardingRes.data?.dream_text as string | null) ?? "").trim();
    const profileSummary = buildProfileSummary(cv, questionnaire);

    // Rule 1: skip what is already read. A stored assessment is what the
    // bearing renders anyway, so re-reading it spends a day's quota on an
    // answer we already have. `reset` above deleted the rows first, so a
    // retake still re-reads everything.
    const { data: storedRows } = await supabase
      .from("job_assessments")
      .select("posting_id")
      .eq("user_id", user.id)
      .eq("is_dream", false);
    const alreadyRead = new Set(
      (storedRows ?? []).map((row) => String((row as { posting_id: string }).posting_id)),
    );

    const unread = postings.filter((posting) => !alreadyRead.has(posting.id));

    // Rule 2: top a short batch up to a full one with postings from the same
    // search that nothing has read yet — the work the next request was about
    // to ask for. Only the requested postings come back in the response.
    const work = [...unread];
    const shortfall =
      work.length === 0
        ? 0
        : (CLASSIFY_BATCH_SIZE - (work.length % CLASSIFY_BATCH_SIZE)) % CLASSIFY_BATCH_SIZE;
    if (shortfall > 0) {
      const claimed = new Set(work.map((posting) => posting.id));
      let added = 0;
      for (const candidate of latestSearch) {
        if (added >= shortfall) break;
        if (claimed.has(candidate.id) || alreadyRead.has(candidate.id)) continue;
        claimed.add(candidate.id);
        work.push(candidate);
        added += 1;
      }
    }

    // Sequential batches, paced — one Gemini call each (free-tier limits).
    let lastCallStartedAt = 0;
    for (let i = 0; i < work.length; i += CLASSIFY_BATCH_SIZE) {
      const batch = work.slice(i, i + CLASSIFY_BATCH_SIZE);

      const wait =
        lastCallStartedAt === 0 ? 0 : CALL_SPACING_MS - (Date.now() - lastCallStartedAt);
      if (wait > 0) await sleep(wait);
      lastCallStartedAt = Date.now();

      let items: ClassifyItem[];
      try {
        items = await generateJSON({
          prompt: buildClassifyPrompt({
            profileSummary,
            dreamText,
            quotedPhrases: interp?.quotedPhrases ?? [],
            postings: batch,
          }),
          schema: classifyResponseSchema(batch.length),
          system: CLASSIFY_SYSTEM,
          temperature: 0.3,
        });
      } catch (err) {
        console.error("[/api/jobs/classify] gemini", err);
        const message =
          err instanceof GeminiError
            ? err.message
            : "The bearing couldn't be read. Try again.";
        return NextResponse.json({ error: message }, { status: 502 });
      }

      // Match responses to postings by id; fall back to array order.
      const byId = new Map(items.map((item) => [item.postingId, item]));
      const rows = batch.map((posting, index) => {
        const item = byId.get(posting.id) ?? items[index];
        return {
          user_id: user.id,
          posting,
          posting_id: posting.id,
          tier: item.tier,
          reasoning: item.reasoning,
          have: item.have,
          missing: item.missing,
          match_score: item.matchScore,
          is_dream: false,
        };
      });

      const { error: upsertError } = await supabase
        .from("job_assessments")
        .upsert(rows, { onConflict: "user_id,posting_id" });
      if (upsertError) {
        console.error("[/api/jobs/classify] upsert", upsertError);
        return NextResponse.json(
          { error: "The assessments couldn't be saved. Try again." },
          { status: 500 },
        );
      }
    }

    // Recompute the ONE recommended target per tier across everything stored.
    const { data: allRows, error: readError } = await supabase
      .from("job_assessments")
      .select(
        "id, posting, posting_id, tier, reasoning, have, missing, match_score, is_dream, recommended",
      )
      .eq("user_id", user.id)
      .eq("is_dream", false);
    if (readError || !allRows) {
      console.error("[/api/jobs/classify] read-back", readError);
      return NextResponse.json(
        { error: "The assessments couldn't be read back. Try again." },
        { status: 500 },
      );
    }

    const typedRows = allRows as unknown as AssessmentRow[];
    const winners = recommendedPostingIds(
      typedRows
        .filter((r) => r.tier === "ready" || r.tier === "attainable" || r.tier === "stretch")
        .map((r) => ({
          postingId: r.posting_id,
          tier: r.tier as Tier,
          matchScore: Number(r.match_score),
        })),
    );
    const winnerRowIds = typedRows
      .filter((r) => winners.has(r.posting_id))
      .map((r) => r.id);

    await supabase
      .from("job_assessments")
      .update({ recommended: false })
      .eq("user_id", user.id)
      .eq("is_dream", false)
      .eq("recommended", true);
    if (winnerRowIds.length > 0) {
      await supabase
        .from("job_assessments")
        .update({ recommended: true })
        .eq("user_id", user.id)
        .in("id", winnerRowIds);
    }

    // Respond with this request's postings, flags corrected, input order kept.
    const requestedOrder = new Map(postings.map((p, i) => [p.id, i]));
    const classified = typedRows
      .filter((r) => requestedOrder.has(r.posting_id))
      .map((r) => rowToClassifiedJob({ ...r, recommended: winners.has(r.posting_id) }))
      .filter((j): j is ClassifiedJob => j !== null)
      .sort(
        (a, b) =>
          (requestedOrder.get(a.posting.id) ?? 0) - (requestedOrder.get(b.posting.id) ?? 0),
      );

    return NextResponse.json({ classified });
  } catch (err) {
    console.error("[/api/jobs/classify]", err);
    return NextResponse.json(
      { error: "The bearing couldn't be read. Try again." },
      { status: 500 },
    );
  }
}
