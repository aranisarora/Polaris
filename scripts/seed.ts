/**
 * Seed the reference tables from the typed modules in `src/lib/data`.
 *
 * The modules stay the source of truth: `docs/platform.md` §1.5 puts a hard
 * <3s budget on the ledger path, and a database round trip on the most
 * valuable screen in the funnel is not worth the flexibility. What the tables
 * buy is correctability without a deploy, plus somewhere for the ingestion
 * jobs to write — which matters because §13.1's assets are meant to grow from
 * 23 companies to 60 and from 2 corpus records to several hundred.
 *
 * Run: npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ACTIONS } from "../src/lib/data/actions";
import { VTU_CALENDAR } from "../src/lib/data/calendar";
import { COLLEGES, UNIVERSITIES } from "../src/lib/data/colleges";
import { COMPANIES } from "../src/lib/data/companies";
import { INTERVIEW_RECORDS } from "../src/lib/data/corpus";

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // Environment may be provided directly in CI.
  }
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const check = (label: string, error: { message: string } | null) => {
    if (error) throw new Error(`${label}: ${error.message}`);
    console.log(`  ✓ ${label}`);
  };

  console.log("Seeding reference data…");

  check(
    `universities (${UNIVERSITIES.length})`,
    (
      await db.from("universities").upsert(
        UNIVERSITIES.map((u) => ({
          code: u.code,
          name: u.name,
          short_name: u.shortName,
          state: u.state,
          calendar_mapped: u.calendarMapped,
          sources: u.sources,
        })),
        { onConflict: "code" },
      )
    ).error,
  );

  check(
    `colleges (${COLLEGES.length})`,
    (
      await db.from("colleges").upsert(
        COLLEGES.map((c) => ({
          slug: c.slug,
          name: c.name,
          university_code: c.universityCode,
          city: c.city,
          area: c.area,
          tier: c.tier,
          autonomous: c.autonomous,
          sources: c.sources,
        })),
        { onConflict: "slug" },
      )
    ).error,
  );

  check(
    `companies (${COMPANIES.length})`,
    (
      await db.from("companies").upsert(
        COMPANIES.map((c) => ({
          slug: c.slug,
          name: c.name,
          programme: c.programme ?? null,
          tier: c.tier,
          sectors: c.sectors,
          package_min_lpa: c.packageMinLpa,
          package_max_lpa: c.packageMaxLpa,
          campus_types: c.campusTypes,
          typical_drive_month: c.typicalDriveMonth ?? null,
          process: c.process,
          notes: c.notes ?? null,
        })),
        { onConflict: "slug" },
      )
    ).error,
  );

  check(
    `company_criteria (${COMPANIES.length})`,
    (
      await db.from("company_criteria").upsert(
        COMPANIES.map((c) => ({
          company_slug: c.slug,
          batch_year: c.batchYear,
          tenth_pct: c.criteria.tenthPct ?? null,
          twelfth_pct: c.criteria.twelfthPct ?? null,
          ug_pct: c.criteria.ugPct ?? null,
          ug_cgpa: c.criteria.ugCgpa ?? null,
          max_active_backlogs: c.criteria.maxActiveBacklogs ?? null,
          backlogs_cleared_by_joining:
            c.criteria.backlogsClearedByJoining ?? null,
          max_gap_years: c.criteria.maxGapYears ?? null,
          branches: c.criteria.branches ?? null,
          confidence: c.confidence,
          contested_note: c.contestedNote ?? null,
          sources: c.sources,
          checked_on: c.sources[0]?.checkedOn ?? "2026-08-02",
        })),
        { onConflict: "company_slug,batch_year" },
      )
    ).error,
  );

  // The calendar is regenerated wholesale: derived windows shift as VTU
  // publishes real notices, and a stale projection is worse than none.
  await db.from("calendar_events").delete().eq("university_code", "VTU");
  check(
    `calendar_events (${VTU_CALENDAR.length})`,
    (
      await db.from("calendar_events").insert(
        VTU_CALENDAR.map((e) => ({
          university_code: e.universityCode,
          kind: e.kind,
          label: e.label,
          starts_on: e.startsOn,
          ends_on: e.endsOn,
          semesters: e.semesters ?? null,
          projected: e.projected ?? false,
          sources: e.sources,
        })),
      )
    ).error,
  );

  check(
    `interview_records (${INTERVIEW_RECORDS.length})`,
    (
      await db.from("interview_records").upsert(
        INTERVIEW_RECORDS.map((r) => ({
          id: r.id,
          company_slug: r.companySlug,
          role: r.role,
          year: r.year ?? null,
          campus_type: r.campusType,
          college_tier: r.collegeTier ?? null,
          university_code: r.universityCode ?? null,
          college_name: r.collegeName ?? null,
          branch: r.branch ?? null,
          cgpa_band: r.cgpaBand ?? null,
          backlog_note: r.backlogNote ?? null,
          outcome: r.outcome,
          rounds: r.rounds,
          takeaway: r.takeaway,
          has_profile: r.hasProfile,
          provenance: r.provenance,
          source: r.source,
        })),
        { onConflict: "id" },
      )
    ).error,
  );

  console.log(`\nAction catalogue: ${ACTIONS.length} items (kept in-module).`);
  console.log("Done.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
