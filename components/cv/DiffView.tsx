"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Panel, StarGlyph } from "@/components/ui";
import type { CVBasics, CVLine } from "@/lib/types";

/**
 * The living diff: the target-state CV. Earned lines in starlight; unearned
 * lines greyed at 40% with a mono tag naming the task that unlocks them
 * (linked to the roadmap). When a task completes and fresh server data
 * arrives, the line un-greys in place — a 400ms starlight fade with a brief
 * gold tick (the surface's one signature motion, per docs/DIRECTION.md).
 */

export interface DiffLineItem {
  section: CVLine["section"];
  text: string;
  earned: boolean;
  taskId: string | null;
  taskTitle: string | null;
  kind: "entry" | "detail";
}

const SECTIONS: ReadonlyArray<[CVLine["section"], string]> = [
  ["experience", "Experience"],
  ["projects", "Projects"],
  ["skills", "Skills"],
  ["education", "Education"],
];

export function DiffView({
  basics,
  lines,
}: {
  basics: CVBasics;
  lines: DiffLineItem[];
}) {
  const contact = [
    basics.email,
    basics.phone,
    basics.location,
    ...(basics.links ?? []),
  ].filter((part): part is string => Boolean(part && part.trim()));

  const hasBasics =
    Boolean(basics.name?.trim()) ||
    Boolean(basics.headline?.trim()) ||
    contact.length > 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {hasBasics && (
        <Panel padding="lg">
          {basics.name?.trim() && (
            <h2 className="min-w-0 break-words font-display text-h2 text-starlight [overflow-wrap:anywhere]">
              {basics.name}
            </h2>
          )}
          {basics.headline?.trim() && (
            <p className="mt-1 text-moonlight">{basics.headline}</p>
          )}
          {contact.length > 0 && (
            <p className="mono-label mt-4 flex flex-wrap gap-x-4 gap-y-1 text-moonlight">
              {contact.map((part) => (
                <span key={part} className="break-all">
                  {part}
                </span>
              ))}
            </p>
          )}
        </Panel>
      )}

      {SECTIONS.map(([section, title]) => {
        const sectionLines = lines.filter((line) => line.section === section);
        if (sectionLines.length === 0) return null;
        const earnedCount = sectionLines.filter((line) => line.earned).length;

        return (
          <Panel key={section} padding="lg">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-h3 text-starlight">{title}</h2>
              {earnedCount < sectionLines.length && (
                <span className="mono-label shrink-0 text-moonlight">
                  {earnedCount} of {sectionLines.length} earned
                </span>
              )}
            </div>
            <ul className="mt-3 divide-y">
              {sectionLines.map((line, index) => (
                // Task lines key on taskId so the un-grey animation survives
                // refreshes; static CV lines key on position + text.
                <DiffLine
                  key={line.taskId ?? `${line.section}:${index}:${line.text}`}
                  line={line}
                />
              ))}
            </ul>
          </Panel>
        );
      })}
    </div>
  );
}

function DiffLine({ line }: { line: DiffLineItem }) {
  const [justEarned, setJustEarned] = React.useState(false);
  const prevEarned = React.useRef(line.earned);

  React.useEffect(() => {
    const flipped = !prevEarned.current && line.earned;
    prevEarned.current = line.earned;
    if (flipped) {
      setJustEarned(true);
      const timer = setTimeout(() => setJustEarned(false), 1400);
      return () => clearTimeout(timer);
    }
  }, [line.earned]);

  const earnedByTask = line.earned && line.taskId != null;

  return (
    <li className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
      <span className="w-3.5 shrink-0 self-baseline pt-1" aria-hidden>
        {earnedByTask && (
          <StarGlyph
            size={11}
            className={cn(
              "text-gold-bright",
              justEarned && "animate-waypoint-flare",
            )}
          />
        )}
      </span>

      <span
        className={cn(
          // A readable floor for the line itself: below it the row wraps and
          // the task tag drops to its own line, rather than the tag squeezing
          // the CV line into one word per row on a phone.
          "min-w-40 flex-1 text-[0.9375rem] text-starlight transition-opacity duration-[400ms] ease-out-expo",
          line.kind === "entry" && "font-medium",
          !line.earned && "opacity-40",
        )}
      >
        {!line.earned && <span className="sr-only">Not yet earned. </span>}
        {line.text}
      </span>

      {!line.earned && line.taskId && (
        <Link
          href={`/roadmap#task-${line.taskId}`}
          aria-label={
            line.taskTitle
              ? `Unlocked by ${line.taskTitle} — view it on your roadmap`
              : "View the unlocking task on your roadmap"
          }
          className="mono-label inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md text-gold transition-colors duration-150 hover:text-gold-bright"
        >
          <StarGlyph size={9} filled={false} />
          <span className="max-w-48 truncate">
            {line.taskTitle ?? "View task"}
          </span>
        </Link>
      )}

      {justEarned && (
        <span role="status" className="sr-only">
          Line earned
        </span>
      )}
    </li>
  );
}
