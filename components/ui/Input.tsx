import * as React from "react";
import { cn } from "@/lib/cn";

/** Shared control styling for Input / Textarea / Select. */
export const CONTROL_CLASSES =
  "w-full min-h-11 rounded-lg border bg-depth px-3.5 text-base text-starlight placeholder:text-faint transition-colors duration-150 hover:border-hairline-strong focus:border-astral/60";

export interface InputProps extends React.ComponentPropsWithRef<"input"> {
  /** Ember border + aria-invalid. Pair with Field's `error`. */
  invalid?: boolean;
}

export function Input({ invalid, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_CLASSES, invalid && "border-ember/70", className)}
      {...rest}
    />
  );
}
