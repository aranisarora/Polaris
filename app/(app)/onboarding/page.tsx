import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui";
import {
  OnboardingWizard,
  type OnboardingInitial,
} from "@/components/onboarding/OnboardingWizard";
import { ReloadButton } from "@/components/onboarding/ReloadButton";
import {
  COMPANY_TYPE_VALUES,
  SECTOR_VALUES,
} from "@/components/onboarding/options";
import type {
  CompanyTypeOption,
  DreamInterpretation,
  SectorOption,
} from "@/lib/types";

export const metadata: Metadata = { title: "Chart your course" };

interface OnboardingRow {
  dream_text: string | null;
  dream_interpretation: unknown;
  sector: string | null;
  sector_other: string | null;
  company_type: string | null;
  fast_track_company: string | null;
  fast_track_role: string | null;
  current_step: number | null;
  completed_at: string | null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** Guard the stored jsonb back into the DreamInterpretation shape. */
function asInterpretation(value: unknown): DreamInterpretation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Partial<Record<keyof DreamInterpretation, unknown>>;
  if (typeof v.searchKeywords !== "string") return null;
  return {
    roleTitle: typeof v.roleTitle === "string" ? v.roleTitle : undefined,
    seniority: typeof v.seniority === "string" ? v.seniority : undefined,
    sector: typeof v.sector === "string" ? v.sector : undefined,
    companyHints: stringArray(v.companyHints),
    locationHints: stringArray(v.locationHints),
    motivations: stringArray(v.motivations),
    quotedPhrases: stringArray(v.quotedPhrases),
    searchKeywords: v.searchKeywords,
  };
}

function asSector(value: string | null | undefined): SectorOption | null {
  return value && (SECTOR_VALUES as readonly string[]).includes(value)
    ? (value as SectorOption)
    : null;
}

function asCompanyType(
  value: string | null | undefined,
): CompanyTypeOption | null {
  return value && (COMPANY_TYPE_VALUES as readonly string[]).includes(value)
    ? (value as CompanyTypeOption)
    : null;
}

/**
 * Resume at the saved step; completed users revisiting their answers walk
 * the wizard again from the top with everything prefilled.
 */
function resumeStep(row: OnboardingRow | null): 1 | 2 | 3 {
  if (!row || row.completed_at) return 1;
  const step = row.current_step ?? 1;
  return step <= 1 ? 1 : step === 2 ? 2 : 3;
}

export default async function OnboardingPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase
    .from("onboarding")
    .select(
      "dream_text, dream_interpretation, sector, sector_other, company_type, fast_track_company, fast_track_role, current_step, completed_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="mx-auto w-full max-w-xl py-10">
        <ErrorState
          title="Your chart couldn't be opened"
          detail="Your saved answers are safe — the connection failed while reading them."
          action={<ReloadButton />}
        />
      </div>
    );
  }

  const row = (data ?? null) as OnboardingRow | null;

  const initial: OnboardingInitial = {
    step: resumeStep(row),
    dreamText: row?.dream_text ?? "",
    dreamInterpretation: asInterpretation(row?.dream_interpretation),
    sector: asSector(row?.sector),
    sectorOther: row?.sector_other ?? "",
    companyType: asCompanyType(row?.company_type),
    fastTrackCompany: row?.fast_track_company ?? "",
    fastTrackRole: row?.fast_track_role ?? "",
  };

  return <OnboardingWizard initial={initial} />;
}
