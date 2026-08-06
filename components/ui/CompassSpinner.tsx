import * as React from "react";
import { cn } from "@/lib/cn";
import { CompassRose } from "./glyphs";

export interface CompassSpinnerProps {
  /** Rendered size in px. Cardinal letters appear at 40px and above. */
  size?: number;
  /** Screen-reader announcement. Pass "" to silence (e.g. inside a button that already announces busy). */
  label?: string;
  className?: string;
}

/**
 * Loading indicator: a slowly rotating compass rose. Under
 * prefers-reduced-motion the rotation stops and the rose quietly pulses
 * opacity instead (the one sanctioned exemption — see globals.css).
 */
export function CompassSpinner({
  size = 32,
  label = "Loading",
  className,
}: CompassSpinnerProps) {
  return (
    <span role="status" className={cn("inline-flex text-gold", className)}>
      <CompassRose
        size={size}
        labels={size >= 40}
        className="motion-pulse-exempt origin-center animate-rose-spin"
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
