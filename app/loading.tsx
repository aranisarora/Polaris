import { CompassSpinner } from "@/components/ui/CompassSpinner";

export default function Loading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <CompassSpinner size={48} label="Loading" />
      <p aria-hidden className="mono-label text-moonlight">
        Charting
      </p>
    </main>
  );
}
