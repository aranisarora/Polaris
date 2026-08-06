"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { ChartFrame, NorthStarGlyph, WaypointGlyph } from "@/components/ui";
import { formatDay, formatWeekRange } from "@/lib/schedule";
import type { Schedule } from "@/lib/schedule";
import type { RoadmapTask } from "@/lib/types";

/**
 * The voyage track, plotted against TIME. The x axis runs from the roadmap's
 * start date on the left to its finish date on the right, week ticks along the
 * bottom, one four-point-star waypoint per task at the week it is due, and the
 * north star of the locked destination at the far right. A gold hairline marks
 * TODAY: the old position cross said "you are here" in space, which a plan
 * with dates can now say in time, which is the whole point of the redesign.
 *
 * Readiness is read twice, deliberately: as the mono `READINESS n` corner and
 * as the brightness of the destination star — gold at zero, gold-bright and
 * fully lit at a hundred. The destination literally brightens as the user
 * closes in. Nothing sits behind the star: DESIGN.md's Drawn Ring Exception
 * covers SVG marks like the waypoint's 25% ring, not a CSS aura, and the
 * colour and opacity interpolation carries the metaphor on its own.
 *
 * ── why this is HTML over a stretched SVG, not one SVG ─────────────────────
 * The band is short and wide, and its aspect ratio is nowhere near constant:
 * ~311×120 on a phone (2.6:1) against ~1040×180 on a desktop (5.8:1). A single
 * `viewBox` with `h-auto` cannot be 120px tall on a phone and 180px tall on a
 * wide screen, and `preserveAspectRatio="meet"` would letterbox the timeline
 * instead of spanning the frame. So the SVG stretches (`preserveAspectRatio
 * ="none"`) and carries only strokes — route, axis, ticks, today — each with
 * `vector-effect="non-scaling-stroke"` so weights and dash gaps stay at their
 * intended pixel size under any scale. Everything that must stay round or
 * legible — glyphs, stars, mono labels — is an HTML element positioned in
 * percentages, which land on exactly the same points because a `none` fit maps
 * the viewBox linearly onto the box. Labels therefore hold the system's one
 * `mono-label` step at every width, instead of the SVG text of the old chart
 * which rendered its authored 9px at ~7px on a phone.
 *
 * `reveal` plays the signature draw-in: the route draws itself over 700ms
 * behind an animated mask and the waypoints settle in on a 60ms stagger. All
 * of it is CSS keyframes and CSS transitions — nothing is driven from JS — so
 * globals.css collapses the lot under prefers-reduced-motion. The one thing
 * that rule does not reset is `animation-delay`, which would leave the band
 * blank for most of a second, so the media query below zeroes the delays too.
 */

