"use server";

import { redirect } from "next/navigation";
import { clearSession } from "@/lib/session";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * DPDP Act 2023 rights, implemented rather than described.
 *
 * `docs/platform.md` §4.1 puts these in Phase 0 because the law applies from
 * the first student record. The flow board's own copy sets the standard: "All
 * in Settings — no email, no retention offers."
 */

const TABLES = [
  "student_records",
  "cv_entities",
  "raw_inputs",
  "analyses",
  "roadmaps",
  "roadmap_tasks",
  "checkins",
  "connections",
  "ledger_runs",
] as const;

export async function exportEverything(): Promise<void> {
  const user = await getUser();
  const supabase = await createClient();
  if (!user || !supabase) redirect("/login");

  redirect("/settings/export");
}

export async function deleteEverything(): Promise<void> {
  const user = await getUser();
  const supabase = await createClient();

  if (user && supabase) {
    // Ordered so nothing is orphaned. `profiles` cascades from auth.users, but
    // the anonymous run rows are only linked, not owned, so they are detached
    // rather than deleted — the counts on a shared card are not personal data
    // once the link to the person is gone.
    await supabase
      .from("ledger_runs")
      .update({ profile_id: null })
      .eq("profile_id", user.id);

    for (const table of TABLES) {
      if (table === "ledger_runs") continue;
      await supabase.from(table).delete().eq("profile_id", user.id);
    }

    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
  }

  await clearSession();
  redirect("/?deleted=1");
}
