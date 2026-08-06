import * as React from "react";
import { cn } from "@/lib/cn";
import {
  Graticule,
  NorthStarGlyph,
  PositionCross,
  WaypointGlyph,
} from "@/components/ui";

/**
 * The landing hero: a full-bleed voyage track chart, ~55vh. Entirely
 * code-drawn and server-rendered — zero client JS. The one authored motion
 * on this surface is the route drawing itself in on load (CSS only,
 * stroke-dashoffset through a mask, 700ms expo-out, skipped under
 * prefers-reduced-motion).
 *
 * Scaling strategy: the star scatter and graticule dress the whole container
 * fluidly (percentage space + CSS), while the route composition lives in a
 * fixed-aspect SVG per breakpoint (`meet`, never cropped, never distorted) —
 * portrait for phones, two widening charts for tablet and desktop.
 *
 * The breakpoint swap uses `visibility`, never `display`: a display toggle
 * cancels and restarts the one-shot draw/fade animations, which (with their
 * fill-mode holding the pre-state) left the route, waypoints and north star
 * invisible whenever the viewport crossed a breakpoint. With visibility all
 * three compositions animate once at page load and hold their finished
 * state, so the full route is in frame at every width from 320px up.
 */

type Pt = readonly [number, number];

/* ------------------------------------------------------------- star sky */

/** Deterministic PRNG seeded with the direction key a472ca18. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ChartStar {
  left: number; // %
  top: number; // %
  size: number; // px
  opacity: number;
  twinkle: boolean;
  delay: number; // s
}

/** 54 magnitude-varied chart stars, denser toward the zenith. */
const STARS: readonly ChartStar[] = (() => {
  const rand = mulberry32(0xa472ca18);
  const stars: ChartStar[] = [];
  for (let i = 0; i < 54; i++) {
    const magnitude = rand();
    stars.push({
      left: 2 + rand() * 96,
      top: 2 + Math.pow(rand(), 1.45) * 93,
      size: Math.round((1 + magnitude * 2.2) * 10) / 10,
      opacity: Math.round((0.25 + magnitude * 0.6 + rand() * 0.1) * 100) / 100,
      twinkle: i % 18 === 5, // exactly three quiet twinklers
      delay: Math.round(rand() * 60) / 10,
    });
  }
  return stars;
})();

/* ------------------------------------------------------------ the route */

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Catmull-Rom chain → smooth cubic beziers through every point. */
function routePath(points: readonly Pt[]): string {
  const p = [points[0], ...points, points[points.length - 1]];
  let d = `M ${p[1][0]} ${p[1][1]}`;
  for (let i = 1; i < p.length - 2; i++) {
    const c1x = p[i][0] + (p[i + 1][0] - p[i - 1][0]) / 6;
    const c1y = p[i][1] + (p[i + 1][1] - p[i - 1][1]) / 6;
    const c2x = p[i + 1][0] - (p[i + 2][0] - p[i][0]) / 6;
    const c2y = p[i + 1][1] - (p[i + 2][1] - p[i][1]) / 6;
    d += ` C ${round1(c1x)} ${round1(c1y)}, ${round1(c2x)} ${round1(c2y)}, ${p[i + 1][0]} ${p[i + 1][1]}`;
  }
  return d;
}

interface Composition {
  id: string;
  /** Breakpoint visibility. */
  className: string;
  w: number;
  h: number;
  /** cross → three waypoints → north star. */
  route: readonly Pt[];
  fontSize: number;
  tracking: number;
  crossLabel: Pt;
  starSize: number;
  starLabel: {
    x: number;
    y: number;
    lineHeight: number;
    lines: readonly string[];
  };
}

const JOB_LINE = "SENIOR PRODUCT DESIGNER - LONDON";

const COMPOSITIONS: readonly Composition[] = [
  {
    id: "m",
    className: "md:invisible",
    w: 400,
    h: 460,
    route: [
      [92, 375],
      [160, 308],
      [240, 237],
      [276, 159],
      [316, 81],
    ],
    fontSize: 12,
    tracking: 1.6,
    crossLabel: [92, 404],
    starSize: 34,
    starLabel: {
      x: 372,
      y: 117,
      lineHeight: 17,
      lines: ["SENIOR PRODUCT DESIGNER", "LONDON"],
    },
  },
  {
    id: "t",
    className: "invisible md:visible xl:invisible",
    w: 950,
    h: 540,
    route: [
      [150, 428],
      [350, 356],
      [546, 276],
      [706, 196],
      [836, 106],
    ],
    fontSize: 12.5,
    tracking: 1.7,
    crossLabel: [150, 462],
    starSize: 36,
    starLabel: { x: 912, y: 146, lineHeight: 17, lines: [JOB_LINE] },
  },
  {
    id: "w",
    className: "invisible xl:visible",
    w: 1300,
    h: 520,
    route: [
      [180, 412],
      [450, 344],
      [690, 266],
      [890, 192],
      [1064, 100],
    ],
    fontSize: 13,
    tracking: 1.8,
    crossLabel: [180, 446],
    starSize: 36,
    starLabel: { x: 1150, y: 140, lineHeight: 17, lines: [JOB_LINE] },
  },
];

