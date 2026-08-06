import { Skeleton } from "@/components/ui";

/**
 * Roadmap skeleton, shaped like the screen it stands in for: the title, the
 * full-width timeline band, the view switch, and one week of the plan.
 * One column at every width — a skeleton describing a layout the page no
 * longer has would be worse than none.
 *
 * Every height here is measured, not guessed, against the real composition at
 * 375px (RoadmapView's root is gap-5 md:gap-6, so the phone gap is 20px):
 * title 36.8 · band 1+32+120+28+1 = 182 (250 from md) · switch 1+4+44+4+1 = 54 ·
 * the week's one mono line 16.5. A skeleton that reserves more than the page
 * uses snaps the real view upward on mount, which is the shift this file
 * exists to prevent — so being wrong here is worse than being absent.
 */
export default function RoadmapLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5 md:gap-6">
      {/* One row. The header carries the title and nothing else — the readouts
          and the progress bar that used to sit here now read after the plan,
          which is what put the first step row above the fold. */}
      <Skeleton className="h-9 w-44" />

      {/* the timeline band: the frame's own padding plus 120px of chart on a
          phone, 180px from md — wide and short, never a square. */}
      <Skeleton className="h-[182px] w-full rounded-xl md:h-[250px]" />

      {/* the two-segment switch: full width on a phone, its own width above */}
      <Skeleton className="h-[54px] w-full rounded-xl sm:w-60" />

      {/* one week, in the order the panel renders it: the dates and load on a
          single line, the tasks due, then the week's progress beneath them */}
      <div className="flex flex-col gap-5">
        <Skeleton className="h-4 w-64" />
        {/* the open card carries its steps, the one below it stays closed */}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <Skeleton className="h-7 w-full" />
      </div>

      {/* below the plan, where the header's readouts went: the vocabulary line,
          then the pace readout with its Change pace control */}
      <Skeleton className="h-4 w-full max-w-prose" />
      <div className="flex items-center justify-between gap-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>

      {/* the locked destination */}
      <Skeleton className="h-[76px] w-full rounded-xl" />
    </div>
  );
}
