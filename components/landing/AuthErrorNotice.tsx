"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function Notice() {
  const failed = useSearchParams().getAll("auth_error").includes("1");
  if (!failed) return null;

  return (
    <p role="alert" className="mb-6 text-sm text-ember">
      Google sign-in didn&apos;t complete. Nothing was lost — try again when
      you&apos;re ready.
    </p>
  );
}

/**
 * The quiet notice for a Google sign-in that didn't complete
 * (`/auth/callback` bounces failures back to `/?auth_error=1`).
 *
 * It reads the query string on the client on purpose: `searchParams` in the
 * page would make the whole landing render on demand, and this page is
 * statically prerendered (docs/SPEC.md — "Static (no Supabase on first
 * paint)"). The Suspense boundary keeps that bail-out local — the landing
 * prerenders with nothing here, and the notice appears on hydration for the
 * few visitors who actually came back from a failed sign-in. That is also
 * when a `role="alert"` is announced.
 */
export function AuthErrorNotice() {
  return (
    <Suspense fallback={null}>
      <Notice />
    </Suspense>
  );
}
