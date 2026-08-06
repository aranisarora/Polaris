import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { searchJobs } from "@/lib/jobs/search";
import type {
  Country,
  CVData,
  DreamInterpretation,
  JobQuery,
  QuestionnaireAnswers,
} from "@/lib/types";

/**
 * POST /api/jobs/search — docs/CONTRACTS.md.
 * Builds a JobQuery from onboarding (fast-track role/company or the dream
 * interpretation's searchKeywords) plus location hints / profile location
 * (country defaults to gb), then delegates to lib/jobs searchJobs.
 * Zero configured providers is a normal state, never an error.
 */

const US_SIGNALS =
  /(united states|\busa\b|\bu\.s\.a?\.?\b|\bamerica\b|new york|\bnyc\b|san francisco|bay area|california|texas|austin|seattle|boston|chicago|los angeles|denver|atlanta|miami|washington,? d\.?c\.?)/i;
const UK_SIGNALS =
  /(united kingdom|\buk\b|\bu\.k\.?\b|england|scotland|wales|northern ireland|london|manchester|birmingham|edinburgh|glasgow|leeds|bristol|cambridge|oxford)/i;

function detectCountry(haystack: string): Country {
  return US_SIGNALS.test(haystack) && !UK_SIGNALS.test(haystack) ? "us" : "gb";
}

function firstWords(text: string, count: number): string {
  return text.trim().split(/\s+/).slice(0, count).join(" ");
}

const STOPWORDS =
  /^(a|an|the|and|or|of|in|at|for|to|with|on|as|is|are|be|my|our|your)$/i;

/** First `count` meaningful words — providers AND-match, so shorter wins. */
function meaningfulWords(text: string, count: number): string {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => !STOPWORDS.test(w))
    .slice(0, count)
    .join(" ");
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

    const [onboardingRes, profileRes] = await Promise.all([
      supabase
        .from("onboarding")
        .select(
          "dream_text, dream_interpretation, fast_track, fast_track_role, fast_track_company",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("career_profiles")
        .select("cv_structured, questionnaire")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const onboarding = onboardingRes.data;
    if (!onboarding) {
      return NextResponse.json(
        { error: "Chart your course first — your dream isn't recorded yet." },
        { status: 400 },
      );
    }

    const interp = (onboarding.dream_interpretation ?? null) as DreamInterpretation | null;

    // Keywords: fast-track role/company, else the interpreted role title
    // (short — providers AND-match, so "Game Designer" beats a long string),
    // else trimmed searchKeywords, else the dream's own opening words.
    let keywords = "";
    if (onboarding.fast_track) {
      keywords =
        ((onboarding.fast_track_role as string | null) ?? "").trim() ||
        ((onboarding.fast_track_company as string | null) ?? "").trim();
    }
    if (!keywords) keywords = interp?.roleTitle?.trim() ?? "";
    if (!keywords) keywords = meaningfulWords(interp?.searchKeywords ?? "", 4);
    if (!keywords) keywords = firstWords((onboarding.dream_text as string | null) ?? "", 8);
    keywords = keywords.replace(/\s+/g, " ").slice(0, 120).trim();

    if (!keywords) {
      return NextResponse.json(
        {
          error:
            "Your dream doesn't hold enough detail to search yet. Add a role or a few more words to it.",
        },
        { status: 400 },
      );
    }

    const cv = (profileRes.data?.cv_structured ?? null) as CVData | null;
    const questionnaire = (profileRes.data?.questionnaire ??
      null) as QuestionnaireAnswers | null;
    const profileLocation =
      cv?.basics?.location?.trim() || questionnaire?.location?.trim() || "";

    const hints = (interp?.locationHints ?? []).filter(
      (h): h is string => typeof h === "string",
    );
    const hint =
      hints
        .find((h) => h.trim() && !/remote|anywhere|hybrid|worldwide/i.test(h))
        ?.trim() ?? "";
    const location = hint || profileLocation || undefined;
    const country = detectCountry(`${hints.join(" ")} ${profileLocation}`);

    const query: JobQuery = {
      keywords,
      country,
      limit: 24,
      ...(location ? { location } : {}),
    };

    const result = await searchJobs(supabase, user.id, query);

    // A fresh (non-cached) search that got a real answer defines a new
    // bearing: clear old non-dream assessments here, server-side, so stale
    // rows can never outlive the search they belonged to — even when the
    // client's reset-carrying classify batch later fails.
    if (!result.cached && result.providers.some((p) => p.ok)) {
      await supabase
        .from("job_assessments")
        .delete()
        .eq("user_id", user.id)
        .eq("is_dream", false);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/jobs/search]", err);
    return NextResponse.json(
      { error: "The bearing couldn't be taken. Try again." },
      { status: 500 },
    );
  }
}
