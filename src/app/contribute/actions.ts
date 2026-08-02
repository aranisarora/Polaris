"use server";

import { redirect } from "next/navigation";
import { readAnonRecord } from "@/lib/session";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Submissions land in `record_submissions` rather than straight into the
 * curated corpus. `docs/product.md` §13.2's rule applies here too: this is the
 * data where being wrong is most damaging, so it is reviewed before it can
 * appear as proof to another student.
 */
export async function submitRecord(formData: FormData): Promise<void> {
  const supabase = await createClient();
  if (!supabase) redirect("/contribute?error=1");

  const user = await getUser();
  const record = await readAnonRecord();

  await supabase.from("record_submissions").insert({
    profile_id: user?.id ?? null,
    company_slug: String(formData.get("company") ?? "") || null,
    payload: {
      cgpa: String(formData.get("cgpa") ?? ""),
      backlogs: String(formData.get("backlogs") ?? ""),
      outcome: String(formData.get("outcome") ?? ""),
      endedAt: String(formData.get("endedAt") ?? ""),
      rounds: String(formData.get("rounds") ?? ""),
      // Matching keys, taken from their own record rather than asked twice.
      branch: record?.branch ?? null,
      collegeSlug: record?.collegeSlug ?? null,
      gradYear: record?.gradYear ?? null,
    },
  });

  redirect("/contribute/thanks");
}
