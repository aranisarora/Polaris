import * as React from "react";
import { TIER_LABEL, type Tier } from "@/lib/types";
import { cn } from "@/lib/cn";
import { StarGlyph } from "./glyphs";

export const TIER_COLOR: Record<Tier, string> = {
  ready: "var(--color-aurora)",
  attainable: "var(--color-gold)",
  stretch: "var(--color-ember)",
};

export interface TierStarProps {
  tier: Tier;
  /** Hide the mono label (glyph keeps an aria-label). */
  showLabel?: boolean;
  /** Glyph size in px. */
  size?: number;
  className?: string;
}

/**
 * Tier marker: drawn four-point star in the tier color + mono label from
 * TIER_LABEL. Never an emoji.
 */
export function TierStar({
  tier,
  showLabel = true,
  size = 12,
  className,
}: TierStarProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <StarGlyph
        size={size}
        color={TIER_COLOR[tier]}
        label={showLabel ? undefined : TIER_LABEL[tier]}
      />
      {showLabel && (
        <span className="mono-label" style={{ color: TIER_COLOR[tier] }}>
          {TIER_LABEL[tier]}
        </span>
      )}
    </span>
  );
}
