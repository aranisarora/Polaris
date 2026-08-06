import * as React from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ErrorStateProps {
  /** Names the problem — "The bearing couldn't be taken." */
  title: string;
  /** Names the recovery, or what was preserved. */
  detail?: string;
  /** Retry slot — pass a wired Button. */
  action?: React.ReactNode;
  className?: string;
}

/** Error surface: problem named, recovery offered. role="alert". */
export function ErrorState({ title, detail, action, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border border-ember/40 bg-depth p-5 shadow-panel",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <CircleAlert
          size={20}
          strokeWidth={1.5}
          aria-hidden
          className="shrink-0 text-ember"
        />
        <p className="font-medium text-starlight">{title}</p>
      </div>
      {detail && <p className="text-sm text-moonlight">{detail}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
