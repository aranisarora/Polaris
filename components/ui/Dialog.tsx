"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";

export interface DialogProps {
  open: boolean;
  /** Called on Escape, backdrop click, and the close button. */
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  /** Action row, right-aligned under the content. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Centered modal on the native <dialog> element: focus trap, Escape and
 * aria-modal come from the platform. Hairline border on a depth surface,
 * quiet 400ms entry. Body scroll locks via globals.css.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto max-h-[85dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-2xl border border-hairline-strong bg-depth p-0 text-starlight shadow-raised open:animate-fade-up",
        className,
      )}
    >
      <div className="flex flex-col gap-3 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-h3 text-starlight">
            {title}
          </h2>
          <IconButton
            aria-label="Close"
            onClick={onClose}
            className="-mr-3 -mt-3"
          >
            <X size={18} strokeWidth={1.5} aria-hidden />
          </IconButton>
        </div>
        {description && (
          <p id={descriptionId} className="text-sm text-moonlight">
            {description}
          </p>
        )}
        {children}
        {footer && (
          <div className="mt-2 flex flex-wrap justify-end gap-3">{footer}</div>
        )}
      </div>
    </dialog>
  );
}
