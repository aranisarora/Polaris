import * as React from "react";
import { cn } from "@/lib/cn";
import { CompassRose } from "./glyphs";

export interface EmptyStateProps {
  title: string;
  body?: string;
  /** Usually one Button or LinkButton pointing at the next action. */
  action?: React.ReactNode;
  className?: string;
}

/** Quiet compass rose, one line of copy, one way forward. */
export function EmptyState({ title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 px-6 py-14 text-center",
        className,
      )}
    >
      <CompassRose size={64} className="text-moonlight/50" />
      <div className="flex max-w-md flex-col gap-1">
        <h3 className="font-display text-h3 text-starlight">{title}</h3>
        {body && <p className="text-sm text-moonlight">{body}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
