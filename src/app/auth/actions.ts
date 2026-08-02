"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

/**
 * `docs/platform.md` §6 Q2 asks Google only, or Google + LinkedIn. Both are
 * offered, and `docs/product.md` §10.5 sets the hard constraint that comes with
 * the second: **LinkedIn is an auth method and never a data source.** The
 * scopes that would return positions and education sit behind LinkedIn's
 * Partner Program, and Member Data Portability is EEA-only. Nothing in this
 * flow may imply otherwise.
 */
export async function signInWith(
  provider: "google" | "linkedin_oidc",
  next: string,
): Promise<AuthState> {
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Sign-in is not configured on this deployment yet." };
  }

  const host = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${host}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data?.url) {
    return {
      error:
        error?.message ??
        "That provider is not enabled for this project yet.",
    };
  }

  redirect(data.url);
}

export async function signInGoogle(formData: FormData): Promise<void> {
  const next = String(formData.get("next") ?? "/intake");
  await signInWith("google", next);
}

export async function signInLinkedIn(formData: FormData): Promise<void> {
  const next = String(formData.get("next") ?? "/intake");
  await signInWith("linkedin_oidc", next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  await clearSession();
  redirect("/");
}
