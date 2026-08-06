import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { generateJSON, GeminiError } from "@/lib/gemini/json";
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
 * batches of 8 — ONE call per batch returning a JSON array — assessments are
 * upserted, then the one recommended target per tier (top matchScore, above
 * the minimum) is recomputed and persisted.
 */

const salarySchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().optional(),
    text: z.string().optional(),
  })
  .nullish()
  .transform((v) => v ?? undefined);

const postingSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["jooble", "adzuna"]),
  sourceId: z.string(),
  title: z.string().min(1),
  company: z.string(),
  location: z.string(),
  country: z.enum(["us", "gb"]),
  description: z.string(),
  salary: salarySchema,
  // Rendered as an anchor href downstream — http(s) only, never
  // javascript:/data:, at the last hop before persistence too.
  url: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "Only http(s) posting links."),
  postedAt: z.string().optional(),
});

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
    for (const row of cacheRows ?? []) {
      const results = (row as { results?: unknown }).results;
      const list =
        results &&
        typeof results === "object" &&
        Array.isArray((results as { postings?: unknown }).postings)
          ? (results as { postings: unknown[] }).postings
          : [];
      for (const rawPosting of list) {
        const cached = postingSchema.safeParse(rawPosting);
        if (cached.success && !cachedById.has(cached.data.id)) {
          cachedById.set(cached.data.id, cached.data as JobPosting);
        }
      }
    }

    const postings: JobPosting[] = [];
    for (const requested of requestedPostings) {
      const cached = cachedById.get(requested.id);
      if (!cached) {
        return NextResponse.json(
          {
            error:
              "Those postings aren't part of your current search. Retake the bearing.",
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

    // Batches of 8, sequential — one Gemini call per batch (free-tier limits).
    for (let i = 0; i < postings.length; i += CLASSIFY_BATCH_SIZE) {
      const batch = postings.slice(i, i + CLASSIFY_BATCH_SIZE);

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
