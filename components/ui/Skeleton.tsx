import * as React from "react";
import { cn } from "@/lib/cn";

export interface SkeletonProps {
  /** Size it with width/height classes, e.g. "h-4 w-48". */
  className?: string;
}

/**
 * Loading placeholder: a veil block that stays visible on both the night
 * ground and depth panels, with a slow starlight shimmer. Under
 * prefers-reduced-motion the shimmer stops but the block itself still
 * reads — a skeleton is never blank. Size via className; mark the
 * surrounding region aria-busy while content loads.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden rounded-md bg-veil/60", className)}
    >
      <span className="absolute inset-y-0 left-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-starlight/10 to-transparent" />
    </div>
  );
}