const MONO = { fontFamily: "var(--font-mono)" } as const;

function RouteComposition({ c }: { c: Composition }) {
  const d = routePath(c.route);
  const cross = c.route[0];
  const star = c.route[c.route.length - 1];
  const waypoints = c.route.slice(1, -1);
  const half = c.starSize / 2;

  return (
    <svg
      viewBox={`0 0 ${c.w} ${c.h}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("absolute inset-0 h-full w-full", c.className)}
      aria-hidden="true"
    >
      <defs>
        {/* A solid stroke drawing in through this mask reveals the dotted
            route beneath it — the standard dashed-line draw-in. */}
        <mask id={`hero-route-${c.id}`} maskUnits="userSpaceOnUse">
          <path
            d={d}
            pathLength={1}
            fill="none"
            stroke="#fff"
            strokeWidth={28}
            strokeLinecap="round"
            className="hero-route-draw"
          />
        </mask>
      </defs>

      <path
        d={d}
        fill="none"
        stroke="var(--color-gold)"
        strokeOpacity={0.9}
        strokeWidth={1.5}
        strokeDasharray="2 6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        mask={`url(#hero-route-${c.id})`}
      />

      {/* You are here — visible from the first frame; the story's anchor. */}
      <g transform={`translate(${cross[0] - 13}, ${cross[1] - 13})`}>
        <PositionCross size={26} />
      </g>
      <text
        x={c.crossLabel[0]}
        y={c.crossLabel[1]}
        textAnchor="middle"
        fill="var(--color-moonlight)"
        fontSize={c.fontSize}
        letterSpacing={c.tracking}
        style={MONO}
      >
        YOU ARE HERE
      </text>

      {/* Waypoints surface as the route reaches them. */}
      {waypoints.map(([x, y], i) => (
        <g key={`${x}-${y}`} transform={`translate(${x - 8.5}, ${y - 8.5})`}>
          <g
            className="hero-fade"
            style={{ animationDelay: `${400 + i * 160}ms` }}
          >
            <WaypointGlyph size={17} />
          </g>
        </g>
      ))}

      {/* The north star — arrives last, then holds the one ambient pulse. */}
      <g transform={`translate(${star[0] - half}, ${star[1] - half})`}>
        <g className="hero-fade" style={{ animationDelay: "870ms" }}>
          <g
            className="animate-north-pulse"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              animationDelay: "1600ms",
            }}
          >
            <NorthStarGlyph size={c.starSize} />
          </g>
        </g>
      </g>
      <g className="hero-fade" style={{ animationDelay: "950ms" }}>
        {c.starLabel.lines.map((line, i) => (
          <text
            key={line}
            x={c.starLabel.x}
            y={c.starLabel.y + i * c.starLabel.lineHeight}
            textAnchor="end"
            fill="var(--color-gold)"
            fontSize={c.fontSize}
            letterSpacing={c.tracking}
            style={MONO}
          >
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------- chart */

const HERO_CSS = `
@keyframes hero-route-draw {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}
.hero-route-draw {
  /* gap longer than the path so no wrapped dash cap peeks before the draw */
  stroke-dasharray: 1 2;
  animation: hero-route-draw 700ms cubic-bezier(0.16, 1, 0.3, 1) 250ms both;
}
@keyframes hero-fade-in {
  to { opacity: 1; }
}
.hero-fade {
  opacity: 0;
  animation: hero-fade-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
@media (prefers-reduced-motion: reduce) {
  .hero-route-draw { animation: none; stroke-dashoffset: 0; }
  .hero-fade { animation: none; opacity: 1; }
}
`;

export interface HeroChartProps {
  className?: string;
}

export function HeroChart({ className }: HeroChartProps) {
  return (
    <>
      <style>{HERO_CSS}</style>
      <div
        role="img"
        aria-label="A night-sky voyage chart. A dotted gold route rises from a cross marked 'you are here', through three waypoints, to a bright north star labeled Senior Product Designer, London."
        className={cn(
          "relative h-[55svh] max-h-[640px] min-h-[360px] w-full overflow-hidden",
          className,
        )}
      >
        <Graticule />
        <div aria-hidden="true" className="absolute inset-0">
          {STARS.map((s, i) => (
            <span
              key={i}
              className={cn(
                "absolute rounded-full bg-starlight",
                s.twinkle && "animate-quiet-pulse",
              )}
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                opacity: s.opacity,
                animationDelay: s.twinkle ? `${s.delay}s` : undefined,
              }}
            />
          ))}
        </div>
        {COMPOSITIONS.map((c) => (
          <RouteComposition key={c.id} c={c} />
        ))}
      </div>
    </>
  );
}
