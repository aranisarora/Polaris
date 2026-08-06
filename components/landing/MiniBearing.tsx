import * as React from "react";
import type { Tier } from "@/lib/types";
import {
  ChartFrame,
  NorthStarGlyph,
  TierStar,
  WaypointGlyph,
} from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Show, don't claim: the product's reality-check moment rebuilt as a real
 * component. Three tiered rows — the dream pinned at the top, honest — joined
 * by a dotted route. Content is a clearly-labeled specimen (generic job
 * titles only); the copy says so.
 */

const RAIL_DOTS =
  "repeating-linear-gradient(to bottom, color-mix(in srgb, var(--color-gold) 55%, transparent) 0 2px, transparent 2px 8px)";

interface SpecimenRow {
  title: string;
  tier: Tier;
  readout: string;
  reasoning: string;
  pinned?: boolean;
}

const ROWS: readonly SpecimenRow[] = [
  {
    title: "Design Director",
    tier: "stretch",
    readout: "PINNED · 3 OF 7 REQUIREMENTS",
    reasoning:
      "The honest read: you hold 3 of 7 requirements today — a distance, not a verdict. The rows below build the other four.",
    pinned: true,
  },
  {
    title: "Senior Product Designer",
    tier: "attainable",
    readout: "5 OF 6 REQUIREMENTS",
    reasoning:
      "One design-system credit short — and it's exactly the experience the dream above asks for.",
  },
  {
    title: "Product Designer",
    tier: "ready",
    readout: "6 OF 6 REQUIREMENTS",
    reasoning: "Every requirement met. You could apply this week.",
  },
];

function RowGlyph({ row }: { row: SpecimenRow }) {
  if (row.pinned) return <NorthStarGlyph size={22} />;
  if (row.tier === "ready") {
    return (
      <WaypointGlyph size={16} state="current" color="var(--color-aurora)" />
    );
  }
  return <WaypointGlyph size={16} />;
}

export function MiniBearing() {
  return (
    <section aria-labelledby="bearing-heading" className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <h2 id="bearing-heading" className="text-h1">
            Where you stand, without flattery.
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-moonlight">
            Your dream stays pinned at the top of the chart — tiered honestly,
            never hidden. Jobs like these build the experience your dream
            requires.
          </p>
        </div>

        <ChartFrame
          topLeft="SPECIMEN BEARING"
          bottomRight="3 MARKS PLOTTED"
          className="mt-10"
          contentClassName="px-5 py-10 sm:px-8"
        >
          <ul className="grid gap-8">
            {ROWS.map((row, i) => (
              <li
                key={row.title}
                className="relative grid grid-cols-[28px_1fr] gap-x-4"
              >
                {/* route segment down to the next mark */}
                {i < ROWS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-[26px] left-[13px] top-[30px] w-[2px]"
                    style={{ backgroundImage: RAIL_DOTS }}
                  />
                )}
                <div className="flex h-7 items-center justify-center">
                  <RowGlyph row={row} />
                </div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-medium text-starlight">{row.title}</p>
                    <TierStar tier={row.tier} />
                  </div>
                  <p
                    className={cn(
                      "mono-label mt-1.5",
                      row.pinned ? "text-gold" : "text-moonlight",
                    )}
                  >
                    {row.readout}
                  </p>
                  <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-moonlight">
                    {row.reasoning}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </ChartFrame>

        <p className="mt-4 text-center text-sm text-moonlight/80">
          A specimen bearing. Yours is drawn from your own words and live
          postings.
        </p>
      </div>
    </section>
  );
}
