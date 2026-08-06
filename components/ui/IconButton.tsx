import * as React from "react";
import { cn } from "@/lib/cn";

export interface IconButtonProps extends React.ComponentPropsWithRef<"button"> {
  /** Required — icon-only controls must name their action. */
  "aria-label": string;
  variant?: "ghost" | "secondary";
}

/** 44×44px icon-only button. Default `type="button"`. */
export function IconButton({
  variant = "ghost",
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55",
        variant === "ghost"
          ? "text-moonlight hover:bg-veil/30 hover:text-starlight active:bg-veil/50"
          : "border border-starlight/25 text-starlight hover:bg-veil/40 active:bg-veil/60",
        className,
      )}
      {...rest}
    />
  );
}
