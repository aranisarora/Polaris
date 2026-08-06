import * as React from "react";
import { Skeleton } from "@/components/ui";

/**
 * Placeholder JobRow while postings load or await classification.
 * Rendered inside a <ul> whose container carries aria-busy.
 */
export function JobRowSkeleton() {
  return (
    <li aria-hidden="true" className="rounded-xl border bg-depth p-4 shadow-panel md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3.5 w-2/5" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="mt-3 h-3.5 w-5/6" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
    </li>
  );
}
