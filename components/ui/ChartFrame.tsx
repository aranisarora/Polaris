import * as React from "react";
import { cn } from "@/lib/cn";
import { Graticule } from "./Graticule";

export interface ChartFrameProps {
  children: React.ReactNode;
  /** Mono corner coordinates, e.g. topLeft="BEARING 042°". */
  topLeft?: string;
  topRight?: string;
  bottomLeft?: string;
  bottomRight?: string;
  /** Also draw the interior graticule grid (edge ticks always draw). */
  grid?: boolean;
  className?: string;
  /** Content padding — defaults to p-6. */
  contentClassName?: string;
}

/**
 * The chart instrument: a panel whose border carries degree ticks and whose
 * corners hold mono coordinates. Frames star charts and chart-like moments.
 */
export function ChartFrame({
  children,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  grid = false,
  className,
  contentClassName,
}: ChartFrameProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-hairline-strong bg-night/60 shadow-panel",
        className,
      )}
    >
      <Graticule grid={grid} ticks />
      {topLeft && (
        <span className="mono-label absolute left-4 top-2.5 text-moonlight/80">
          {topLeft}
        </span>
      )}
      {topRight && (
        <span className="mono-label absolute right-4 top-2.5 text-moonlight/80">
          {topRight}
        </span>
      )}
      {bottomLeft && (
        <span className="mono-label absolute bottom-2.5 left-4 text-moonlight/80">
          {bottomLeft}
        </span>
      )}
      {bottomRight && (
        <span className="mono-label absolute bottom-2.5 right-4 text-moonlight/80">
          {bottomRight}
        </span>
      )}
      <div className={cn("relative p-6", contentClassName)}>{children}</div>
    </div>
  );
}
