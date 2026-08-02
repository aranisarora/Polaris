import { NextResponse, type NextRequest } from "next/server";
import { readAnonRecord, readRunSlug } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback. Exchanges the code for a session, then carries the anonymous
 * record onto the new account.
 *
 * That carry-over is the whole reason the gate can sit where it does: the
 * student filled in seven fields before they had an account
 * (`docs/product.md` §10.1), and losing them at signup would make the gate feel
 * like a toll rather than a save.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/intake";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=not_configured`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const record = await readAnonRecord();
    const slug = await readRunSlug();

    if (record) {
      await supabase
        .from("profiles")
        .update({
          college_slug: record.collegeSlug ?? null,
          university_code: record.universityCode,
          branch: record.branch,
          grad_year: record.gradYear,
          target_sector: record.target,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      await supabase.from("student_records").insert({
        profile_id: user.id,
        cgpa: record.cgpa,
        active_backlogs: record.activeBacklogs,
        tenth_pct: record.tenthPct,
        twelfth_pct: record.twelfthPct,
        gap_years: record.gapYears ?? null,
        manual_exam_start: record.manualExamWindow?.startsOn ?? null,
        manual_exam_end: record.manualExamWindow?.endsOn ?? null,
        source: "onboarding",
      });

      // §12.4 — store every raw input forever, including the exact onboarding
      // answers as typed. Storing only the parsed version means a bug in month
      // two destroys the data permanently.
      await supabase.from("raw_inputs").insert({
        profile_id: user.id,
        kind: "onboarding",
        payload: record,
      });
    }

    if (slug) {
      await supabase
        .from("ledger_runs")
        .update({ profile_id: user.id })
        .eq("slug", slug);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
