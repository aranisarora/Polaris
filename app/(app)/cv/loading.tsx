import { Skeleton } from "@/components/ui";

/** Living-CV skeleton — the page's shape before its data arrives. */
export default function CvLoading() {
  return (
    <div aria-busy="true" className="grid gap-10">
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="grid max-w-xl flex-1 gap-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-2/3 max-w-sm" />
          <Skeleton className="mt-3 h-11 w-44" />
        </div>
        <div className="flex flex-col items-center gap-3 md:shrink-0 md:pr-2">
          <Skeleton className="h-[200px] w-[200px] rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      <div className="grid max-w-3xl gap-5">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