export interface RouteChartProps {
  /** The plan's calendar from `buildSchedule()`. Never recomputed here. */
  schedule: Schedule;
  /** The locked destination — labels the north star. */
  targetTitle: string;
  /** CV readiness 0–100. Drives the corner readout and the star's brightness. */
  readiness: number;
  /**
   * The same `today` that built the schedule. Passed in rather than read: this
   * file must not touch the clock, or a server render and its hydration could
   * disagree about where the today hairline belongs.
   */
  today: Date;
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

interface Waypoint extends Point {
  task: RoadmapTask;
}

// ---------------------------------------------------------------- geometry

const VIEW_W = 1000;
const VIEW_H = 200;

/** The time axis: t=0 (start date) at PLOT_LEFT, t=1 (finish date) at PLOT_RIGHT. */
const PLOT_LEFT = 34;
const PLOT_RIGHT = 966;

/** Where the week ticks hang from, leaving the bottom row for their labels. */
const AXIS_Y = 160;
const TICK_MINOR = 6;
const TICK_MAJOR = 9;

/** The route's baseline: low at the start date, rising to the star. */
const RAMP_START_Y = 128;
const STAR_Y = 70;
/** Sine swing off the ramp — the route stays a route, not a flat rule. */
const SWING = 17;

const MS_PER_DAY = 86_400_000;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function xForTime(t: number): number {
  return PLOT_LEFT + (PLOT_RIGHT - PLOT_LEFT) * t;
}

/** The route's height at normalized time `t`: linear rise plus one sine swing. */
function routeY(t: number): number {
  return (
    RAMP_START_Y +
    (STAR_Y - RAMP_START_Y) * t +
    Math.sin(t * Math.PI * 2.1 + 0.55) * SWING
  );
}

/** viewBox units → percentages, so HTML marks land on the stretched SVG. */
function pctX(x: number): number {
  return Math.round((x / VIEW_W) * 10000) / 100;
}
function pctY(y: number): number {
  return Math.round((y / VIEW_H) * 10000) / 100;
}

/** Local midnight of the same calendar day — never a UTC shift. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Deterministic 0..1 — the chart must render identically on every visit. */
function pseudo(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Faint backdrop stars, fixed positions, computed once at module scope.
 * Diameters stay in device pixels so they are circles at every band width.
 */
const CHART_STARS = Array.from({ length: 18 }, (_, i) => ({
  left: pctX(16 + pseudo(i * 3 + 1) * (VIEW_W - 32)),
  top: pctY(14 + pseudo(i * 3 + 2) * (VIEW_H - 28)),
  d: Math.round((1 + pseudo(i * 3 + 3) * 1.8) * 10) / 10,
  o: Math.round((0.14 + pseudo(i * 3 + 4) * 0.22) * 100) / 100,
}));

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

function truncateLabel(text: string, max = 22): string {
  const upper = text.trim().toUpperCase();
  return upper.length > max ? `${upper.slice(0, max - 1).trimEnd()}…` : upper;
}

/**
 * The week ruler and the TODAY readout are measured values, so they take the
 * one documented label step (`mono-label`, 0.6875rem) rather than a smaller
 * one-off — DESIGN.md records inline sub-label mono as drift to reconcile, not
 * a token to inherit. Density is solved by thinning the labels below `md`
 * instead of shrinking them.
 */
const TICK_LABEL = "mono-label absolute bottom-0";

/*
 * ── keeping TODAY off the week ruler ───────────────────────────────────────
 * TODAY and the week labels share one bottom row, so a week label standing
 * where TODAY lands has to give way. What decides that is a LABEL WIDTH, which
 * is fixed in pixels — not one week's slot, which shrinks as the plan
 * lengthens. A slot-relative budget clears ~217/weekCount px on a phone, so it
 * covers a six-week plan and then quietly fails at seven, printing "TODAY"
 * straight over "W5" for every plan longer than that.
 *
 * `mono-label` is 11px Fragment Mono at 0.14em tracking, which measures 8.34px
 * a character in Chromium against the self-hosted face (116.73px for a
 * fourteen-character reading). "TODAY" is five of them (~42px); half of each
 * label plus a 4px gap is the distance their centres have to keep, at any week
 * count.
 *
 * The week label is the one term that GROWS with the plan — "W9" is two
 * characters, "W26" three, "W120" four — so it is read off the longest label
 * this plan can actually print rather than assumed. Hard-coding three cleared
 * every plan up to 99 weeks and then overlapped by ~4px from 100, which is
 * reachable: the tier effort band is guidance, not a validator, and ten 60h
 * tasks at 4h a week is 150 weeks.
 */
const LABEL_CH_PX = 8.34;
const TODAY_LABEL = "TODAY";

/** Centres this far apart, in device pixels, and the two labels cannot touch. */
function clearancePx(totalWeeks: number): number {
  const widestWeekLabel = `W${Math.max(1, totalWeeks)}`;
  return ((TODAY_LABEL.length + widestWeekLabel.length) * LABEL_CH_PX) / 2 + 4;
}

/**
 * The band's rendered width, per breakpoint. It is never measured — the chart
 * has to build the same label list on the server and after hydration — so it
 * is derived from the shell: the app container is `max-w-6xl px-4 md:px-8` and
 * ChartFrame adds `p-4 md:p-6`, leaving `viewport − 64` on a phone (296px on
 * the narrowest handset we design for, 311px at 375px) and 1040px at the
 * 1152px cap. The phone figure is the narrow end on purpose: the budget it
 * buys is generous on a larger phone and never short on a smaller one.
 */
const BAND_SM = 296;
const BAND_MD = 1040;

/** The CSS `clamp()` insets that hold each label off the frame edge. */
const WEEK_INSET_PX = 12.8; // 0.8rem
const TODAY_INSET_PX = 20.8; // 1.3rem

/**
 * A floor under the exclusion: on a wide band the type fits with room to
 * spare, and a week label pressed up against the hairline still reads as a
 * collision even when the glyphs technically clear.
 */
const MIN_CLEAR = (PLOT_RIGHT - PLOT_LEFT) * 0.04;

/** A device-pixel distance at a given band width, in viewBox units. */
function pxToUnits(px: number, band: number): number {
  return (px / band) * VIEW_W;
}

/**
 * Where a label actually lands. Both rows are `clamp()`ed off the frame edge,
 * and clamping can only push TODAY and a week label closer together, so the
 * overlap test runs on the clamped centres rather than the raw ones.
 */
function railX(x: number, insetPx: number, band: number): number {
  return clamp(x, pxToUnits(insetPx, band), VIEW_W - pxToUnits(insetPx, band));
}

const KEYFRAMES = `
@keyframes polaris-route-draw { to { stroke-dashoffset: 0; } }
@keyframes polaris-waypoint-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .polaris-mark-reveal { animation-delay: 0ms !important; }
}`;

// --------------------------------------------------------------- component

export function RouteChart({
  schedule,
  targetTitle,
  readiness,
  today,
  reveal = false,
  flareTaskId = null,
  className,
}: RouteChartProps) {
  const maskId = React.useId();
  const { weeks, totalWeeks, currentWeekIndex, finishDate } = schedule;

  // A roadmap with no tasks has no weeks. One notional week keeps every
  // division below safe without special-casing the render.
  const weekCount = Math.max(1, totalWeeks);

  const waypoints = React.useMemo<Waypoint[]>(() => {
    const out: Waypoint[] = [];
    for (const week of weeks) {
      const inWeek = week.tasks.length;
      week.tasks.forEach((task, j) => {
        // Spread a week's tasks across its span rather than stacking them on
        // one point: two tasks can share a week, and a lone task sits mid-week
        // where its tick label is.
        const t = (week.index + (j + 1) / (inWeek + 1)) / weekCount;
        out.push({ task, x: xForTime(t), y: routeY(t) });
      });
    }
    return out;
  }, [weeks, weekCount]);

  const d = React.useMemo(
    () =>
      routePath([
        { x: PLOT_LEFT, y: routeY(0) },
        ...waypoints.map(({ x, y }) => ({ x, y })),
        { x: PLOT_RIGHT, y: STAR_Y },
      ]),
    [waypoints],
  );

  const currentIndex = waypoints.findIndex((w) => !w.task.done);
  const doneCount = waypoints.filter((w) => w.task.done).length;

  // TODAY in plan time. Clamped to the axis, so a plan not yet started and one
  // long overdue both keep a visible hairline inside the band instead of
  // drawing it off the edge.
  const xToday = React.useMemo(() => {
    const start = weeks[0]?.start;
    if (!start) return xForTime(0);
    const days = Math.round(
      (startOfDay(today).getTime() - startOfDay(start).getTime()) / MS_PER_DAY,
    );
    return xForTime(clamp(days / 7, 0, weekCount) / weekCount);
  }, [weeks, today, weekCount]);

  const score = Math.round(clamp(readiness, 0, 100));
  const lit = score / 100;

  // Week tick labels: every week up to twelve, every other beyond. The /16
  // guard only bites past ~32 weeks, where "every other" would still collide.
  const stride = totalWeeks <= 12 ? 1 : Math.max(2, Math.ceil(totalWeeks / 16));
  // A phone band is ~311px wide and an 11px mono label is ~24px, so it holds
  // about six labels in comfort. Thin to that below `md` — a multiple of the
  // wide stride, so the phone set is always a subset of the desktop set and a
  // breakpoint crossing only ever adds labels between the ones already there.
  const strideSm = stride * Math.max(1, Math.ceil(totalWeeks / (6 * stride)));

  // The clearance TODAY needs, in viewBox units, at each breakpoint's band
  // width: ~37 device pixels on a two-digit plan, ~42 once the ruler prints a
  // three-digit week. Being a pixel budget, it is the LABELS that set it and
  // not the week count — a longer plan narrows every slot but never the type.
  const clearPx = clearancePx(totalWeeks);
  const clearSm = Math.max(MIN_CLEAR, pxToUnits(clearPx, BAND_SM));
  const clearMd = Math.max(MIN_CLEAR, pxToUnits(clearPx, BAND_MD));
  const todaySm = railX(xToday, TODAY_INSET_PX, BAND_SM);
  const todayMd = railX(xToday, TODAY_INSET_PX, BAND_MD);

  const weekLabels: { index: number; x: number; mdOnly: boolean }[] = [];
  for (let i = 0; i < totalWeeks; i += stride) {
    const x = xForTime((i + 0.5) / weekCount);
    // TODAY owns the stretch of row it stands in. A week label that cannot
    // clear it even at desktop width is dropped outright; one that clears
    // there but not on a phone is held back to `md`, which is the same
    // treatment the density thinning already gives half of them.
    if (Math.abs(railX(x, WEEK_INSET_PX, BAND_MD) - todayMd) < clearMd) continue;
    const tightSm = Math.abs(railX(x, WEEK_INSET_PX, BAND_SM) - todaySm) < clearSm;
    weekLabels.push({ index: i, x, mdOnly: i % strideSm !== 0 || tightSm });
  }

  const currentWeek = weeks[currentWeekIndex];
  const ariaLabel = currentWeek
    ? `Voyage track: week ${currentWeekIndex + 1} of ${totalWeeks}, ${formatWeekRange(currentWeek.start, currentWeek.end, today)}. ${doneCount} of ${waypoints.length} waypoints reached on the way to ${targetTitle}. Readiness ${score} of 100. Finishes ${formatDay(finishDate, today)}.`
    : `Voyage track: nothing plotted yet on the way to ${targetTitle}. Readiness ${score} of 100.`;

  return (
    <ChartFrame
      topLeft="VOYAGE TRACK"
      topRight={`READINESS ${score}`}
      bottomLeft={
        currentWeek ? `WEEK ${currentWeekIndex + 1} OF ${totalWeeks}` : undefined
      }
      bottomRight={
        currentWeek ? `FINISHES ${formatDay(finishDate, today)}` : undefined
      }
      className={className}
      // No interior graticule: the week ticks are this chart's grid, and a
      // 48px square mesh behind a time axis reads as two competing rulers.
      contentClassName="p-4 pb-7 pt-8 md:p-6 md:pb-8 md:pt-9"
    >
      {/* One `role="img"` over the whole band: it makes the subtree
          presentational, so no mark or label inside needs its own
          aria-hidden, and a screen reader gets one sentence rather than a
          scatter of stray "W7"s. */}
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative h-[120px] w-full md:h-[180px]"
      >
        <style>{KEYFRAMES}</style>

        {/* faint fixed stars behind the route */}
        {CHART_STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-starlight"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.d,
              height: s.d,
              opacity: s.o,
            }}
          />
        ))}

        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {/* the time axis and its week boundaries */}
          {totalWeeks > 0 && (
            <g stroke="var(--color-starlight)" strokeWidth={1}>
              <line
                x1={PLOT_LEFT}
                y1={AXIS_Y}
                x2={PLOT_RIGHT}
                y2={AXIS_Y}
                strokeOpacity={0.14}
                vectorEffect="non-scaling-stroke"
              />
              {Array.from({ length: totalWeeks + 1 }, (_, i) => {
                const edge = i === 0 || i === totalWeeks;
                const x = xForTime(i / weekCount);
                return (
                  <line
                    key={i}
                    x1={x}
                    y1={AXIS_Y}
                    x2={x}
                    y2={AXIS_Y + (edge ? TICK_MAJOR : TICK_MINOR)}
                    strokeOpacity={edge ? 0.4 : 0.2}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </g>
          )}

          {/* the one brass-gold dotted route, revealed via an animated mask.
              userSpaceOnUse is deliberate: the default objectBoundingBox region
              collapses on a near-flat path and would hide the route entirely. */}
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={VIEW_W}
            height={VIEW_H}
          >
            <path
              d={d}
              pathLength={100}
              fill="none"
              stroke="white"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray="100"
              strokeDashoffset={reveal ? 100 : 0}
              className={reveal ? "polaris-mark-reveal" : undefined}
              style={
                reveal
                  ? {
                      animation:
                        "polaris-route-draw 700ms var(--ease-out-expo) 100ms forwards",
                    }
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
            vectorEffect="non-scaling-stroke"
            mask={`url(#${maskId})`}
          />

          {/* TODAY — the hairline that replaced the position cross */}
          <g
            className={reveal ? "polaris-mark-reveal" : undefined}
            style={
              reveal
                ? {
                    animation:
                      "polaris-waypoint-in 400ms var(--ease-out-expo) 640ms both",
                  }
                : undefined
            }
          >
            <line
              x1={xToday}
              y1={34}
              x2={xToday}
              y2={AXIS_Y + TICK_MAJOR}
              stroke="var(--color-gold)"
              strokeWidth={1}
              strokeOpacity={0.55}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>

        {/* where TODAY meets the route — the position mark, now in time */}
        <span
          className={cn(
            "absolute h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-bright",
            reveal && "polaris-mark-reveal",
          )}
          style={{
            left: `${pctX(xToday)}%`,
            top: `${pctY(routeY((xToday - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT)))}%`,
            ...(reveal
              ? {
                  animation:
                    "polaris-waypoint-in 400ms var(--ease-out-expo) 640ms both",
                }
              : null),
          }}
        />

        {/* one waypoint per task, at the week it is due */}
        {waypoints.map((w, i) => {
          const state = w.task.done
            ? "done"
            : i === currentIndex
              ? "current"
              : "pending";
          const flare = w.task.id === flareTaskId && w.task.done;
          return (
            <span
              key={w.task.id}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2",
                reveal && "polaris-mark-reveal",
              )}
              style={{
                left: `${pctX(w.x)}%`,
                top: `${pctY(w.y)}%`,
                ...(reveal
                  ? {
                      animation: `polaris-waypoint-in 400ms var(--ease-out-expo) ${260 + i * 60}ms both`,
                    }
                  : null),
              }}
            >
              {state === "current" && (
                <span className="absolute left-1/2 top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 animate-quiet-pulse rounded-full border border-gold md:h-7 md:w-7" />
              )}
              {/* The flare scales; it rides its own element so it cannot
                  clobber the centring transform on the positioned parent. */}
              <span className={cn("block", flare && "animate-waypoint-flare")}>
                <WaypointGlyph
                  state={state}
                  className="h-3.5 w-3.5 md:h-[18px] md:w-[18px]"
                />
              </span>
            </span>
          );
        })}

        {/* the north star — the locked destination, lit by readiness */}
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pctX(PLOT_RIGHT)}%`, top: `${pctY(STAR_Y)}%` }}
        >
          {/* Colour and opacity do the brightening, and nothing stands behind
              the glyph: an aura here would be a CSS halo, which this system
              does not have anywhere — only drawn SVG rings. */}
          <span
            className="block"
            style={{
              color: `color-mix(in srgb, var(--color-gold-bright) ${Math.round(lit * 100)}%, var(--color-gold))`,
              opacity: Math.round((0.44 + 0.56 * lit) * 100) / 100,
              transition:
                "color 600ms var(--ease-out-expo), opacity 600ms var(--ease-out-expo)",
            }}
          >
            <NorthStarGlyph
              color="currentColor"
              className="h-[22px] w-[22px] md:h-7 md:w-7"
            />
          </span>
        </span>

        {/* The destination's name crowns the star rather than trailing below
            it: every mark this chart draws — waypoints, ticks, the today
            hairline and its labels — lives under the star, so the band above
            it is the one place the name never collides at any task count. */}
        <span className="mono-label absolute right-0 top-0 max-w-[68%] truncate text-gold-bright">
          {truncateLabel(targetTitle)}
        </span>

        {/* the week ruler */}
        {weekLabels.map(({ index, x, mdOnly }) => (
          <span
            key={index}
            className={cn(
              TICK_LABEL,
              "text-moonlight/70",
              mdOnly && "hidden md:block",
            )}
            style={{
              // clamp keeps the first and last labels off the frame edge
              // without measuring anything.
              left: `clamp(0.8rem, ${pctX(x)}%, calc(100% - 0.8rem))`,
              transform: "translateX(-50%)",
            }}
          >
            W{index + 1}
          </span>
        ))}

        <span
          className={cn(TICK_LABEL, "text-gold", reveal && "polaris-mark-reveal")}
          style={{
            left: `clamp(1.3rem, ${pctX(xToday)}%, calc(100% - 1.3rem))`,
            transform: "translateX(-50%)",
            ...(reveal
              ? {
                  animation:
                    "polaris-waypoint-in 400ms var(--ease-out-expo) 640ms both",
                }
              : null),
          }}
        >
          Today
        </span>
      </div>
    </ChartFrame>
  );
}

/**
 * The plan names this instrument the route timeline; the file keeps its
 * historical name, so both identifiers resolve to the same component.
 */
export { RouteChart as RouteTimeline };
export type { RouteChartProps as RouteTimelineProps };
