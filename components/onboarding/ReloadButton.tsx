"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/** Retry for a failed server read — re-fetches the page's server data. */
export function ReloadButton({
  children = "Try again",
}: {
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      loading={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {children}
    </Button>
  );
}
