"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface StepDreamProps {
  /** id of the wizard's h1 — labels the textarea. */
  headingId: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  /** Any action in flight anywhere in the wizard. */
  busy: boolean;
  /** This step's Continue in flight. */
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
 * Step 1 — the dream, in their own words. The fast track sits below a
 * hairline as a quiet disclosure; it never competes with the textarea.
 */
export function StepDream({
  headingId,
  value,
  onChange,
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
}: StepDreamProps) {
  const [fastOpen, setFastOpen] = React.useState(
    () => Boolean(fastCompany.trim() || fastRole.trim()),
  );

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <Textarea
          id="dream-text"
          aria-labelledby={headingId}
          aria-describedby="dream-help"
          rows={6}
          maxLength={2000}
          placeholder="Describe your dream job — company, role, or just a feeling."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-6 min-h-44 text-base"
        />
        <p id="dream-help" className="mt-2 text-sm text-moonlight">
          {"Your own words steer everything Polaris charts for you."}
        </p>
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

      {/* fast track — clearly secondary, below the fold of attention */}
      <div className="mt-12 border-t pt-5">
        <button
          type="button"
          aria-expanded={fastOpen}
          aria-controls="fast-track"
          onClick={() => setFastOpen((open) => !open)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-2 text-sm font-medium text-moonlight transition-colors duration-150 hover:text-starlight"
        >
          <ChevronRight
            size={16}
            strokeWidth={1.5}
            aria-hidden
            className={cn(
              "shrink-0 transition-transform duration-150",
              fastOpen && "rotate-90",
            )}
          />
          I already know my exact target
        </button>

        {fastOpen && (
          <form
            id="fast-track"
            className="animate-fade-up mt-4 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onFastSubmit();
            }}
          >
            <p className="text-sm text-moonlight">
              {
                "Name it and Polaris skips the rest — next, you'll plot where you are today."
              }
            </p>
            <Field label="Company" htmlFor="fast-company">
              <Input
                id="fast-company"
                value={fastCompany}
                onChange={(event) => onFastCompanyChange(event.target.value)}
                placeholder="The exact company"
                autoComplete="organization"
                maxLength={160}
              />
            </Field>
            <Field label="Role" htmlFor="fast-role">
              <Input
                id="fast-role"
                value={fastRole}
                onChange={(event) => onFastRoleChange(event.target.value)}
                placeholder="The exact role"
                autoComplete="organization-title"
                maxLength={160}
              />
            </Field>
            {fastError && (
              <p role="alert" className="text-sm text-ember">
                {fastError}
              </p>
            )}
            <div>
              <Button
                type="submit"
                variant="secondary"
                loading={fastSaving}
                disabled={busy && !fastSaving}
              >
                Set this target
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
