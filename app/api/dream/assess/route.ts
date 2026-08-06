import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { generateJSON, GeminiError } from "@/lib/gemini/json";
import {
  buildDreamAssessPrompt,
  buildProfileSummary,
  DREAM_SYSTEM,
  dreamResponseSchema,
  type DreamResponse,
} from "@/lib/gemini/prompts/classify";
import { isJobPosting } from "@/components/bearing/assessments";
import type {
  CVData,
  DreamAssessment,
  DreamInterpretation,
  JobPosting,
  QuestionnaireAnswers,
} from "@/lib/types";

/**
 * POST /api/dream/assess — docs/CONTRACTS.md.
 * Assesses the dream itself against the profile, honestly (usually stretch,
 * never hidden). When a cached live posting matches the dream role, its
 * verbatim requirements ground the assessment. The reasoning quotes one
 * verbatim phrase from the user's own dream text. Upserts the assessment
 * with is_dream: true under posting_id "dream".
 */

const STOPWORDS = new Set(["and", "the", "for", "with", "of", "in", "at", "a", "an", "to"]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Closest cached posting to the dream role by title-token overlap (≥50%). */
function findClosestPosting(postings: JobPosting[], roleText: string): JobPosting | null {
  const roleTokens = tokenize(roleText);
  if (roleTokens.length === 0) return null;
  let best: JobPosting | null = null;
  let bestScore = 0;
  for (const posting of postings) {
    const titleTokens = new Set(tokenize(posting.title));
    const matched = roleTokens.filter((t) => titleTokens.has(t)).length;
    const score = matched / roleTokens.length;
    if (score > bestScore) {
      bestScore = score;
      best = posting;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

function firstWords(text: string, count: number): string {
  return text.trim().split(/\s+/).slice(0, count).join(" ");
}

export async function POST() {
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

    const [onboardingRes, profileRes, cacheRes] = await Promise.all([
      supabase
        .from("onboarding")
        .select(
          "dream_text, dream_interpretation, fast_track, fast_track_role, fast_track_company",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("career_profiles")
        .select("cv_structured, questionnaire, completed_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("job_search_cache")
        .select("results")
        .eq("user_id", user.id)
        .order("fetched_at", { ascending: false })
        .limit(1),
    ]);

    const onboarding = onboardingRes.data;
    const interp = (onboarding?.dream_interpretation ?? null) as DreamInterpretation | null;
    const fastRole = ((onboarding?.fast_track_role as string | null) ?? "").trim();
    const fastCompany = ((onboarding?.fast_track_company as string | null) ?? "").trim();
    const dreamStatement =
      ((onboarding?.dream_text as string | null) ?? "").trim() ||
      [fastRole, fastCompany].filter(Boolean).join(" at ");

    if (!dreamStatement) {
      return NextResponse.json(
        { error: "Your dream isn't recorded yet — chart your course first." },
        { status: 400 },
      );
    }
    if (!profileRes.data?.completed_at) {
      return NextResponse.json(
        { error: "Your position isn't charted yet — complete your profile first." },
        { status: 400 },
      );
    }

    const cv = (profileRes.data.cv_structured ?? null) as CVData | null;
    const questionnaire = (profileRes.data.questionnaire ??
      null) as QuestionnaireAnswers | null;

    const cachedResults = (cacheRes.data?.[0]?.results ?? null) as {
      postings?: unknown[];
    } | null;
    const cachedPostings = Array.isArray(cachedResults?.postings)
      ? cachedResults.postings.filter(isJobPosting)
      : [];
    const roleText =
      interp?.roleTitle?.trim() || fastRole || interp?.searchKeywords?.trim() || "";
    const referencePosting = findClosestPosting(cachedPostings, roleText);

    const quotedPhrases = (interp?.quotedPhrases ?? []).filter(
      (p): p is string => typeof p === "string",
    );

    let result: DreamResponse;
    try {
      result = await generateJSON({
        prompt: buildDreamAssessPrompt({
          profileSummary: buildProfileSummary(cv, questionnaire),
          dreamStatement,
          quotedPhrases,
          roleTitle: roleText || null,
          referencePosting,
        }),
        schema: dreamResponseSchema,
        system: DREAM_SYSTEM,
        temperature: 0.4,
      });
    } catch (err) {
      console.error("[/api/dream/assess] gemini", err);
      const message =
        err instanceof GeminiError
          ? err.message
          : "Your dream couldn't be assessed. Try again.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    // The quoted phrase must be the user's words, verbatim — verify, and
    // recover the exact original casing from the dream statement.
    let quoted = result.quotedPhrase.trim().replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "");
    const at = quoted ? dreamStatement.toLowerCase().indexOf(quoted.toLowerCase()) : -1;
    if (at >= 0) {
      quoted = dreamStatement.slice(at, at + quoted.length);
    } else {
      quoted =
        quotedPhrases
          .find((p) => p.trim() && dreamStatement.toLowerCase().includes(p.toLowerCase()))
          ?.trim() || firstWords(dreamStatement, 7);
    }

    const dream: DreamAssessment = {
      tier: result.tier,
      reasoning: result.reasoning,
      have: result.have,
      missing: result.missing,
      matchScore: result.matchScore,
      dreamText: dreamStatement,
      quoted,
    };

    const { error: upsertError } = await supabase.from("job_assessments").upsert(
      {
        user_id: user.id,
        posting: {
          kind: "dream",
          dreamText: dreamStatement,
          quoted,
          roleTitle: roleText || null,
        },
        posting_id: "dream",
        tier: dream.tier,
        reasoning: dream.reasoning,
        have: dream.have,
        missing: dream.missing,
        match_score: dream.matchScore,
        is_dream: true,
      },
      { onConflict: "user_id,posting_id" },
    );
    if (upsertError) {
      // The assessment itself succeeded; a reload simply re-assesses.
      console.error("[/api/dream/assess] upsert", upsertError);
    }

    return NextResponse.json({ dream });
  } catch (err) {
    console.error("[/api/dream/assess]", err);
    return NextResponse.json(
      { error: "Your dream couldn't be assessed. Try again." },
      { status: 500 },
    );
  }
}
