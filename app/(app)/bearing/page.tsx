import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { guardPhase } from "@/lib/flow";
import { BearingClient, type LockedSummary } from "@/components/bearing/BearingClient";
import {
  rowToClassifiedJob,
  rowToDreamAssessment,
  type AssessmentRow,
} from "@/components/bearing/assessments";
import type { ClassifiedJob, DreamInterpretation, JobPosting } from "@/lib/types";

export const metadata: Metadata = { title: "Your bearing" };

/**
 * Phase 3 — the reality check. Server shell: loads stored assessments (an
 * empty set makes the client run the "Taking your bearing" sequence), the
 * dream statement for the pinned card, and the active locked target.
 */
export default async function BearingPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const away = await guardPhase(supabase, user.id, "bearing");
  if (away) redirect(away);

  const [onboardingRes, assessmentsRes, targetRes] = await Promise.all([
    supabase
      .from("onboarding")
      .select("dream_text, dream_interpretation, fast_track_role, fast_track_company")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("job_assessments")
      .select(
        "id, posting, posting_id, tier, reasoning, have, missing, match_score, is_dream, recommended",
      )
      .eq("user_id", user.id)
      .order("match_score", { ascending: false }),
    supabase
      .from("locked_targets")
      .select("title, company, is_dream, posting")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle(),
  ]);

  const onboarding = onboardingRes.data;
  const interp = (onboarding?.dream_interpretation ?? null) as DreamInterpretation | null;
  const fastRole = ((onboarding?.fast_track_role as string | null) ?? "").trim();
  const fastCompany = ((onboarding?.fast_track_company as string | null) ?? "").trim();
  const dreamStatement =
    ((onboarding?.dream_text as string | null) ?? "").trim() ||
    [fastRole, fastCompany].filter(Boolean).join(" at ");
  const dreamTitle = interp?.roleTitle?.trim() || fastRole || null;

  const rows = (assessmentsRes.data ?? []) as unknown as AssessmentRow[];
  const initialJobs = rows
    .map(rowToClassifiedJob)
    .filter((j): j is ClassifiedJob => j !== null);
  const dreamRow = rows.find((r) => r.is_dream) ?? null;
  const initialDream = dreamRow ? rowToDreamAssessment(dreamRow, dreamStatement) : null;

  const target = targetRes.data;
  const initialLocked: LockedSummary | null = target
    ? {
        title: (target.title as string) ?? "",
        company: (target.company as string) ?? "",
        isDream: Boolean(target.is_dream),
        postingId: ((target.posting ?? null) as JobPosting | null)?.id ?? null,
      }
    : null;

  return (
    <BearingClient
      initialJobs={initialJobs}
      initialDream={initialDream}
      dreamStatement={dreamStatement}
      dreamTitle={dreamTitle}
      initialLocked={initialLocked}
    />
  );
}
