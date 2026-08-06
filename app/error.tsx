"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <CircleAlert
        size={40}
        strokeWidth={1.5}
        aria-hidden
        className="text-ember"
      />
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-display text-h1 text-starlight">
          The chart couldn&apos;t be drawn
        </h1>
        <p className="text-moonlight">
          Something went wrong while loading this view. Your progress is saved
          — nothing is lost.
        </p>
        {error.digest && (
          <p className="mono-label text-moonlight/70">Ref {error.digest}</p>
        )}
      </div>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
