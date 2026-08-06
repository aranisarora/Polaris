import { Skeleton } from "@/components/ui";

/** Roadmap skeleton — header, progress route, destination row, chart + waypoints. */
export default function RoadmapLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-6">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-7 w-full" />
      </div>

      <Skeleton className="h-[76px] w-full rounded-xl" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
