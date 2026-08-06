"use client";

import * as React from "react";
import { Button, ChoiceCard, ChoiceCardGroup, Field, Input } from "@/components/ui";
import type { SectorOption } from "@/lib/types";
import { SECTOR_CHOICES } from "./options";

export interface StepSectorProps {
  sector: SectorOption | null;
  onSectorChange: (value: SectorOption) => void;
  sectorOther: string;
  onSectorOtherChange: (value: string) => void;
  error: string | null;
  busy: boolean;
  saving: boolean;
  onBack: () => void;
  onContinue: () => void;
}

/** Step 2 — sector. Seven named waters plus "Something else". */
export function StepSector({
  sector,
  onSectorChange,
  sectorOther,
  onSectorOtherChange,
  error,
  busy,
  saving,
  onBack,
  onContinue,
}: StepSectorProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <ChoiceCardGroup
        label="Which sector calls you?"
        value={sector}
        onChange={(value) => onSectorChange(value as SectorOption)}
        className="mt-6 sm:grid-cols-2"
      >
        {SECTOR_CHOICES.map((choice) => (
          <ChoiceCard
            key={choice.value}
            value={choice.value}
            title={choice.title}
          />
        ))}
      </ChoiceCardGroup>

      {sector === "other" && (
        <Field
          label="Your sector"
          htmlFor="sector-other"
          className="animate-fade-up mt-4"
        >
          <Input
            id="sector-other"
            value={sectorOther}
            onChange={(event) => onSectorOtherChange(event.target.value)}
            placeholder="Name it in a word or two"
            maxLength={120}
          />
        </Field>
      )}

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
          Continue
        </Button>
      </div>
    </form>
  );
}
