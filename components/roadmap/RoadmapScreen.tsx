"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { LockedTarget, Roadmap, Tier } from "@/lib/types";
import { GenerationMoment } from "./GenerationMoment";
import { RoadmapView } from "./RoadmapView";

/**
 * Switches between the generation moment (no route drawn yet for the
 * active target) and the roadmap view. When generation finishes, the
 * handover happens client-side so the route draw-in plays without a
 * reload; router.refresh() re-syncs the server tree in the background.
 *
 * It also owns the clock. lib/schedule.ts, the chart and both plan views all
 * take `today` as a value and never read it — that is what makes the dates
 * testable, and what keeps a server render and its hydration from disagreeing
 * about what week it is. This is the one place the day is resolved: page.tsx
 * supplies the server's day for the first paint, and the browser's own day
 * takes over on mount.
 */

export interface RoadmapScreenProps {
  target: LockedTarget;
  initialRoadmap: Roadmap | null;
  /** The target's tier — it preselects the weekly pace. Null when unassessed. */
  tier: Tier | null;
  /** Latest cv_versions.score, so the readiness readout can never decrease. */
  storedScore: number;
  /** The server's calendar day as `YYYY-MM-DD`, resolved in page.tsx. */
  today: string;
}

/** Nothing to watch: the day turns once, and every write re-renders anyway. */
function noSubscription() {
  return () => {};
}

/** Today as a local `YYYY-MM-DD` — never toISOString(), which reads a day west. */
function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * `YYYY-MM-DD` as a LOCAL midnight, mirroring lib/schedule.ts.
 * `new Date("2026-08-24")` parses as UTC and reads as the 23rd everywhere west
 * of Greenwich — the one bug that would misdate the whole plan for US users.
 */
function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function RoadmapScreen({
  target,
  initialRoadmap,
  tier,
  storedScore,
  today: serverDay,
}: RoadmapScreenProps) {
  const router = useRouter();
  const [roadmap, setRoadmap] = React.useState<Roadmap | null>(initialRoadmap);
  const [reveal, setReveal] = React.useState(false);

  /**
   * The server and the browser can sit in different time zones, so calling
   * `new Date()` during render would let SSR and hydration disagree about the
   * calendar day — every US evening, not rarely. useSyncExternalStore is the
   * supported way out (the same pattern as useReducedMotion): React renders
   * the server snapshot on the server AND through hydration, then re-renders
   * with the browser's own day once mounted, with no mismatch to recover from.
   *
   * The server snapshot is the server's real day, resolved in page.tsx and
   * handed down. First paint is therefore already right for anyone sharing
   * the server's zone and at most a day out for anyone else — never "Week 1"
   * for a plan in its ninth week, which is what deriving it from the plan's
   * own start date used to render until hydration.
   */
  const day = React.useSyncExternalStore(noSubscription, todayISO, () => serverDay);
  const today = React.useMemo(() => parseISODate(day) ?? new Date(), [day]);

  const handleComplete = React.useCallback(
    (generated: Roadmap) => {
      setRoadmap(generated);
      setReveal(true);
      router.refresh();
    },
    [router],
  );

  if (!roadmap) {
    return (
      <GenerationMoment
        target={target}
        tier={tier}
        today={day}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <RoadmapView
      key={roadmap.id}
      target={target}
      roadmap={roadmap}
      today={today}
      storedScore={storedScore}
      reveal={reveal}
    />
  );
}
