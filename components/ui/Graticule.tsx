import * as React from "react";
import { cn } from "@/lib/cn";

export interface GraticuleProps {
  /** Hairline grid every 48px at 7% starlight. */
  grid?: boolean;
  /** Degree ticks along all four edges — every 12px, every 5th tick longer. */
  ticks?: boolean;
  className?: string;
}

const GRID_COLOR = "color-mix(in srgb, var(--color-starlight) 7%, transparent)";
const TICK_COLOR =
  "color-mix(in srgb, var(--color-starlight) 22%, transparent)";

const H_TICK = `linear-gradient(to right, ${TICK_COLOR} 0 1px, transparent 1px)`;
const V_TICK = `linear-gradient(to bottom, ${TICK_COLOR} 0 1px, transparent 1px)`;

/**
 * Chart-instrument dressing: hairline graticule grid + edge degree ticks.
 * Pure CSS, decorative, fills its nearest positioned ancestor.
 */
export function Graticule({
  grid = true,
  ticks = true,
  className,
}: GraticuleProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {grid && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, ${GRID_COLOR} 0 1px, transparent 1px), linear-gradient(to bottom, ${GRID_COLOR} 0 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      )}
      {ticks && (
        <>
          {/* top */}
          <div
            className="absolute inset-x-0 top-0 h-2"
            style={{
              backgroundImage: `${H_TICK}, ${H_TICK}`,
              backgroundSize: "12px 4px, 60px 8px",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "left top",
            }}
          />
          {/* bottom */}
          <div
            className="absolute inset-x-0 bottom-0 h-2"
            style={{
              backgroundImage: `${H_TICK}, ${H_TICK}`,
              backgroundSize: "12px 4px, 60px 8px",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "left bottom",
            }}
          />
          {/* left */}
          <div
            className="absolute inset-y-0 left-0 w-2"
            style={{
              backgroundImage: `${V_TICK}, ${V_TICK}`,
              backgroundSize: "4px 12px, 8px 60px",
              backgroundRepeat: "repeat-y",
              backgroundPosition: "left top",
            }}
          />
          {/* right */}
          <div
            className="absolute inset-y-0 right-0 w-2"
            style={{
              backgroundImage: `${V_TICK}, ${V_TICK}`,
              backgroundSize: "4px 12px, 8px 60px",
              backgroundRepeat: "repeat-y",
              backgroundPosition: "right top",
            }}
          />
        </>
      )}
    </div>
  );
}
