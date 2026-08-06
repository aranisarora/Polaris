"use client";

import * as React from "react";
import { CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { StarGlyph } from "./glyphs";

export type ToastTone = "default" | "success" | "error";

export interface ToastOptions {
  tone?: ToastTone;
  /** Auto-dismiss delay in ms. Default 4000. */
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/** Fire quiet bottom toasts. Must be used under <ToastProvider> (AppShell provides one). */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

let nextToastId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const timers = React.useRef(
    new Map<number, ReturnType<typeof setTimeout>>(),
  );

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = React.useCallback(
    (message: string, options?: ToastOptions) => {
      const id = nextToastId++;
      setToasts((current) => [
        ...current.slice(-2), // at most 3 on screen
        { id, message, tone: options?.tone ?? "default" },
      ]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), options?.duration ?? 4000),
      );
    },
    [dismiss],
  );

  React.useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-fit max-w-sm items-center gap-2.5 rounded-lg border bg-depth py-2 pl-4 pr-2 shadow-panel",
              "animate-fade-up",
            )}
          >
            {t.tone === "success" && (
              <StarGlyph size={12} className="shrink-0 text-gold-bright" />
            )}
            {t.tone === "error" && (
              <CircleAlert
                size={16}
                strokeWidth={1.5}
                aria-hidden
                className="shrink-0 text-ember"
              />
            )}
            <p className="text-sm text-starlight">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-moonlight transition-colors duration-150 hover:text-starlight"
            >
              <X size={14} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
