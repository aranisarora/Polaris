import * as React from "react";
import { cn } from "@/lib/cn";

export interface PanelProps extends React.ComponentPropsWithRef<"div"> {
  padding?: "none" | "md" | "lg";
}

/** Raised surface: depth ground, 1px hairline, offset+blur shadow. */
export function Panel({ padding = "md", className, ...rest }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-depth shadow-panel",
        padding === "md" && "p-5",
        padding === "lg" && "p-6 md:p-8",
        className,
      )}
      {...rest}
    />
  );
}
