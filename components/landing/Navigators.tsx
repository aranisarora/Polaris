import * as React from "react";
import { Panel } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Social proof, structure only — Polaris is pre-launch and invents nothing.
 * Three quote frames greeked with CSS bars, and one mono line that says
 * plainly what this space is waiting for.
 */

const GREEK_WIDTHS: readonly (readonly [string, string, string])[] = [
  ["w-full", "w-10/12", "w-3/5"],
  ["w-11/12", "w-full", "w-1/2"],
  ["w-full", "w-9/12", "w-2/3"],
];

export function Navigators() {
  return (
    <section aria-labelledby="navigators-heading" className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <h2 id="navigators-heading" className="text-center text-h1">
          Navigators
        </h2>

        <div aria-hidden="true" className="mt-10 grid gap-4 sm:grid-cols-3">
          {GREEK_WIDTHS.map((widths, i) => (
            <Panel key={i} className="select-none">
              <div className="grid gap-2.5">
                {widths.map((w, j) => (
                  <div
                    key={j}
                    className={cn("h-2.5 rounded-full bg-veil/70", w)}
                  />
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full border bg-veil/70" />
                <div className="grid gap-1.5">
                  <div className="h-2.5 w-24 rounded-full bg-veil/70" />
                  <div className="h-2 w-16 rounded-full bg-veil/50" />
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <p className="mono-label mt-8 text-center text-moonlight">
          AWAITING TRANSMISSIONS
        </p>
      </div>
    </section>
  );
}
