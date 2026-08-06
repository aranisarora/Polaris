"use client";

import { Button, ErrorState } from "@/components/ui";

/** Route-level error boundary for /cv — names the problem, wires recovery. */
export default function CvError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      className="mx-auto mt-16 max-w-md"
      title="Your chart couldn't be read"
      detail="Nothing was lost — your CV and route are safe. Take another look."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
