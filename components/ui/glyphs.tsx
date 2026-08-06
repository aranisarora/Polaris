import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Polaris identity glyphs — authored SVG, code-drawn, no raster.
 * All strokes use `vectorEffect="non-scaling-stroke"` so weights stay at
 * their intended pixel size (1.5px equivalents) at any rendered size.
 * Glyphs are decorative by default (aria-hidden); pass `label` to make one
 * meaningful to assistive tech.
 */

interface BaseGlyphProps {
  /** Rendered square size in px. */
  size?: number;
  /** Any CSS color; defaults to `currentColor`. */
  color?: string;
  className?: string;
  /** Accessible name. When set, the glyph is announced; otherwise hidden. */
  label?: string;
}

function a11y(label?: string) {
  return label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);
}

/** Four-point star — rotated square with concave curves. The core mark. */
const STAR_PATH =
  "M12 2C12.55 8.4 15.6 11.45 22 12C15.6 12.55 12.55 15.6 12 22C11.45 15.6 8.4 12.55 2 12C8.4 11.45 11.45 8.4 12 2Z";

export interface StarGlyphProps extends BaseGlyphProps {
  /** Filled (default) or 1.5px hairline outline. */
  filled?: boolean;
}

export function StarGlyph({
  size = 16,
  color = "currentColor",
  filled = true,
  className,
  label,
}: StarGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...a11y(label)}
    >
      <path
        d={STAR_PATH}
        fill={filled ? color : "none"}
        stroke={filled ? "none" : color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type WaypointState = "pending" | "current" | "done";

export interface WaypointGlyphProps extends BaseGlyphProps {
  /**
   * pending — hairline gold outline · current — filled gold with a 25% halo
   * ring (a drawn marker element, not a shadow) · done — filled gold-bright.
   */
  state?: WaypointState;
}

export function WaypointGlyph({
  size = 14,
  color,
  state = "pending",
  className,
  label,
}: WaypointGlyphProps) {
  const fillColor =
    color ??
    (state === "done" ? "var(--color-gold-bright)" : "var(--color-gold)");
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...a11y(label)}
    >
      {state === "current" && (
        <circle
          cx="12"
          cy="12"
          r="10.5"
          fill="none"
          stroke={fillColor}
          strokeOpacity="0.25"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={STAR_PATH}
        transform="translate(3.6 3.6) scale(0.7)"
        fill={state === "pending" ? "none" : fillColor}
        stroke={state === "pending" ? fillColor : "none"}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface NorthStarGlyphProps extends BaseGlyphProps {
  /**
   * The one ambient motion beyond the star field: a 4s scale pulse
   * (1 ↔ 1.06). Stops entirely under prefers-reduced-motion.
   */
  pulse?: boolean;
}

/** The dream marker — larger four-point star + fine 45° secondary cross. */
export function NorthStarGlyph({
  size = 28,
  color = "var(--color-gold-bright)",
  pulse = false,
  className,
  label,
}: NorthStarGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn(
        // fill-box keeps the pulse pivot correct when the glyph is embedded
        // inside a larger SVG coordinate system (no-op in HTML contexts).
        "shrink-0 origin-center [transform-box:fill-box]",
        pulse && "animate-north-pulse",
        className,
      )}
      {...a11y(label)}
    >
      <g
        stroke={color}
        strokeWidth={1}
        strokeOpacity="0.8"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      >
        <line x1="15.5" y1="8.5" x2="18.2" y2="5.8" vectorEffect="non-scaling-stroke" />
        <line x1="15.5" y1="15.5" x2="18.2" y2="18.2" vectorEffect="non-scaling-stroke" />
        <line x1="8.5" y1="15.5" x2="5.8" y2="18.2" vectorEffect="non-scaling-stroke" />
        <line x1="8.5" y1="8.5" x2="5.8" y2="5.8" vectorEffect="non-scaling-stroke" />
      </g>
      <path d={STAR_PATH} fill={color} />
    </svg>
  );
}

export type PositionCrossProps = BaseGlyphProps;

/** "You are here" — 12px cross inside a 20px circle at 40%. Starlight. */
export function PositionCross({
  size = 24,
  color = "var(--color-starlight)",
  className,
  label,
}: PositionCrossProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...a11y(label)}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke={color}
        strokeOpacity="0.4"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <g stroke={color} strokeWidth={1.5} strokeLinecap="round">
        <line x1="12" y1="6" x2="12" y2="18" vectorEffect="non-scaling-stroke" />
        <line x1="6" y1="12" x2="18" y2="12" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

export interface CompassRoseProps extends BaseGlyphProps {
  /** Render the mono N/E/S/W letters. On by default; disable below ~32px. */
  labels?: boolean;
}

/** Thin-line eight-point compass rose with mono cardinal letters. */
export function CompassRose({
  size = 48,
  color = "currentColor",
  labels = true,
  className,
  label,
}: CompassRoseProps) {
  const cardinal = [
    { x2: 24, y2: 8, lx: 24, ly: 3.4, letter: "N" },
    { x2: 40, y2: 24, lx: 44.6, ly: 24, letter: "E" },
    { x2: 24, y2: 40, lx: 24, ly: 44.6, letter: "S" },
    { x2: 8, y2: 24, lx: 3.4, ly: 24, letter: "W" },
  ];
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...a11y(label)}
    >
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="none"
        stroke={color}
        strokeOpacity="0.45"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {/* cardinal rays */}
      <g stroke={color} strokeWidth={1.5} strokeLinecap="round">
        {cardinal.map((c) => (
          <line
            key={c.letter}
            x1={24 + (c.x2 - 24) * 0.28}
            y1={24 + (c.y2 - 24) * 0.28}
            x2={c.x2}
            y2={c.y2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      {/* intercardinal rays — shorter, quieter */}
      <g stroke={color} strokeWidth={1} strokeOpacity="0.55" strokeLinecap="round">
        {[45, 135, 225, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const sx = 24 + Math.sin(rad) * 5;
          const sy = 24 - Math.cos(rad) * 5;
          const ex = 24 + Math.sin(rad) * 12;
          const ey = 24 - Math.cos(rad) * 12;
          return (
            <line
              key={deg}
              x1={sx}
              y1={sy}
              x2={ex}
              y2={ey}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
      <circle cx="24" cy="24" r="1.6" fill={color} />
      {labels && (
        <g
          fill={color}
          fillOpacity="0.8"
          fontSize="5"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {cardinal.map((c) => (
            <text key={c.letter} x={c.lx} y={c.ly}>
              {c.letter}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}
