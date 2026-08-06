"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ProgressRoute, useReducedMotion } from "@/components/ui";
import {
  saveOnboardingStep,
  type SaveOnboardingStepResult,
} from "@/app/(app)/onboarding/actions";
import type {
  CompanyTypeOption,
  DreamInterpretation,
  SectorOption,
} from "@/lib/types";
import { deriveCompanyType } from "./options";
import { StepDream } from "./StepDream";
import { StepSector } from "./StepSector";
import { StepCompany } from "./StepCompany";
import { CompletionMoment } from "./CompletionMoment";

export interface OnboardingInitial {
  step: 1 | 2 | 3;
  dreamText: string;
  dreamInterpretation: DreamInterpretation | null;
  sector: SectorOption | null;
  sectorOther: string;
  companyType: CompanyTypeOption | null;
  fastTrackCompany: string;
  fastTrackRole: string;
}

type Step = 1 | 2 | 3;
type Busy = "continue" | "fast" | null;

const HEADING_ID = "onboarding-step-title";

const STEP_TITLES: Record<Step, string> = {
  1: "Where do you dream of going?",
  2: "Which sector calls you?",
  3: "What kind of company suits you?",
};

/** The route never starts at zero — arriving here is already progress. */
const STEP_PERCENT: Record<Step, number> = { 1: 10, 2: 43, 3: 76 };

/** Route-extension beat (400ms) before the completion moment mounts. */
const CHART_EXTEND_MS = 520;

const MSG_UNREACHABLE =
  "That didn't save. Try again — your words are still here.";
const MSG_DREAM_EMPTY = "Name the dream first — a sentence is enough.";
const MSG_FAST_INCOMPLETE = "Name both the company and the role.";
const MSG_SECTOR_UNCHOSEN = "Choose the closest one — you can change course later.";
const MSG_SECTOR_OTHER_EMPTY = "Name your sector — a word or two is enough.";
const MSG_COMPANY_UNCHOSEN = "Choose one — 'Any of these' counts.";

/** Server actions signal auth redirects by throwing; let those through. */
function rethrowNextRedirect(error: unknown): void {
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }
}

/**
 * The 3-step wizard. One question per screen; every step persists via
 * saveOnboardingStep before advancing, so returning resumes exactly here.
 * Back navigation is local — nothing typed is ever lost.
 */
