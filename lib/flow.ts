import type { SupabaseClient } from "@supabase/supabase-js";
import { FLOW_ROUTE, type FlowPhase } from "@/lib/types";

/**
 * Phase order for "is this surface ahead of the resume point" checks.
 * `cv` sits alongside `roadmap` for reachability (it is never forced,
 * but becomes visitable as soon as the roadmap phase is reached — the
 * CV page renders its own designed empty state until a roadmap exists).
 */
export const PHASE_ORDER: readonly FlowPhase[] = [
  "onboarding",
  "profile",
  "bearing",
  "roadmap",
  "cv",
];

export function phaseIndex(phase: FlowPhase): number {
  return PHASE_ORDER.indexOf(phase);
}

/**
 * Where the user must resume, per docs/CONTRACTS.md:
 * 1. onboarding row missing or `completed_at` null      → "onboarding"
 * 2. career_profiles `completed_at` null (or missing)   → "profile"
 * 3. no active locked_targets row                       → "bearing"
 * 4. no active roadmaps row                             → "roadmap"
 * 5. else                                               → "roadmap"
 *    (cv is never forced — default roadmap)
 *
 * Any query error degrades to the earlier phase (safe: the user re-treads
 * a step rather than being thrown forward past missing data).
 */
export async function resolvePhase(
  supabase: SupabaseClient,
  userId: string,
): Promise<FlowPhase> {
  const [onboarding, profile, target, roadmap] = await Promise.all([
    supabase
      .from("onboarding")
      .select("completed_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("career_profiles")
      .select("completed_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("locked_targets")
      .select("id")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("roadmaps")
      .select("id")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle(),
  ]);

  if (!onboarding.data?.completed_at) return "onboarding";
  if (!profile.data?.completed_at) return "profile";
  if (!target.data) return "bearing";
  if (!roadmap.data) return "roadmap";
  return "roadmap";
}

/** The route the user should land on right now (e.g. after OAuth). */
export async function resolveRoute(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const phase = await resolvePhase(supabase, userId);
  return FLOW_ROUTE[phase];
}

/**
 * Page-level guard for phase surfaces. Returns a redirect path when the
 * requested surface is AHEAD of the user's resume point, or null when the
 * surface may render. Earlier phases always stay reachable (users may
 * revisit onboarding answers or their profile).
 *
 * Usage in a page:
 * ```ts
 * const redirectTo = await guardPhase(supabase, user.id, "bearing");
 * if (redirectTo) redirect(redirectTo);
 * ```
 */
export async function guardPhase(
  supabase: SupabaseClient,
  userId: string,
  requested: FlowPhase,
): Promise<string | null> {
  const resume = await resolvePhase(supabase, userId);
  // cv is never a forced resume point; treat it as the roadmap slot so it
  // becomes reachable the moment the roadmap phase is.
  const effective: FlowPhase = requested === "cv" ? "roadmap" : requested;
  if (phaseIndex(effective) > phaseIndex(resume)) {
    return FLOW_ROUTE[resume];
  }
  return null;
}
