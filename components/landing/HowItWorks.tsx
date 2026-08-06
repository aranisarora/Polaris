import * as React from "react";
import { NorthStarGlyph, WaypointGlyph } from "@/components/ui";
import { ChartBackdrop } from "./ChartBackdrop";

/**
 * Exactly three steps, one line each, set as waypoints on a route that ends
 * at the north star. No icon-card grid.
 *
 * The route runs vertically on phones and tablets — the natural reading axis
 * for a single column — and turns to run horizontally from `lg` up, where the
 * same four marks are laid across the frame the way a track is drawn on a
 * chart. Both are the same rail material, just rotated: across the frame it
 * is one continuous line behind all four marks, so the run reads as one route
 * rather than three cards.
 */

const RAIL_DOTS =
  "repeating-linear-gradient(to bottom, color-mix(in srgb, var(--color-gold) 55%, transparent) 0 2px, transparent 2px 8px)";
const RAIL_DOTS_ACROSS =
  "repeating-linear-gradient(to right, color-mix(in srgb, var(--color-gold) 55%, transparent) 0 2px, transparent 2px 8px)";

/**
 * The desktop terminus column. Its width sets where the horizontal rail
 * stops: the north star glyph is 20px, left-aligned in this column, so the
 * rail ends `TERMINUS_W - 10` from the right edge — dead on the star's centre.
 */
const TERMINUS_W = 176;

const STEPS: readonly { title: string; line: string }[] = [
  {
    title: "Name your north star",
    line: "Describe where you dream of ending up — a role, a company, or just a feeling.",
  },
  {
    title: "Take your bearing",
    line: "Real postings, measured against your real experience. No flattery.",
  },
  {
    title: "Follow your route",
    line: "A personal roadmap closes the gap, your CV brightening as you go.",
  },
];

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="relative px-6 py-16 md:border-y md:py-24"
    >
      <ChartBackdrop seed={0x1f7a20} stars={26} grid ticks />
      <div className="relative mx-auto max-w-xl lg:max-w-5xl">
        <h2 id="how-heading" className="text-center text-h1">
          How it works
        </h2>

        <div className="relative mx-auto mt-10 max-w-md lg:mt-14 lg:max-w-none">
          {/* The route, run across the frame — lg+ only, behind the marks.
              Waypoint glyphs are 16px, left-aligned at each column start, so
              their centres sit 8px in and 14px down. Below lg the three step
              lines want more measure than a quarter of a tablet gives them,
              so the route stays vertical there. */}
          <div
            aria-hidden="true"
            className="absolute hidden h-[2px] lg:block"
            style={{
              left: 8,
              right: TERMINUS_W - 10,
              top: 13,
              backgroundImage: RAIL_DOTS_ACROSS,
            }}
          />

          <div className="lg:flex lg:items-start">
            <ol className="grid gap-9 lg:min-w-0 lg:flex-1 lg:auto-cols-fr lg:grid-flow-col lg:gap-x-8 lg:gap-y-0">
              {STEPS.map((step) => (
                <li
                  key={step.title}
                  className="relative grid grid-cols-[28px_1fr] gap-x-4 lg:block"
                >
                  {/* the route runs on to the next waypoint (and the star) */}
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-[30px] left-[13px] top-[30px] w-[2px] lg:hidden"
                    style={{ backgroundImage: RAIL_DOTS }}
                  />
                  <div className="flex h-7 items-center justify-center lg:justify-start">
                    <WaypointGlyph size={16} />
                  </div>
                  <div className="lg:mt-5 lg:pr-8">
                    <h3 className="text-h3">{step.title}</h3>
                    <p className="mt-1 text-[0.9375rem] text-moonlight">
                      {step.line}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/* the terminus — `w-44` is TERMINUS_W, the rail's right anchor */}
            <div className="mt-9 grid grid-cols-[28px_1fr] items-center gap-x-4 lg:mt-0 lg:block lg:w-44 lg:shrink-0">
              <div className="flex justify-center lg:h-7 lg:items-center lg:justify-start">
                <NorthStarGlyph size={20} />
              </div>
              <span className="mono-label text-gold lg:mt-5 lg:block">
                Your north star
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
