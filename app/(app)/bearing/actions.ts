"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { DreamInterpretation, JobPosting } from "@/lib/types";

/**
 * lockTarget — docs/CONTRACTS.md: `{ assessmentId }` or `{ dream: true }` →
 * deactivate the previous target, insert a new locked_targets row
 * (`dream_beyond` = the dream title when the target is a stepping-stone).
 * Returns the locked summary so the client can stage the confirmation
 * moment; it never redirects — "Draw my route" does.
 */

const lockInputSchema = z.union([
  z.object({ assessmentId: z.string().min(1) }),
  z.object({ dream: z.literal(true) }),
]);

export interface LockedTargetResult {
  title: string;
  company: string;
  isDream: boolean;
  dreamBeyond: string | null;
  postingId: string | null;
}

export interface LockResult {
  ok: boolean;
  error?: string;
  target?: LockedTargetResult;
}

function firstWords(text: string, count: number): string {
  return text.trim().split(/\s+/).slice(0, count).join(" ");
}

export async function lockTarget(input: unknown): Promise<LockResult> {
  const parsed = lockInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That destination couldn't be read. Try again." };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You've been signed out. Sign in and try again." };
  }

  const { data: onboarding } = await supabase
    .from("onboarding")
    .select("dream_text, dream_interpretation, fast_track_role, fast_track_company")
    .eq("user_id", user.id)
    .maybeSingle();

  const interp = (onboarding?.dream_interpretation ?? null) as DreamInterpretation | null;
  const dreamTitle =
    interp?.roleTitle?.trim() ||
    ((onboarding?.fast_track_role as string | null) ?? "").trim() ||
    firstWords(((onboarding?.dream_text as string | null) ?? ""), 8) ||
    null;

  let row: {
    assessment_id: string | null;
    title: string;
    company: string;
    location: string;
    posting: JobPosting | null;
    is_dream: boolean;
    dream_beyond: string | null;
  };

  if ("dream" in parsed.data) {
    const { data: dreamRow } = await supabase
      .from("job_assessments")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_dream", true)
      .maybeSingle();

    row = {
      assessment_id: (dreamRow?.id as string | undefined) ?? null,
      title: dreamTitle ?? "Your dream",
      company:
        ((onboarding?.fast_track_company as string | null) ?? "").trim() ||
        interp?.companyHints?.[0]?.trim() ||
        "",
      location: interp?.locationHints?.[0]?.trim() ?? "",
      posting: null,
      is_dream: true,
      dream_beyond: null,
    };
  } else {
    const { data: assessment } = await supabase
      .from("job_assessments")
      .select("id, posting, is_dream")
      .eq("user_id", user.id)
      .eq("id", parsed.data.assessmentId)
      .maybeSingle();

    const posting = (assessment?.posting ?? null) as JobPosting | null;
    if (!assessment || assessment.is_dream || !posting?.title) {
      return {
        ok: false,
        error:
          "That posting isn't in your bearing anymore. Retake the bearing and lock it again.",
      };
    }

    row = {
      assessment_id: assessment.id as string,
      title: posting.title,
      company: posting.company ?? "",
      location: posting.location ?? "",
      posting,
      is_dream: false,
      dream_beyond: dreamTitle,
    };
  }

  // One active target per user: deactivate, then insert. The pair isn't
  // atomic, so two rapid locks can race and trip the one-active unique
  // index — on that violation, deactivate again and retry once.
  const deactivatePrevious = () =>
    supabase
      .from("locked_targets")
      .update({ active: false })
      .eq("user_id", user.id)
      .eq("active", true);

  const insertTarget = () =>
    supabase.from("locked_targets").insert({
      user_id: user.id,
      assessment_id: row.assessment_id,
      title: row.title,
      company: row.company,
      location: row.location,
      posting: row.posting,
      is_dream: row.is_dream,
      dream_beyond: row.dream_beyond,
      active: true,
    });

  const { error: deactivateError } = await deactivatePrevious();
  if (deactivateError) {
    return { ok: false, error: "The destination couldn't be locked. Try again." };
  }

  let { error: insertError } = await insertTarget();
  if (insertError?.code === "23505") {
    const { error: retryDeactivateError } = await deactivatePrevious();
    if (!retryDeactivateError) {
      ({ error: insertError } = await insertTarget());
    }
  }
  if (insertError) {
    return { ok: false, error: "The destination couldn't be locked. Try again." };
  }

  revalidatePath("/bearing");
  revalidatePath("/roadmap");

  return {
    ok: true,
    target: {
      title: row.title,
      company: row.company,
      isDream: row.is_dream,
      dreamBeyond: row.dream_beyond,
      postingId: row.posting?.id ?? null,
    },
  };
}
