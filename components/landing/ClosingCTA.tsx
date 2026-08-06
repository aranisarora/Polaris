import * as React from "react";
import { NorthStarGlyph } from "@/components/ui";
import { ChartBackdrop } from "./ChartBackdrop";
import { SignInButton } from "./SignInButton";

/** The promise restated once, then the same single action. */
export function ClosingCTA() {
  return (
    <section
      aria-labelledby="closing-heading"
      className="relative px-6 pb-24 pt-16 md:pb-32 md:pt-24"
    >
      {/* the sky thickens again as the route reaches its star */}
      <ChartBackdrop seed={0x9d40c2} stars={34} />
      <div className="relative mx-auto flex max-w-xl flex-col items-center text-center md:max-w-2xl">
        <NorthStarGlyph size={30} />
        <h2 id="closing-heading" className="mt-6 text-h1">
          Honest about today. Ambitious about the destination.
        </h2>
        <p className="mt-4 max-w-[46ch] text-moonlight">
          Name where you dream of going — Polaris takes a true bearing and
          draws the route for you alone.
        </p>
        <SignInButton className="mt-8" />
      </div>
    </section>
  );
}
