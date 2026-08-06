"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * `"mono"` (default) is the documented instrument line: a short reading set
 * in Fragment Mono. `"prose"` keeps the gold mono stage label and the
 * type-on, but sets the sentence in Hanken Grotesk at body size — for
 * narration, where DIRECTION.md's Type rule forbids mono as a costume for
 * prose. On prose the label stacks above the sentence below `sm`, where a
 * mono gutter would crush the measure to ~28 characters.
 */
export type StageReadoutTone = "mono" | "prose";

export interface StageReadoutProps {
  /** Instrument label, e.g. "READING". Mono, gold. */
  label: string;
  /** The narration line — types on character by character. */
  text: string;
  /** ms per character. */
  speed?: number;
  /** Typeface for the line body. Defaults to the mono instrument reading. */
  tone?: StageReadoutTone;
  /** Fires once when the line finishes typing (immediately under reduced motion). */
  onDone?: () => void;
  className?: string;
}

/**
 * Instrument line that types itself on, with a gold caret while typing.
 * Screen readers get the full line immediately; reduced motion renders it
 * instantly.
 */
export function StageReadout({
  label,
  text,
  speed = 16,
  tone = "mono",
  onDone,
  className,
}: StageReadoutProps) {
  const reduced = useReducedMotion();
  const [typed, setTyped] = React.useState(0);

  // reset the typewriter when the line changes (state-adjustment-in-render)
  const [prevText, setPrevText] = React.useState(text);
  if (prevText !== text) {
    setPrevText(text);
    setTyped(0);
  }

  const count = reduced ? text.length : Math.min(typed, text.length);
  const done = count >= text.length;

  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => {
    onDoneRef.current = onDone;
  });

  React.useEffect(() => {
    if (reduced || text.length === 0) {
      onDoneRef.current?.();
      return;
    }
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= text.length) {
        clearInterval(timer);
        onDoneRef.current?.();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, reduced]);

  const prose = tone === "prose";

  return (
    <div
      className={cn(
        prose
          ? "flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3"
          : "flex items-baseline gap-3 font-mono",
        className,
      )}
    >
      {/* In prose the label is a fixed gutter, so every sentence in the log
          hangs off one left edge instead of stepping in and out with the
          stage name's length. */}
      <span
        className={cn(
          "mono-label shrink-0 text-gold",
          prose && "sm:w-[5.75rem]",
        )}
      >
        {label}
      </span>
      <span className="sr-only">{text}</span>
      <span
        aria-hidden
        className={
          prose
            ? "font-sans text-base leading-relaxed text-moonlight"
            : "text-[0.8125rem] leading-relaxed tracking-[0.02em] text-moonlight"
        }
      >
        {text.slice(0, count)}
        {!done && (
          <span
            className={cn(
              "ml-0.5 inline-block h-[1em] translate-y-[0.15em] animate-caret bg-gold",
              prose ? "w-[2px]" : "w-[0.55ch]",
            )}
          />
        )}
      </span>
    </div>
  );
}
