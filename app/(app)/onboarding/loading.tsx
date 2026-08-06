import { Skeleton } from "@/components/ui";

/** Wizard-shaped skeleton while the saved state is read. Never blank. */
export default function OnboardingLoading() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-xl">
      <span className="sr-only">Opening your chart</span>
      {/* progress strip */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-1.5 flex-1 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      {/* the question */}
      <Skeleton className="mt-10 h-9 w-4/5" />
      {/* answer surface */}
      <Skeleton className="mt-6 h-44 w-full" />
      <Skeleton className="mt-3 h-4 w-2/3" />
      {/* action row */}
      <div className="mt-8 flex justify-end">
        <Skeleton className="h-13 w-36 rounded-lg" />
      </div>
    </div>
  );
}
