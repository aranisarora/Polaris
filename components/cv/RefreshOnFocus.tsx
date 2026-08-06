"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

const MIN_INTERVAL_MS = 10_000;

/**
 * Keeps the living CV honest without sockets: when the tab regains focus
 * (e.g. after toggling tasks on the roadmap in another view), re-fetch
 * server data so completed lines un-grey. Throttled; renders nothing.
 */
export function RefreshOnFocus() {
  const router = useRouter();
  const lastRefresh = React.useRef(0);

  React.useEffect(() => {
    function refresh() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefresh.current < MIN_INTERVAL_MS) return;
      lastRefresh.current = now;
      router.refresh();
    }

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return null;
}
