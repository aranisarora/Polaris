import * as React from "react";
import { cn } from "@/lib/cn";
import { StarGlyph } from "./glyphs";

export interface WordmarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { star: 11, text: "text-[0.8125rem]" },
  md: { star: 14, text: "text-base" },
  lg: { star: 20, text: "text-2xl" },
} as const;

/** The identity: gold four-point star + POLARIS in tracked Marcellus caps. */
export function Wordmark({ size = "md", className }: WordmarkProps) {
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <StarGlyph size={s.star} className="text-gold" />
      <span
        className={cn(
          "-mr-[0.22em] font-display tracking-[0.22em] text-starlight",
          s.text,
        )}
      >
        POLARIS
      </span>
    </span>
  );
}
