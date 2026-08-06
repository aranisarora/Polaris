import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolvePhase } from "@/lib/flow";
import { AppShell } from "@/components/shell/AppShell";
import { CheckInGate } from "@/components/checkin/CheckInGate";
import { getDueCheckin } from "@/components/checkin/due";

/**
 * Auth guard + chrome for every authenticated surface.
 * Unauthenticated visitors are sent back to the landing chart.
 */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const metaName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

  // Check-in (docs/CONTRACTS.md): due at most once per 48h, only when the
  // active roadmap has open tasks. Failures resolve to null — never blocks.
  // The resume phase drives the shell nav: destinations ahead of the resume
  // point (docs/CONTRACTS.md flow rule) render disabled, not as dead taps.
  const [checkin, phase] = await Promise.all([
    getDueCheckin(supabase, user.id),
    resolvePhase(supabase, user.id),
  ]);

  return (
    <AppShell
      phase={phase}
      user={{
        name: typeof metaName === "string" ? metaName : null,
        email: user.email ?? null,
      }}
    >
      {checkin && <CheckInGate checkin={checkin} />}
      {children}
    </AppShell>
  );
}
