"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/** Retry for server-side load failures: re-renders the route's server tree. */
export function RefreshButton({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <Button loading={pending} onClick={() => startTransition(() => router.refresh())}>
      {children}
    </Button>
  );
}
