"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "./use-reduced-motion";

export interface StageReadoutProps {
  /** Instrument label, e.g. "READING". Mono, gold. */
  label: string;
  /** The narration line — types on character by character. */
  text: string;
  /** ms per character. */
  speed?: number;
  /** Fires once when the line finishes typing (immediately under reduced motion). */
  onDone?: () => void;
  className?: string;
}

/**
 * Mono instrument line that types itself on, with a gold caret while
 * typing. Screen readers get the full line immediately; reduced motion
 * renders it instantly.
 */
export function StageReadout({
  label,
  text,
  speed = 16,
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

  return (
    <div className={cn("flex items-baseline gap-3 font-mono", className)}>
      <span className="mono-label shrink-0 text-gold">{label}</span>
      <span className="sr-only">{text}</span>
      <span
        aria-hidden
        className="text-[0.8125rem] leading-relaxed tracking-[0.02em] text-moonlight"
      >
        {text.slice(0, count)}
        {!done && (
          <span className="ml-0.5 inline-block h-[1em] w-[0.55ch] translate-y-[0.15em] animate-caret bg-gold" />
        )}
      </span>
    </div>
  );
}