export function OnboardingWizard({ initial }: { initial: OnboardingInitial }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [step, setStep] = React.useState<Step>(initial.step);
  const [charted, setCharted] = React.useState(false);
  const [moment, setMoment] = React.useState(false);

  const [dreamText, setDreamText] = React.useState(initial.dreamText);
  const [interpretation, setInterpretation] =
    React.useState<DreamInterpretation | null>(initial.dreamInterpretation);
  const [sector, setSector] = React.useState<SectorOption | null>(
    initial.sector,
  );
  const [sectorOther, setSectorOther] = React.useState(initial.sectorOther);
  const [companyType, setCompanyType] =
    React.useState<CompanyTypeOption | null>(
      () =>
        initial.companyType ??
        (initial.step === 3
          ? deriveCompanyType(initial.dreamInterpretation)
          : null),
    );
  const [fastCompany, setFastCompany] = React.useState(
    initial.fastTrackCompany,
  );
  const [fastRole, setFastRole] = React.useState(initial.fastTrackRole);

  const [busy, setBusy] = React.useState<Busy>(null);
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [fastError, setFastError] = React.useState<string | null>(null);

  const suggested = React.useMemo(
    () => deriveCompanyType(interpretation),
    [interpretation],
  );

  // the wizard's destination — warm it up
  React.useEffect(() => {
    router.prefetch("/profile");
  }, [router]);

  // announce step changes: focus the question (skip the initial mount)
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const goTo = React.useCallback((next: Step) => {
    setStepError(null);
    setFastError(null);
    setStep(next);
  }, []);

  const goProfile = React.useCallback(() => {
    router.push("/profile");
  }, [router]);

  async function submitDream() {
    if (busy) return;
    const text = dreamText.trim();
    if (!text) {
      setStepError(MSG_DREAM_EMPTY);
      return;
    }
    setStepError(null);
    setBusy("continue");
    let result: SaveOnboardingStepResult;
    try {
      result = await saveOnboardingStep({ kind: "dream", dreamText: text });
    } catch (error) {
      rethrowNextRedirect(error);
      setStepError(MSG_UNREACHABLE);
      setBusy(null);
      return;
    }
    if (!result.ok) {
      setStepError(result.error);
      setBusy(null);
      return;
    }
    // mirror what the server stored (null when interpretation failed)
    setInterpretation(result.interpretation);
    setBusy(null);
    goTo(2);
  }

  async function submitFastTrack() {
    if (busy) return;
    const company = fastCompany.trim();
    const role = fastRole.trim();
    if (!company || !role) {
      setFastError(MSG_FAST_INCOMPLETE);
      return;
    }
    setFastError(null);
    setBusy("fast");
    let result: SaveOnboardingStepResult;
    try {
      result = await saveOnboardingStep({
        kind: "fastTrack",
        company,
        role,
        dreamText: dreamText.trim(),
      });
    } catch (error) {
      rethrowNextRedirect(error);
      setFastError(MSG_UNREACHABLE);
      setBusy(null);
      return;
    }
    if (!result.ok) {
      setFastError(result.error);
      setBusy(null);
      return;
    }
    // keep the pending state through navigation
    goProfile();
  }

  async function submitSector() {
    if (busy) return;
    if (!sector) {
      setStepError(MSG_SECTOR_UNCHOSEN);
      return;
    }
    const other = sectorOther.trim();
    if (sector === "other" && !other) {
      setStepError(MSG_SECTOR_OTHER_EMPTY);
      return;
    }
    setStepError(null);
    setBusy("continue");
    let result: SaveOnboardingStepResult;
    try {
      result = await saveOnboardingStep({
        kind: "sector",
        sector,
        sectorOther: sector === "other" ? other : undefined,
      });
    } catch (error) {
      rethrowNextRedirect(error);
      setStepError(MSG_UNREACHABLE);
      setBusy(null);
      return;
    }
    if (!result.ok) {
      setStepError(result.error);
      setBusy(null);
      return;
    }
    if (companyType == null && suggested) setCompanyType(suggested);
    setBusy(null);
    goTo(3);
  }

  async function submitCompany() {
    if (busy) return;
    if (!companyType) {
      setStepError(MSG_COMPANY_UNCHOSEN);
      return;
    }
    setStepError(null);
    setBusy("continue");
    let result: SaveOnboardingStepResult;
    try {
      result = await saveOnboardingStep({ kind: "company", companyType });
    } catch (error) {
      rethrowNextRedirect(error);
      setStepError(MSG_UNREACHABLE);
      setBusy(null);
      return;
    }
    if (!result.ok) {
      setStepError(result.error);
      setBusy(null);
      return;
    }
    // the route extends to the star, then the moment holds — or, under
    // reduced motion, the redirect is instant. busy stays set throughout.
    setCharted(true);
    if (reducedMotion) {
      goProfile();
      return;
    }
    window.setTimeout(() => setMoment(true), CHART_EXTEND_MS);
  }

  const percent = charted ? 100 : STEP_PERCENT[step];

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex items-center gap-4">
        <ProgressRoute
          percent={percent}
          waypoints={4}
          label="Course progress"
          className="flex-1"
        />
        <span className="mono-label shrink-0 text-moonlight">
          Step {step} of 3
        </span>
      </div>

      <div key={step} className="animate-fade-up mt-10">
        <h1
          ref={headingRef}
          tabIndex={-1}
          id={HEADING_ID}
          className="text-h1 text-starlight outline-none"
        >
          {STEP_TITLES[step]}
        </h1>

        {step === 1 && (
          <StepDream
            headingId={HEADING_ID}
            value={dreamText}
            onChange={(value) => {
              setDreamText(value);
              if (stepError) setStepError(null);
            }}
            error={stepError}
            busy={busy !== null}
            saving={busy === "continue"}
            onContinue={submitDream}
            fastCompany={fastCompany}
            fastRole={fastRole}
            onFastCompanyChange={(value) => {
              setFastCompany(value);
              if (fastError) setFastError(null);
            }}
            onFastRoleChange={(value) => {
              setFastRole(value);
              if (fastError) setFastError(null);
            }}
            fastError={fastError}
            fastSaving={busy === "fast"}
            onFastSubmit={submitFastTrack}
          />
        )}

        {step === 2 && (
          <StepSector
            sector={sector}
            onSectorChange={(value) => {
              setSector(value);
              if (stepError) setStepError(null);
            }}
            sectorOther={sectorOther}
            onSectorOtherChange={(value) => {
              setSectorOther(value);
              if (stepError) setStepError(null);
            }}
            error={stepError}
            busy={busy !== null}
            saving={busy === "continue"}
            onBack={() => goTo(1)}
            onContinue={submitSector}
          />
        )}

        {step === 3 && (
          <StepCompany
            value={companyType}
            suggested={suggested}
            onChange={(value) => {
              setCompanyType(value);
              if (stepError) setStepError(null);
            }}
            error={stepError}
            busy={busy !== null}
            saving={busy === "continue"}
            onBack={() => goTo(2)}
            onContinue={submitCompany}
          />
        )}
      </div>

      {moment && <CompletionMoment onDone={goProfile} />}
    </div>
  );
}
