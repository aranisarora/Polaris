import * as React from "react";
import { NorthStarGlyph, WaypointGlyph } from "@/components/ui";

/**
 * Exactly three steps, one line each, set as waypoints on a vertical route
 * that ends at the north star. No icon-card grid.
 */

const RAIL_DOTS =
  "repeating-linear-gradient(to bottom, color-mix(in srgb, var(--color-gold) 55%, transparent) 0 2px, transparent 2px 8px)";

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
    <section aria-labelledby="how-heading" className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-xl">
        <h2 id="how-heading" className="text-center text-h1">
          How it works
        </h2>

        <div className="mx-auto mt-10 max-w-md">
          <ol className="grid gap-9">
            {STEPS.map((step) => (
              <li
                key={step.title}
                className="relative grid grid-cols-[28px_1fr] gap-x-4"
              >
                {/* the route runs on to the next waypoint (and the star) */}
                <div
                  aria-hidden="true"
                  className="absolute -bottom-[30px] left-[13px] top-[30px] w-[2px]"
                  style={{ backgroundImage: RAIL_DOTS }}
                />
                <div className="flex h-7 items-center justify-center">
                  <WaypointGlyph size={16} />
                </div>
                <div>
                  <h3 className="text-h3">{step.title}</h3>
                  <p className="mt-1 text-[0.9375rem] text-moonlight">
                    {step.line}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-9 grid grid-cols-[28px_1fr] items-center gap-x-4">
            <div className="flex justify-center">
              <NorthStarGlyph size={20} />
            </div>
            <span className="mono-label text-gold">Your north star</span>
          </div>
        </div>
      </div>
    </section>
  );
}
