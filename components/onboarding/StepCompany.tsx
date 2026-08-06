"use client";

import * as React from "react";
import { Button, ChoiceCard, ChoiceCardGroup } from "@/components/ui";
import type { CompanyTypeOption } from "@/lib/types";
import { COMPANY_CHOICES } from "./options";

export interface StepCompanyProps {
  value: CompanyTypeOption | null;
  /** Smart default derived from the dream interpretation; tagged on its card. */
  suggested: CompanyTypeOption | null;
  onChange: (value: CompanyTypeOption) => void;
  error: string | null;
  busy: boolean;
  saving: boolean;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Step 3 — company type. The suggestion derived from their dream carries
 * a mono tag naming its why; the user changes it freely.
 */
export function StepCompany({
  value,
  suggested,
  onChange,
  error,
  busy,
  saving,
  onBack,
  onContinue,
}: StepCompanyProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <ChoiceCardGroup
        label="What kind of company suits you?"
        value={value}
        onChange={(next) => onChange(next as CompanyTypeOption)}
        className="mt-6 sm:grid-cols-2"
      >
        {COMPANY_CHOICES.map((choice) => (
          <ChoiceCard
            key={choice.value}
            value={choice.value}
            title={choice.title}
            description={choice.description}
            tag={
              suggested === choice.value
                ? "Suggested from your dream"
                : undefined
            }
          />
        ))}
      </ChoiceCardGroup>

      {error && (
        <p role="alert" className="mt-4 text-sm text-ember">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" disabled={busy} onClick={onBack}>
          Back
        </Button>
        <Button
          type="submit"
          size="lg"
          loading={saving}
          disabled={busy && !saving}
        >
          Set your course
        </Button>
      </div>
    </form>
  );
}
