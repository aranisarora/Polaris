"use client";

import * as React from "react";
import { Graticule, NorthStarGlyph } from "@/components/ui";

export interface CompletionMomentProps {
  /** Fires once — after the hold, or immediately on tap. */
  onDone: () => void;
}

const HOLD_MS = 1600;

/**
 * The brief full-screen beat after step 3: "Course charted." Holds ~1.6s,
 * skippable by tap. Under reduced motion the wizard never mounts this —
 * it redirects instantly instead.
 */
export function CompletionMoment({ onDone }: CompletionMomentProps) {
  const fired = React.useRef(false);
  const finish = React.useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    onDone();
  }, [onDone]);

  React.useEffect(() => {
    const timer = window.setTimeout(finish, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [finish]);

  return (
    <button
      type="button"
      onClick={finish}
      aria-label="Continue — where are you today?"
      className="fixed inset-0 z-[60] flex cursor-default flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          "linear-gradient(to bottom, var(--color-abyss), var(--color-night) 55%)",
      }}
    >
      <Graticule ticks={false} className="opacity-50" />
      <span className="relative flex animate-fade-up flex-col items-center gap-5">
        <NorthStarGlyph size={56} pulse />
        <span className="font-display text-h1 text-balance text-starlight">
          Course charted.
        </span>
        <span className="text-moonlight">Now — where are you today?</span>
      </span>
    </button>
  );
}
