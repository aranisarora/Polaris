"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { LockedTarget, Roadmap } from "@/lib/types";
import { GenerationMoment } from "./GenerationMoment";
import { RoadmapView } from "./RoadmapView";

/**
 * Switches between the generation moment (no route drawn yet for the
 * active target) and the roadmap view. When generation finishes, the
 * handover happens client-side so the route draw-in plays without a
 * reload; router.refresh() re-syncs the server tree in the background.
 */

export interface RoadmapScreenProps {
  target: LockedTarget;
  initialRoadmap: Roadmap | null;
}

export function RoadmapScreen({ target, initialRoadmap }: RoadmapScreenProps) {
  const router = useRouter();
  const [roadmap, setRoadmap] = React.useState<Roadmap | null>(initialRoadmap);
  const [reveal, setReveal] = React.useState(false);

  const handleComplete = React.useCallback(
    (generated: Roadmap) => {
      setRoadmap(generated);
      setReveal(true);
      router.refresh();
    },
    [router],
  );

  if (!roadmap) {
    return <GenerationMoment target={target} onComplete={handleComplete} />;
  }

  return (
    <RoadmapView key={roadmap.id} target={target} roadmap={roadmap} reveal={reveal} />
  );
}
