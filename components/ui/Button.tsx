import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { CompassSpinner } from "./CompassSpinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "md" | "lg";

const BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gold text-night hover:bg-gold-bright active:bg-gold-deep active:text-starlight",
  secondary:
    "border border-starlight/25 text-starlight hover:bg-veil/40 active:bg-veil/60",
  ghost: "text-moonlight hover:bg-veil/30 hover:text-starlight active:bg-veil/50",
  destructive: "bg-ember text-night hover:brightness-110 active:brightness-90",
};

const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-[0.9375rem]", // 44px floor
  lg: "min-h-13 px-7 text-base", // 52px
};

/** Compose the button classes without the element — for rare custom hosts. */
export function buttonClasses(
  opts: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {},
): string {
  const { variant = "primary", size = "md", className } = opts;
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export interface ButtonProps extends React.ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders an inline CompassSpinner and disables the button. */
  loading?: boolean;
}

/** One primary (gold) CTA per screen. Default `type="button"`. */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...rest}
    >
      {loading && <CompassSpinner size={16} label="" className="-ml-1 text-current" />}
      {children}
    </button>
  );
}

export interface LinkButtonProps
  extends React.ComponentPropsWithRef<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** A next/link styled exactly like Button — for navigation CTAs. */
export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      className={buttonClasses({
        variant,
        size,
        className: typeof className === "string" ? className : undefined,
      })}
      {...rest}
    />
  );
}
