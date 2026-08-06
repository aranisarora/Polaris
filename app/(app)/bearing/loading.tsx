import { Skeleton } from "@/components/ui";
import { JobRowSkeleton } from "@/components/bearing/JobRowSkeleton";

/** Route-level skeleton for /bearing — header, pinned dream, rows. */
export default function BearingLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* pinned dream card */}
      <div className="rounded-xl border border-hairline-strong bg-depth p-5 shadow-panel md:p-6">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="mt-4 h-4 w-4/5" />
        <Skeleton className="mt-2 h-4 w-3/5" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        <JobRowSkeleton />
        <JobRowSkeleton />
        <JobRowSkeleton />
        <JobRowSkeleton />
      </ul>
    </div>
  );
}
