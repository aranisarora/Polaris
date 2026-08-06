import * as React from "react";
import { cn } from "@/lib/cn";
import { CONTROL_CLASSES } from "./Input";

export interface TextareaProps
  extends React.ComponentPropsWithRef<"textarea"> {
  /** Ember border + aria-invalid. Pair with Field's `error`. */
  invalid?: boolean;
}

export function Textarea({ invalid, className, ...rest }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL_CLASSES,
        "min-h-28 resize-y py-2.5 leading-relaxed",
        invalid && "border-ember/70",
        className,
      )}
      {...rest}
    />
  );
}
