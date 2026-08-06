import { Skeleton } from "@/components/ui";

/** Profile surface skeleton — mirrors the entry layout, never a blank page. */
export default function ProfileLoading() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-3xl">
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      <div className="mt-10 grid gap-6">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    </div>
  );
}
