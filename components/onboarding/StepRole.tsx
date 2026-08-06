"use client";

import * as React from "react";
import { Button, ChoiceCard, ChoiceCardGroup, Field, Input } from "@/components/ui";
import type { SectorOption } from "@/lib/types";
import { ROLE_OTHER, rolesForSector } from "./options";

export interface StepRoleProps {
  /** Chosen on step 1 — decides which ladder is shown. */
  sector: SectorOption;
  /** The question being answered, for the group's accessible name. */
  question: string;
  role: string | null;
  onRoleChange: (value: string) => void;
  roleOther: string;
  onRoleOtherChange: (value: string) => void;
  error: string | null;
  busy: boolean;
  saving: boolean;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Step 2 — the dream job itself, as a ladder of real titles for the field
 * picked on step 1. This replaced a free-text box: naming the destination is
 * the hardest thing to ask of someone five seconds into the product, and a
 * concrete title also gives the job search far better keywords than prose.
 * "Something else" keeps the door open for a dream that isn't on the list.
 */
export function StepRole({
  sector,
  question,
  role,
  onRoleChange,
  roleOther,
  onRoleOtherChange,
  error,
  busy,
  saving,
  onBack,
  onContinue,
}: StepRoleProps) {
  const choices = rolesForSector(sector);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <p className="mt-2 text-sm text-moonlight">
        Aim high — this is the destination, not your next step.
      </p>

      <ChoiceCardGroup
        label={question}
        value={role}
        onChange={onRoleChange}
        className="mt-6 sm:grid-cols-2"
      >
        {choices.map((choice) => (
          <ChoiceCard
            key={choice.value}
            value={choice.value}
            title={choice.value === ROLE_OTHER ? "Something else" : choice.value}
            description={choice.description}
          />
        ))}
      </ChoiceCardGroup>

      {role === ROLE_OTHER && (
        <Field
          label="The job you're aiming for"
          htmlFor="role-other"
          className="animate-fade-up mt-4"
        >
          <Input
            id="role-other"
            value={roleOther}
            onChange={(event) => onRoleOtherChange(event.target.value)}
            placeholder="Name the job title"
            autoComplete="organization-title"
            maxLength={160}
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
