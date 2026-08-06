"use client";

import * as React from "react";
import { Button, ChoiceCard, ChoiceCardGroup, Field, Input } from "@/components/ui";
import type { SectorOption } from "@/lib/types";
import { SECTOR_CHOICES } from "./options";
import { FastTrack } from "./FastTrack";

export interface StepSectorProps {
  sector: SectorOption | null;
  onSectorChange: (value: SectorOption) => void;
  sectorOther: string;
  onSectorOtherChange: (value: string) => void;
  error: string | null;
  busy: boolean;
  saving: boolean;
  onContinue: () => void;
  fastCompany: string;
  fastRole: string;
  onFastCompanyChange: (value: string) => void;
  onFastRoleChange: (value: string) => void;
  fastError: string | null;
  fastSaving: boolean;
  onFastSubmit: () => void;
}

/**
 * Step 1 — the field of work. Seven named sectors plus "Something else",
 * answered in one tap: the first thing asked after sign-up has to be
 * answerable in seconds on a phone, not typed into a blank box.
 */
export function StepSector({
  sector,
  onSectorChange,
  sectorOther,
  onSectorOtherChange,
  error,
  busy,
  saving,
  onContinue,
  fastCompany,
  fastRole,
  onFastCompanyChange,
  onFastRoleChange,
  fastError,
  fastSaving,
  onFastSubmit,
}: StepSectorProps) {
  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <p className="mt-2 text-sm text-moonlight">
          Pick the closest one — you can change course later.
        </p>

        <ChoiceCardGroup
          label="What kind of work do you dream of?"
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
            label="Your field of work"
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

        <div className="mt-8 flex justify-end">
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

      <FastTrack
        company={fastCompany}
        role={fastRole}
        onCompanyChange={onFastCompanyChange}
        onRoleChange={onFastRoleChange}
        error={fastError}
        busy={busy}
        saving={fastSaving}
        onSubmit={onFastSubmit}
      />
    </div>
  );
}
