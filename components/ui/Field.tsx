import * as React from "react";
import { cn } from "@/lib/cn";

export interface FieldProps {
  label: string;
  /** id of the control inside — keeps the label attached. */
  htmlFor?: string;
  /** Quiet guidance under the control. Replaced by `error` when set. */
  help?: string;
  /** Names the problem, in ember. Announced via role="alert". */
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label sits 6px above its control; help/error slot below. */
export function Field({
  label,
  htmlFor,
  help,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 text-sm font-medium text-starlight"
      >
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-gold">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-ember">
          {error}
        </p>
      ) : help ? (
        <p className="mt-1.5 text-sm text-moonlight">{help}</p>
      ) : null}
    </div>
  );
}
