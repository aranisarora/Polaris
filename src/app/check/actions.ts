"use server";

import { redirect } from "next/navigation";
import { COLLEGE_BY_SLUG } from "@/lib/data/colleges";
import type { BranchCode, TargetSector } from "@/lib/data/types";
import { REGISTRY_VERSION } from "@/lib/data/companies";
import { ENGINE_VERSION, buildLedger } from "@/lib/engine/eligibility";
import { validateRecord, type StudentRecord } from "@/lib/engine/record";
import { newSlug, writeAnonRecord, writeRunSlug } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type CheckState = { errors?: Record<string, string> };

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

/**
 * The seven fields → the ledger.
 *
 * `docs/product.md` §10.1: no account, no upload, ~45 seconds. The record is
 * written to a cookie so the ledger renders immediately, and a run row is
 * persisted so the share link has something to point at. The persistence is
 * best-effort on purpose — if Supabase is down, the student still gets their
 * ledger, because the ledger is arithmetic and does not need a database.
 */
export async function submitCheck(
  _prev: CheckState,
  formData: FormData,
): Promise<CheckState> {
  const collegeSlugRaw = String(formData.get("college") ?? "");
  const college = COLLEGE_BY_SLUG.get(collegeSlugRaw);

  const record: StudentRecord = {
    collegeSlug: college?.slug,
    universityCode:
      college?.universityCode ??
      String(formData.get("university") ?? "OTHER") ??
      "OTHER",
    branch: String(formData.get("branch") ?? "") as BranchCode,
    gradYear: num(formData.get("gradYear")),
    cgpa: num(formData.get("cgpa")),
    activeBacklogs: num(formData.get("activeBacklogs")),
    tenthPct: num(formData.get("tenthPct")),
    twelfthPct: num(formData.get("twelfthPct")),
    target: String(formData.get("target") ?? "") as TargetSector,
  };

  const examStart = String(formData.get("examStart") ?? "").trim();
  const examEnd = String(formData.get("examEnd") ?? "").trim();
  if (examStart && examEnd) {
    record.manualExamWindow = { startsOn: examStart, endsOn: examEnd };
  }

  const issues = validateRecord(record);
  if (issues.length) {
    return {
      errors: Object.fromEntries(issues.map((i) => [i.field, i.message])),
    };
  }

  const ledger = buildLedger(record);
  const slug = newSlug();

  await writeAnonRecord(record);
  await writeRunSlug(slug);

  // Best-effort. The share link needs a row; the ledger does not.
  try {
    const supabase = await createClient();
    if (supabase) {
      await supabase.from("ledger_runs").insert({
        slug,
        college_slug: record.collegeSlug ?? null,
        university_code: record.universityCode,
        branch: record.branch,
        grad_year: record.gradYear,
        target_sector: record.target,
        cgpa: record.cgpa,
        active_backlogs: record.activeBacklogs,
        tenth_pct: record.tenthPct,
        twelfth_pct: record.twelfthPct,
        open_count: ledger.counts.open,
        reach_count: ledger.counts.reach,
        settled_count: ledger.counts.settled,
        total_count: ledger.counts.total,
        engine_version: ENGINE_VERSION,
        registry_version: REGISTRY_VERSION,
      });
    }
  } catch {
    // Never block the shock on persistence.
  }

  redirect("/ledger");
}
