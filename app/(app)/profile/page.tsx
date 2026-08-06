import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { guardPhase } from "@/lib/flow";
import { ProfileFlow } from "@/components/profile/ProfileFlow";
import type { CareerProfile, CVData, QuestionnaireAnswers } from "@/lib/types";

export const metadata: Metadata = {
  title: "Where are you now?",
};

/**
 * Phase 2 — the user's true position. First visit: CV upload (recommended)
 * or questionnaire. Revisit: summary of the saved profile with re-upload /
 * edit actions. All interaction lives in the client ProfileFlow; this page
 * guards the phase and hands over the stored profile.
 */
export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const redirectTo = await guardPhase(supabase, user.id, "profile");
  if (redirectTo) redirect(redirectTo);

  const { data: row } = await supabase
    .from("career_profiles")
    .select("cv_structured, questionnaire, source, completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile: CareerProfile = {
    cv: (row?.cv_structured ?? null) as CVData | null,
    questionnaire: (row?.questionnaire ?? null) as QuestionnaireAnswers | null,
    source: (row?.source ?? "cv") as CareerProfile["source"],
    completedAt: row?.completed_at ?? null,
  };

  const metaName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

  return (
    <ProfileFlow
      initialProfile={profile}
      userName={typeof metaName === "string" ? metaName : null}
    />
  );
}
