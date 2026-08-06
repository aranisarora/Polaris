import * as React from "react";
import type { Tier } from "@/lib/types";
import {
  ChartFrame,
  NorthStarGlyph,
  TierStar,
  WaypointGlyph,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { ChartBackdrop } from "./ChartBackdrop";

/**
 * Show, don't claim: the product's reality-check moment rebuilt as a real
 * component. Three tiered rows — the dream pinned at the top, honest — joined
 * by a dotted route. Content is a clearly-labeled specimen (generic job
 * titles only); the copy says so.
 *
 * From `md` up the frame widens to the page measure and each row splits into
 * three instrument columns — mark, name + readout, honest read — so the
 * bearing holds the desktop frame instead of sitting as a phone card in the
 * middle of it. Below `md` the rows stay exactly as they were: one stacked
 * column beside the route.
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
    <section
      aria-labelledby="bearing-heading"
      className="relative px-6 py-16 md:py-24"
    >
      <ChartBackdrop seed={0x2b8e41} stars={20} />
      <div className="relative mx-auto max-w-2xl md:max-w-5xl">
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
          grid
          topLeft="SPECIMEN BEARING"
          bottomRight="3 MARKS PLOTTED"
          className="mt-10"
          contentClassName="px-5 py-10 sm:px-8 md:px-10 md:py-12"
        >
          <ul className="grid gap-8 md:gap-10">
            {ROWS.map((row, i) => (
              <li
                key={row.title}
                className="relative grid grid-cols-[28px_1fr] gap-x-4 md:grid-cols-[28px_minmax(0,19rem)_minmax(0,1fr)] md:gap-x-8"
              >
                {/* route segment down to the next mark */}
                {i < ROWS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-[26px] left-[13px] top-[30px] w-[2px] md:-bottom-[34px]"
                    style={{ backgroundImage: RAIL_DOTS }}
                  />
                )}
                <div className="col-start-1 row-start-1 flex h-7 items-center justify-center">
                  <RowGlyph row={row} />
                </div>
                <div className="col-start-2 row-start-1">
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
                </div>
                <p className="col-start-2 row-start-2 mt-1.5 max-w-[52ch] text-sm leading-relaxed text-moonlight md:col-start-3 md:row-start-1 md:mt-0 md:self-center">
                  {row.reasoning}
                </p>
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
