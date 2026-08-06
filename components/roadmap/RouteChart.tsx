"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { NorthStarGlyph, PositionCross, WaypointGlyph } from "@/components/ui";
import type { RoadmapTask } from "@/lib/types";

/**
 * The star-chart roadmap: an authored SVG voyage track from the position
 * cross (YOU ARE HERE) through one four-point-star waypoint per task, rising
 * to the north star labeled with the locked target. Route is the one
 * brass-gold dotted line; waypoint state carries progress (done = ignited
 * gold-bright, current = pulsing ring, ahead = hairline outline).
 *
 * `reveal` plays the signature draw-in: the route draws itself over 700ms
 * and waypoints settle in staggered behind it. All animation collapses to
 * the final state under prefers-reduced-motion (globals.css).
 */

export interface RouteChartProps {
  tasks: RoadmapTask[];
  targetTitle: string;
  /** Play the 700ms route draw-in (the generation reveal). */
  reveal?: boolean;
  /** Task whose waypoint should flare (just completed). */
  flareTaskId?: string | null;
  className?: string;
}

interface Point {
  x: number;
  y: number;
}

const VIEW_W = 400;
const VIEW_H = 300;
const START: Point = { x: 48, y: 254 };
const END: Point = { x: 348, y: 48 };

/** Deterministic 0..1 — the chart must render identically on every visit. */
function pseudo(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Faint backdrop stars, fixed positions, drawn once at module scope. */
const CHART_STARS = Array.from({ length: 18 }, (_, i) => ({
  x: Math.round((16 + pseudo(i * 3 + 1) * (VIEW_W - 32)) * 10) / 10,
  y: Math.round((14 + pseudo(i * 3 + 2) * (VIEW_H - 28)) * 10) / 10,
  r: Math.round((0.5 + pseudo(i * 3 + 3) * 0.9) * 10) / 10,
  o: Math.round((0.14 + pseudo(i * 3 + 4) * 0.22) * 100) / 100,
}));

/** Waypoint positions along a gentle S-curve between START and END. */
function waypointPoints(count: number): Point[] {
  const dx = END.x - START.x;
  const dy = END.y - START.y;
  const len = Math.hypot(dx, dy);
  const px = -dy / len;
  const py = dx / len;

  return Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1);
    const swing = Math.sin(t * Math.PI * 2.1 + 0.55) * 27;
    return {
      x: START.x + dx * t + px * swing,
      y: START.y + dy * t + py * swing,
    };
  });
}

/** Catmull-Rom spline through every point — waypoints sit ON the route. */
function routePath(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function truncateLabel(text: string, max = 24): string {
  const upper = text.toUpperCase();
  return upper.length > max ? `${upper.slice(0, max - 1).trimEnd()}…` : upper;
}

const MONO_TEXT: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.14em",
};

export function RouteChart({
  tasks,
  targetTitle,
  reveal = false,
  flareTaskId = null,
  className,
}: RouteChartProps) {
  const maskId = React.useId();
  const points = React.useMemo(() => waypointPoints(tasks.length), [tasks.length]);
  const d = React.useMemo(() => routePath([START, ...points, END]), [points]);

  const currentIndex = tasks.findIndex((t) => !t.done);
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn("block h-auto w-full", className)}
      role="img"
      aria-label={`Route chart: ${doneCount} of ${tasks.length} waypoints reached on the way to ${targetTitle}.`}
    >
      <style>{`
        @keyframes polaris-route-draw { to { stroke-dashoffset: 0; } }
        @keyframes polaris-waypoint-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* faint fixed stars behind the route */}
      {CHART_STARS.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="var(--color-starlight)"
          opacity={s.o}
        />
      ))}

      {/* the one brass-gold dotted route, revealed via an animated mask */}
      <mask id={maskId}>
        <path
          d={d}
          pathLength={100}
          fill="none"
          stroke="white"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset={reveal ? 100 : 0}
          style={
            reveal
              ? { animation: "polaris-route-draw 700ms var(--ease-out-expo) 100ms forwards" }
              : undefined
          }
        />
      </mask>
      <path
        d={d}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth={1.5}
        strokeDasharray="2 6"
        strokeLinecap="round"
        opacity={0.85}
        mask={`url(#${maskId})`}
      />

      {/* position cross — YOU ARE HERE */}
      <g transform={`translate(${START.x - 11}, ${START.y - 11})`}>
        <PositionCross size={22} />
      </g>
      <text
        x={START.x - 12}
        y={START.y + 26}
        fontSize={9}
        fill="var(--color-starlight)"
        opacity={0.85}
        style={MONO_TEXT}
      >
        YOU ARE HERE
      </text>

      {/* one waypoint per task */}
      {tasks.map((task, i) => {
        const p = points[i];
        const state = task.done ? "done" : i === currentIndex ? "current" : "pending";
        const flare = task.id === flareTaskId && task.done;
        const size = 18;
        return (
          <g
            key={task.id}
            style={
              reveal
                ? {
                    animation: `polaris-waypoint-in 400ms var(--ease-out-expo) ${260 + i * 60}ms both`,
                  }
                : undefined
            }
          >
            {state === "current" && (
              <circle
                cx={p.x}
                cy={p.y}
                r={11}
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth={1}
                className="animate-quiet-pulse"
              />
            )}
            <g
              transform={`translate(${p.x - size / 2}, ${p.y - size / 2})`}
              className={flare ? "animate-waypoint-flare" : undefined}
              style={
                flare
                  ? { transformBox: "fill-box", transformOrigin: "center" }
                  : undefined
              }
            >
              <WaypointGlyph size={size} state={state} />
            </g>
            <text
              x={p.x + 12}
              y={p.y + 3.5}
              fontSize={8.5}
              fill="var(--color-moonlight)"
              opacity={0.9}
              style={MONO_TEXT}
            >
              {String(task.position).padStart(2, "0")}
            </text>
          </g>
        );
      })}

      {/* The north star — the locked destination. Its label crowns the star
          rather than trailing below it: the route rises from the bottom-left,
          so everything the chart draws (waypoint glyphs and their number
          ticks alike) lives *under* the star. Sitting the name above it puts
          it outside that band at every task count, which the old below-right
          placement could not do — at six waypoints the last glyph and its
          "06" tick landed straight on the destination name. */}
      <g transform={`translate(${END.x - 15}, ${END.y - 15})`}>
        <NorthStarGlyph size={30} />
      </g>
      <text
        x={END.x + 15}
        y={END.y - 24}
        fontSize={9}
        textAnchor="end"
        fill="var(--color-gold-bright)"
        style={MONO_TEXT}
      >
        {truncateLabel(targetTitle)}
      </text>
    </svg>
  );
}
