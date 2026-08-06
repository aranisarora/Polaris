import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface RequirementChipsProps {
  /** Requirements from the real posting the user already meets. */
  have: string[];
  /** Requirements from the real posting the user is missing. */
  missing: string[];
  className?: string;
}

/**
 * Have / missing requirement chips — aurora for held, ember for missing.
 * Real posting language, never invented categories.
 */
export function RequirementChips({ have, missing, className }: RequirementChipsProps) {
  if (have.length === 0 && missing.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {have.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mono-label mr-1 text-aurora">You have</span>
          {have.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1 rounded-full border border-aurora/35 px-2.5 py-1 text-xs text-aurora"
            >
              <Check size={11} strokeWidth={2} aria-hidden />
              {item}
            </span>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mono-label mr-1 text-ember">Missing</span>
          {missing.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1 rounded-full border border-ember/35 px-2.5 py-1 text-xs text-ember"
            >
              <X size={11} strokeWidth={2} aria-hidden />
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
