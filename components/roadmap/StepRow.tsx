"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/schedule";

/**
 * One sitting's work, checkable. The whole row is the target — the box, the
 * title, the instruction and the minutes are all one 44px control, so a thumb
 * never has to find a 20px square.
 *
 * State only. Optimistic toggling and persistence belong to the parent: this
 * renders whatever `done` it is given and calls `onToggle` with the state the
 * user asked for.
 */

export interface StepRowProps {
  /** Imperative, one sitting: "Scaffold the repo". */
  title: string;
  /** What to literally do first, then why this step exists. Prose. */
  detail: string;
  /** Honest estimate for this one sitting. */
  minutes: number;
  done: boolean;
  /** Toggle request in flight for this step. */
  pending?: boolean;
  /** Called with the state the user is asking for. */
  onToggle: (done: boolean) => void;
  className?: string;
}

export function StepRow({
  title,
  detail,
  minutes,
  done,
  pending = false,
  onToggle,
  className,
}: StepRowProps) {
  const baseId = React.useId();
  const titleId = `${baseId}-title`;
  const detailId = `${baseId}-detail`;
  const minutesId = `${baseId}-minutes`;

  return (
    <li className={className}>
      {/* A drawn box rather than a native checkbox: the row is the control,
          and a real input styled to disappear would still hand the browser a
          20px hit target underneath. Semantics are kept by hand instead. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-labelledby={titleId}
        aria-describedby={`${detailId} ${minutesId}`}
        aria-busy={pending || undefined}
        onClick={() => onToggle(!done)}
        className="group flex min-h-11 w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150 hover:bg-veil/25"
      >
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150",
            done
              ? "border-gold bg-veil/40 text-gold-bright"
              : "group-hover:border-hairline-strong",
            pending && "opacity-60",
          )}
        >
          {done && <Check size={13} strokeWidth={1.5} />}
        </span>

        <span className="min-w-0 flex-1">
          {/* Baseline-aligned so the minutes sit on the title's first line
              however far the title wraps. */}
          <span className="flex items-baseline justify-between gap-3">
            <span
              id={titleId}
              className={cn(
                "text-[0.9375rem] font-medium leading-snug",
                done ? "text-moonlight" : "text-starlight",
              )}
            >
              {title}
            </span>
            {/* The card above reads its hours through the same formatter, so a
                row and its parent can never speak two duration dialects — and
                a step that arrived without a minute estimate prints the dash
                here and in the card's total alike. */}
            <span id={minutesId} className="mono-label shrink-0 text-moonlight">
              {formatDuration(minutes)}
            </span>
          </span>

          {/* The instruction is prose about what to do — sans, never mono. */}
          <span
            id={detailId}
            className="mt-1 block max-w-prose text-sm leading-relaxed text-moonlight"
          >
            {detail}
          </span>
        </span>
      </button>
    </li>
  );
}
