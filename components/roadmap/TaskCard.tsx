"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, StarGlyph, WaypointGlyph, type WaypointState } from "@/components/ui";
import type { RoadmapTask } from "@/lib/types";

/**
 * One waypoint on the route: title, mono category + effort, the why always
 * visible (verbatim dream quotes rendered in starlight italic), and the
 * done toggle. Completing shows the acknowledgment line — the finished CV
 * line this task just earned.
 */

export interface TaskCardProps {
  task: RoadmapTask;
  /** Waypoint state on the chart — done / current / pending. */
  state: WaypointState;
  /** Toggle request in flight for this task. */
  pending?: boolean;
  /** Ignition flare (just completed). */
  flare?: boolean;
  onToggle: (taskId: string, done: boolean) => void;
}

/**
 * Render the why with the model's double-quoted verbatim fragments (the
 * user's own dream words) in starlight italic — never paraphrased, never
 * flattened. Curly quotes are normalized so both survive.
 */
function renderWhy(why: string): React.ReactNode {
  const normalized = why.replace(/[“”]/g, '"');
  const parts = normalized.split(/"([^"]*)"/g);
  if (parts.length === 1) return normalized;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="italic text-starlight">
        &ldquo;{part}&rdquo;
      </em>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

export function TaskCard({ task, state, pending = false, flare = false, onToggle }: TaskCardProps) {
  return (
    <li
      id={`task-${task.id}`}
      className={cn(
        "scroll-mt-24 rounded-xl border bg-depth p-5 shadow-panel transition-colors duration-400",
        state === "current" && "border-gold/40",
      )}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={cn("mt-1 shrink-0", flare && "animate-waypoint-flare")}
          aria-hidden
        >
          <WaypointGlyph size={16} state={state} />
        </span>

        <div className="min-w-0 flex-1">
          {/* Stable two-column header: the button anchors top-right at every
              title length (long titles wrap within their own column) so the
              action never jumps position between cards. */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h3
                className={cn(
                  "font-sans text-base font-medium leading-snug",
                  task.done ? "text-moonlight" : "text-starlight",
                )}
              >
                {task.title}
              </h3>
              <p className="mono-label mt-1.5 text-moonlight">
                {String(task.position).padStart(2, "0")} · {task.category} · {task.effort}
                {task.firstWeek && <span className="text-gold"> · This week</span>}
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={() => onToggle(task.id, !task.done)}
              loading={pending}
              aria-pressed={task.done}
              aria-label={
                task.done
                  ? `Mark "${task.title}" as not done`
                  : `Mark "${task.title}" as done`
              }
              className={cn(
                "shrink-0",
                task.done && "border-gold/50 text-gold-bright hover:bg-gold/10",
              )}
            >
              {task.done && <Check size={16} strokeWidth={1.5} aria-hidden />}
              {task.done ? "Done" : "Mark as done"}
            </Button>
          </div>

          <p className="mt-3 max-w-prose text-sm leading-relaxed text-moonlight">
            {renderWhy(task.why)}
          </p>

          {task.done && (
            <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-moonlight">
              <StarGlyph size={11} className="mt-1 shrink-0 text-gold-bright" />
              {task.cvLine ? (
                <span>
                  Your CV now carries:{" "}
                  <span className="text-starlight">&ldquo;{task.cvLine.text}&rdquo;</span>
                </span>
              ) : (
                <span>Charted. The route ahead is shorter.</span>
              )}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
