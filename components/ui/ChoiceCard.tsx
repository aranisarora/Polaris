"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { StarGlyph } from "./glyphs";

interface ChoiceCardContextValue {
  value: string | null;
  onChange: (value: string) => void;
  anySelected: boolean;
}

const ChoiceCardContext = React.createContext<ChoiceCardContextValue | null>(
  null,
);

export interface ChoiceCardGroupProps {
  /** Accessible name for the radiogroup — the question being answered. */
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * Radio-semantics card group. Arrow keys move and select; each card is a
 * real radio to assistive tech.
 */
export function ChoiceCardGroup({
  label,
  value,
  onChange,
  className,
  children,
}: ChoiceCardGroupProps) {
  const ctx = React.useMemo(
    () => ({ value, onChange, anySelected: value != null }),
    [value, onChange],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
    const backward = event.key === "ArrowUp" || event.key === "ArrowLeft";
    if (!forward && !backward) return;
    const radios = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="radio"]:not([disabled])',
      ),
    );
    if (radios.length === 0) return;
    const current = radios.indexOf(document.activeElement as HTMLButtonElement);
    const start = current === -1 ? 0 : current;
    const next =
      radios[(start + (forward ? 1 : -1) + radios.length) % radios.length];
    event.preventDefault();
    next.focus();
    next.click();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn("grid gap-2.5", className)}
    >
      <ChoiceCardContext.Provider value={ctx}>
        {children}
      </ChoiceCardContext.Provider>
    </div>
  );
}

export interface ChoiceCardProps {
  value: string;
  title: string;
  description?: string;
  /** Mono instrument tag, e.g. "Suggested from your dream". */
  tag?: string;
  disabled?: boolean;
  className?: string;
}

/** One option. Selected = gold hairline + star glyph. */
export function ChoiceCard({
  value,
  title,
  description,
  tag,
  disabled,
  className,
}: ChoiceCardProps) {
  const ctx = React.useContext(ChoiceCardContext);
  if (!ctx) {
    throw new Error("ChoiceCard must be rendered inside <ChoiceCardGroup>");
  }
  const selected = ctx.value === value;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      tabIndex={selected || !ctx.anySelected ? 0 : -1}
      onClick={() => ctx.onChange(value)}
      className={cn(
        "relative flex min-h-11 w-full flex-col items-start gap-0.5 rounded-xl border bg-depth px-4 py-3.5 text-left transition-colors duration-150",
        selected
          ? "border-gold bg-veil/30"
          : "hover:border-hairline-strong hover:bg-veil/20",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {tag && <span className="mono-label text-gold">{tag}</span>}
      <span className="flex w-full items-center justify-between gap-3">
        <span className="font-medium text-starlight">{title}</span>
        <StarGlyph
          size={14}
          className={cn(
            "text-gold transition-opacity duration-150",
            selected ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
      {description && (
        <span className="text-sm text-moonlight">{description}</span>
      )}
    </button>
  );
}
