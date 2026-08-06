"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface FastTrackProps {
  company: string;
  role: string;
  onCompanyChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  error: string | null;
  /** Any action in flight anywhere in the wizard. */
  busy: boolean;
  /** This form's submit in flight. */
  saving: boolean;
  onSubmit: () => void;
}

/**
 * The "I already know my exact target" escape hatch. Collapsed by default
 * and sat below a hairline so it never competes with the cards above it —
 * the card path is the answer, this is the shortcut for people who arrive
 * already knowing the company and role they want.
 */
export function FastTrack({
  company,
  role,
  onCompanyChange,
  onRoleChange,
  error,
  busy,
  saving,
  onSubmit,
}: FastTrackProps) {
  const [open, setOpen] = React.useState(
    () => Boolean(company.trim() || role.trim()),
  );

  return (
    <div className="mt-12 border-t pt-5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="fast-track"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-2 text-sm font-medium text-moonlight transition-colors duration-150 hover:text-starlight"
      >
        <ChevronRight
          size={16}
          strokeWidth={1.5}
          aria-hidden
          className={cn(
            "shrink-0 transition-transform duration-150",
            open && "rotate-90",
          )}
        />
        I already know the exact job I want
      </button>

      {open && (
        <form
          id="fast-track"
          className="animate-fade-up mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <p className="text-sm text-moonlight">
            {
              "Name it and Polaris skips the rest — next, you'll tell us where you are today."
            }
          </p>
          <Field label="Company" htmlFor="fast-company">
            <Input
              id="fast-company"
              value={company}
              onChange={(event) => onCompanyChange(event.target.value)}
              placeholder="The exact company"
              autoComplete="organization"
              maxLength={160}
            />
          </Field>
          <Field label="Job title" htmlFor="fast-role">
            <Input
              id="fast-role"
              value={role}
              onChange={(event) => onRoleChange(event.target.value)}
              placeholder="The exact job title"
              autoComplete="organization-title"
              maxLength={160}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-ember">
              {error}
            </p>
          )}
          <div>
            <Button
              type="submit"
              variant="secondary"
              loading={saving}
              disabled={busy && !saving}
            >
              Set this as my goal
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
