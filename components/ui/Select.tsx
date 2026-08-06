import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { CONTROL_CLASSES } from "./Input";

export interface SelectProps extends React.ComponentPropsWithRef<"select"> {
  /** Ember border + aria-invalid. Pair with Field's `error`. */
  invalid?: boolean;
  /** Classes for the relative wrapper span (layout width lives here). */
  wrapperClassName?: string;
}

/** Native select on the night ground, drawn chevron. */
export function Select({
  invalid,
  className,
  wrapperClassName,
  children,
  ...rest
}: SelectProps) {
  return (
    <span className={cn("relative block", wrapperClassName)}>
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          CONTROL_CLASSES,
          "appearance-none pr-10",
          invalid && "border-ember/70",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={1.5}
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-moonlight"
      />
    </span>
  );
}
