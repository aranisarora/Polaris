"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { StarGlyph } from "./glyphs";

export interface ViewSwitchOption<T extends string = string> {
  value: T;
  /** The literal name of the view — "This week", "Whole plan". */
  label: string;
  /** id given to this tab button; its panel names itself with aria-labelledby. */
  tabId: string;
  /** id of the tabpanel this tab controls. */
  panelId: string;
}

export interface ViewSwitchProps<T extends string = string> {
  /** Accessible name for the tablist — what is being switched. */
  label: string;
  value: T;
  onChange: (value: T) => void;
  /** Exactly two. This is a segmented control, not a tab bar. */
  options: readonly [ViewSwitchOption<T>, ViewSwitchOption<T>];
  className?: string;
}

/**
 * Two-segment view switch: a real tablist with roving tabindex and
 * left/right arrow keys, wearing the segmented-control treatment the tier
 * switcher already ships (components/bearing/TierGroups.tsx) — a depth panel
 * holding the segments, moonlight at rest, a solid veil fill with starlight
 * text when selected.
 *
 * The fill IS the selection, so the label is not also recoloured: gold text
 * on a filled segment would mark the same state twice and invent a third
 * vocabulary between this control and the tier switcher a tap away. Gold
 * stays where it means something on its own — the leading star, which is the
 * nav's mark for "you are here" and reads at a glance without carrying the
 * whole burden.
 *
 * The panels belong to the caller — pass each option the id of the panel it
 * controls, and give that panel `aria-labelledby={tabId}` and `hidden` when
 * it is not the selected view.
 *
 * Selection follows focus, which is the standard tablist behaviour and is
 * correct here because both views are already rendered: moving between them
 * costs nothing.
 */
export function ViewSwitch<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: ViewSwitchProps<T>) {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  function onTabKeyDown(event: React.KeyboardEvent, index: number) {
    const dir = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (dir === 0) return;
    event.preventDefault();
    const next = (index + dir + options.length) % options.length;
    onChange(options[next].value);
    tabRefs.current[next]?.focus();
  }

  return (
    // Full-width on a phone so both halves are thumb-sized, and only as wide
    // as its labels from sm up — a two-item control stretched across a desktop
    // column reads as a toolbar rather than a choice.
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "grid w-full grid-cols-2 gap-1 rounded-xl border bg-depth p-1 sm:w-fit",
        className,
      )}
    >
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={option.tabId}
            aria-selected={selected}
            aria-controls={option.panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onTabKeyDown(event, i)}
            className={cn(
              "mono-label flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 transition-colors duration-150",
              selected ? "bg-veil text-starlight" : "text-moonlight hover:text-starlight",
            )}
          >
            {/* The star holds its space in both states so the label never
                shifts sideways as the selection moves. Its gold is set
                explicitly rather than inherited — the label is starlight. */}
            <StarGlyph
              size={9}
              color="var(--color-gold)"
              className={cn(
                "shrink-0 transition-opacity duration-150",
                selected ? "opacity-100" : "opacity-0",
              )}
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
