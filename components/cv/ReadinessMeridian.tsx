import type { CSSProperties } from "react";
import { NorthStarGlyph, PositionCross } from "@/components/ui";

/**
 * The readiness instrument. Not a progress ring and not a hero numeral: the
 * score is *plotted* — a position cross on the meridian that runs from the
 * chart's origin up to the north star of the locked destination, drawn with
 * the same grammar as every other Polaris chart (one brass-gold dotted
 * route, lit behind you and unlit ahead, degree ticks down the axis, the
 * authored four-point north star, mono measurement labels).
 *
 * Reading it: the cross is where you stand, the star is what the postings
 * ask for, and the lit stretch of route is what you already hold. The
 * numeral rides with the cross as its readout, so it measures a position
 * rather than posing as a headline figure.
 *
 * Server-rendered SVG. The lit route and the marker transition over 600ms
 * when the score changes on a data refresh (CSS only — reduced motion stops
 * both via globals.css). The score itself never decreases; that guarantee
 * lives in the page's `Math.max` over the last saved version.
 */

const VIEW_W = 236;
const VIEW_H = 226;

/** The meridian: a vertical measurement axis, ticks left, readouts right. */
const AXIS_X = 46;
/** Score 0 sits on the datum; score 100 stops just short of the star. */
const BOTTOM_Y = 200;
const TOP_Y = 48;
/** The route runs a little past the 100 mark, up to the star's foot. */
const ROUTE_TOP = 38;
const STAR_Y = 20;
/** Left edge of every readout column, so the star's name and the marker's
 *  numeral hang on one line. */
const READOUT_X = AXIS_X + 22;

const ROUTE_D = `M ${AXIS_X} ${BOTTOM_Y} L ${AXIS_X} ${ROUTE_TOP}`;

const MONO_TEXT: CSSProperties = {
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.14em",
};

/** One instrument per page — a fixed id keeps this server-renderable. */
const LIT_MASK_ID = "polaris-readiness-lit";

/** Degree ticks every 10 points. 100 is omitted — the apex is the star. */
const TICK_SCORES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

function yForScore(score: number): number {
  return BOTTOM_Y - (score / 100) * (BOTTOM_Y - TOP_Y);
}

function truncateLabel(text: string, max = 20): string {
  const upper = text.trim().toUpperCase();
  return upper.length > max ? `${upper.slice(0, max - 1).trimEnd()}…` : upper;
}

export interface ReadinessMeridianProps {
  /** 0–100. Clamped and rounded. */
  score: number;
  /** The locked destination — labels the north star. */
  targetTitle: string;
}

export function ReadinessMeridian({ score, targetTitle }: ReadinessMeridianProps) {
  const value = Math.min(100, Math.max(0, Math.round(score)));
  const markerY = yForScore(value);
  const label = truncateLabel(targetTitle);

  // The route is longer than the 0–100 span (it carries on to the star), so
  // the lit fraction is measured against the route, not the scale. At 100 the
  // last hop lights too: you are at the star, not a stub short of it.
  const litPercent =
    value >= 100 ? 100 : ((BOTTOM_Y - markerY) / (BOTTOM_Y - ROUTE_TOP)) * 100;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`CV readiness ${value} of 100 on the route to ${targetTitle}.`}
    >
      {/* degree ticks down the meridian — 4px, every fifth 8px. The two
          nearest the marker are dropped so the cross never sits on a tick. */}
      <g stroke="var(--color-starlight)" strokeWidth={1}>
        {TICK_SCORES.filter((s) => Math.abs(yForScore(s) - markerY) > 13).map((s) => {
          const major = s % 50 === 0;
          const y = yForScore(s);
          return (
            <line
              key={s}
              x1={AXIS_X - (major ? 11 : 7)}
              y1={y}
              x2={AXIS_X - 3}
              y2={y}
              strokeOpacity={major ? 0.45 : 0.22}
            />
          );
        })}
      </g>

      {/* the route ahead — drawn, waiting */}
      <path
        d={ROUTE_D}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth={1.5}
        strokeDasharray="2 6"
        strokeLinecap="round"
        opacity={0.22}
      />

      {/* The stretch already sailed, revealed by a masked length. The mask
          region must be declared in user space: a vertical line has a
          zero-width bounding box, and the default objectBoundingBox region
          would collapse to nothing and hide the lit route entirely. */}
      <mask
        id={LIT_MASK_ID}
        maskUnits="userSpaceOnUse"
        x={0}
        y={0}
        width={VIEW_W}
        height={VIEW_H}
      >
        <path
          d={ROUTE_D}
          fill="none"
          stroke="white"
          strokeWidth={9}
          pathLength={100}
          strokeDasharray={`${litPercent.toFixed(2)} 100`}
          className="transition-[stroke-dasharray] duration-[600ms] ease-out-expo"
        />
      </mask>
      <path
        d={ROUTE_D}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth={1.5}
        strokeDasharray="2 6"
        strokeLinecap="round"
        opacity={0.9}
        mask={`url(#${LIT_MASK_ID})`}
      />

      {/* the north star — what the postings ask for */}
      <g transform={`translate(${AXIS_X - 14}, ${STAR_Y - 14})`}>
        <NorthStarGlyph size={28} />
      </g>
      <text
        x={READOUT_X}
        y={STAR_Y + 4}
        fontSize={10}
        fill="var(--color-gold-bright)"
        style={MONO_TEXT}
      >
        {label}
      </text>

      {/* the plotted position — cross, readout, caption, moving as one */}
      <g
        style={{
          transform: `translateY(${markerY}px)`,
          transition: "transform 600ms var(--ease-out-expo)",
        }}
      >
        <g transform={`translate(${AXIS_X - 11}, -11)`}>
          <PositionCross size={22} />
        </g>
        <text x={READOUT_X} y={2} style={MONO_TEXT}>
          <tspan
            fontSize={22}
            fill="var(--color-starlight)"
            letterSpacing="0.02em"
          >
            {value}
          </tspan>
          <tspan fontSize={10} dx={8} fill="var(--color-moonlight)">
            / 100
          </tspan>
        </text>
        <text
          x={READOUT_X}
          y={19}
          fontSize={9.5}
          fill="var(--color-starlight)"
          opacity={0.85}
          style={MONO_TEXT}
        >
          YOU ARE HERE
        </text>
      </g>
    </svg>
  );
}
