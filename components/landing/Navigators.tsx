import * as React from "react";
import { ChartFrame, EmptyState } from "@/components/ui";
import { ChartBackdrop } from "./ChartBackdrop";

/**
 * Social proof, honestly empty — Polaris is pre-launch and invents nothing.
 *
 * This slot used to ship three greeked panels: soft rounded rectangles
 * standing in for content the product does not have. That is a placeholder,
 * not a design, and it was going out on paid traffic. The world already owns
 * the right device for "there is nothing here yet" — the EmptyState's compass
 * rose and one honest line — set inside a chart frame whose corner readout
 * counts the routes that exist: zero.
 */
export function Navigators() {
  return (
    <section
      aria-labelledby="navigators-heading"
      className="relative px-6 py-16 md:py-24"
    >
      <ChartBackdrop seed={0x5c31a7} stars={16} />
      <div className="relative mx-auto max-w-2xl md:max-w-3xl">
        <h2 id="navigators-heading" className="text-center text-h1">
          Navigators
        </h2>

        <ChartFrame
          topLeft="NAVIGATORS LOG"
          bottomRight="0 ROUTES PLOTTED"
          className="mt-10"
          contentClassName="p-0"
        >
          <EmptyState
            title="No courses logged yet."
            body="Polaris has only just opened. When the first navigators reach the star they named, their routes are recorded here — until then this space stays empty rather than invented."
          />
        </ChartFrame>
      </div>
    </section>
  );
}
