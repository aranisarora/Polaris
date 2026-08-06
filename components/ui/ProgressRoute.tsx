import * as React from "react";
import { cn } from "@/lib/cn";
import { NorthStarGlyph } from "./glyphs";

export interface ProgressRouteProps {
  /** 0–100. Changes animate over 400ms. */
  percent: number;
  /** Number of waypoint dots including the start; the far end is always the north star. 0 = plain route. */
  waypoints?: number;
  /** Accessible name for the progressbar. */
  label?: string;
  className?: string;
}

/**
 * Horizontal route progress: gold line filled to the current position,
 * hairline ahead, waypoint dots along the way, the north star at the end.
 */
export function ProgressRoute({
  percent,
  waypoints = 0,
  label = "Progress",
  className,
}: ProgressRouteProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const complete = clamped >= 100;
  const dots =
    waypoints >= 2
      ? Array.from(
          { length: waypoints - 1 }, // last position belongs to the star
          (_, i) => (i / (waypoints - 1)) * 100,
        )
      : [];

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      className={cn("relative flex h-7 items-center pr-2", className)}
    >
      {/* route ahead — hairline */}
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-hairline-strong" />
      {/* route made good — gold */}
      <div
        className="ease-out-expo absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gold transition-[width] duration-400"
        style={{ width: `${clamped}%` }}
      />
      {dots.map((position) => (
        <span
          key={position}
          className={cn(
            "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors duration-400",
            position <= clamped
              ? "border-gold bg-gold"
              : "border-moonlight/40 bg-night",
          )}
          style={{ left: `${position}%` }}
        />
      ))}
      <span className="absolute right-0 top-1/2 -translate-y-1/2">
        <NorthStarGlyph
          size={16}
          color={complete ? "var(--color-gold-bright)" : "var(--color-gold)"}
          className={cn(
            "transition-opacity duration-400",
            complete ? "opacity-100" : "opacity-60",
          )}
        />
      </span>
    </div>
  );
}
