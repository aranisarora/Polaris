"use client";

import * as React from "react";
import type { ClassifiedJob, Tier } from "@/lib/types";
import { cn } from "@/lib/cn";
import { StarGlyph, TIER_COLOR } from "@/components/ui";
import { TIER_FRAMING, TIER_SHORT, tierEmptyLine } from "./assessments";
import { JobRow } from "./JobRow";

const TIER_ORDER: readonly Tier[] = ["ready", "attainable", "stretch"];

export interface TierGroupsProps {
  jobs: ClassifiedJob[];
  /** Posting id of the currently locked target, if any. */
  lockedPostingId: string | null;
  /** Assessment id currently locking (pending state). */
  lockPendingId: string | null;
  onLock: (job: ClassifiedJob) => void;
}

/**
 * Segmented control over the three tiers — counts in mono, one line of
 * trajectory framing per group, ONE recommended row highlighted per tier.
 */
export function TierGroups({ jobs, lockedPostingId, lockPendingId, onLock }: TierGroupsProps) {
  const [active, setActive] = React.useState<Tier>(
    () => TIER_ORDER.find((t) => jobs.some((j) => j.tier === t)) ?? "ready",
  );
  const baseId = React.useId();
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const groups = React.useMemo(() => {
    const map: Record<Tier, ClassifiedJob[]> = { ready: [], attainable: [], stretch: [] };
    for (const job of jobs) map[job.tier].push(job);
    for (const tier of TIER_ORDER) {
      map[tier].sort(
        (a, b) =>
          Number(b.recommended) - Number(a.recommended) ||
          b.matchScore - a.matchScore ||
          a.posting.title.localeCompare(b.posting.title),
      );
    }
    return map;
  }, [jobs]);

  const counts = React.useMemo(
    () => ({
      ready: groups.ready.length,
      attainable: groups.attainable.length,
      stretch: groups.stretch.length,
    }),
    [groups],
  );

  function onTabKeyDown(event: React.KeyboardEvent, index: number) {
    const dir = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (dir === 0) return;
    event.preventDefault();
    const next = (index + dir + TIER_ORDER.length) % TIER_ORDER.length;
    setActive(TIER_ORDER[next]);
    tabRefs.current[next]?.focus();
  }

  return (
    <section aria-label="Classified postings" className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Tier"
        className="grid grid-cols-3 gap-1 rounded-xl border bg-depth p-1"
      >
        {TIER_ORDER.map((tier, i) => {
          const selected = tier === active;
          return (
            <button
              key={tier}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tier}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tier}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tier)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-2 transition-colors duration-150",
                selected
                  ? "bg-veil text-starlight"
                  : "text-moonlight hover:text-starlight",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <StarGlyph size={9} color={TIER_COLOR[tier]} />
                {TIER_SHORT[tier]}
              </span>
              <span className="mono-label">{groups[tier].length}</span>
            </button>
          );
        })}
      </div>

      {TIER_ORDER.map((tier) => (
        <div
          key={tier}
          role="tabpanel"
          id={`${baseId}-panel-${tier}`}
          aria-labelledby={`${baseId}-tab-${tier}`}
          hidden={tier !== active}
          className="flex flex-col gap-3"
        >
          <p className="max-w-[70ch] text-sm text-moonlight">{TIER_FRAMING[tier]}</p>
          {groups[tier].length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-depth px-6 py-10 text-center">
              <span className="mono-label text-moonlight">0 postings at this tier</span>
              <p className="max-w-md text-sm text-moonlight">
                {tierEmptyLine(tier, counts)}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {groups[tier].map((job) => (
                <JobRow
                  key={job.posting.id}
                  job={job}
                  isCurrentDestination={
                    lockedPostingId !== null && lockedPostingId === job.posting.id
                  }
                  lockPending={lockPendingId === job.id}
                  onLock={onLock}
                  primaryLock={job.recommended}
                />
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
