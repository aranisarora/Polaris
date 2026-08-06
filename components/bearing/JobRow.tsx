"use client";

import * as React from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { ClassifiedJob } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Button, StarGlyph, TierStar } from "@/components/ui";
import { formatSalary, providerLabel } from "./helpers";
import { RequirementChips } from "./RequirementChips";

export interface JobRowProps {
  job: ClassifiedJob;
  /** False during the streaming sequence — info only, no actions. */
  actionable?: boolean;
  /** This posting is the currently locked target. */
  isCurrentDestination?: boolean;
  lockPending?: boolean;
  onLock?: (job: ClassifiedJob) => void;
  /** Gold lock button — only the recommended row of the visible tab. */
  primaryLock?: boolean;
  /** Entry animation while classifications stream in. */
  animateIn?: boolean;
  /** Stagger offset in ms (60ms steps within a batch). */
  delayMs?: number;
}

/**
 * One classified posting: title, company, location, salary (mono), TierStar,
 * the why always visible (reasoning + "n of m requirements" with expandable
 * have/missing chips), a quiet source link and the lock action. The one
 * recommended row of a tier carries a gold edge and a mono legend knocked
 * into the hairline above its action — nothing stacked beside the title.
 */
export function JobRow({
  job,
  actionable = true,
  isCurrentDestination = false,
  lockPending = false,
  onLock,
  primaryLock = false,
  animateIn = false,
  delayMs = 0,
}: JobRowProps) {
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();
  const posting = job.posting;
  const salary = formatSalary(posting.salary);
  const total = job.have.length + job.missing.length;
  const company = posting.company.trim() || "Company unlisted";
  const location = posting.location.trim();
  /** The one recommended row of a tier — the signal only exists in the
   *  actionable view, never mid-sequence while classifications stream in. */
  const recommended = job.recommended && actionable;

  return (
    <li
      className={cn(
        "rounded-xl border bg-depth p-4 shadow-panel md:p-5",
        recommended && "border-gold/50",
        animateIn && "animate-fade-up",
      )}
      style={animateIn ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <article>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[1.125rem] leading-snug break-words text-starlight">
              {posting.title}
            </h3>
            {/* Company and location wrap; they are never clipped. The
                separator is bound to the location with a non-breaking space
                so a wrap can't strand it at the end of a line. */}
            <p className="mt-0.5 break-words text-sm text-moonlight [overflow-wrap:anywhere]">
              {company}
              {location ? ` · ${location}` : ""}
            </p>
          </div>
          {/* The tier chip stands alone here. The recommendation reading
              lives down in the requirements strip — a second mono label
              beside the title crowded it off the line on a phone. */}
          <span
            className="inline-flex shrink-0"
            style={
              animateIn
                ? {
                    animation: `waypoint-flare 500ms var(--ease-out-expo) ${delayMs + 160}ms both`,
                  }
                : undefined
            }
          >
            <TierStar tier={job.tier} />
          </span>
        </div>

        {salary && <p className="mono-label mt-2 text-moonlight">{salary}</p>}

        {job.reasoning && (
          <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-moonlight">
            {job.reasoning}
          </p>
        )}

        {total > 0 && (
          <>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
              className="-mx-1 mt-2 flex min-h-11 items-center gap-2 rounded-lg px-1 text-left transition-colors duration-150 hover:bg-veil/20"
            >
              <span className="mono-label text-moonlight">
                {job.have.length} of {total} requirements
              </span>
              <ChevronDown
                size={16}
                strokeWidth={1.5}
                aria-hidden
                className={cn(
                  "text-moonlight transition-transform duration-150",
                  open && "rotate-180",
                )}
              />
            </button>
            <div id={panelId} hidden={!open}>
              <RequirementChips have={job.have} missing={job.missing} className="pt-1" />
            </div>
          </>
        )}

        {actionable && (
          <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            {/* The recommendation reads as a legend knocked into the card's
                own hairline rule, directly over the gold action — a chart
                edge annotation, never a label floating by the title. Once
                this row IS the destination, that reading supersedes it. */}
            {recommended && !isCurrentDestination && (
              <span className="mono-label absolute -top-2 right-0 inline-flex items-center gap-1.5 bg-depth pl-2 text-gold">
                <StarGlyph size={9} />
                Recommended target
              </span>
            )}
            <a
              href={posting.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-moonlight transition-colors duration-150 hover:text-starlight"
            >
              View posting
              <ExternalLink size={14} strokeWidth={1.5} aria-hidden />
              <span className="sr-only">
                , opens {providerLabel(posting.source)} in a new tab
              </span>
            </a>
            {isCurrentDestination ? (
              <span className="mono-label inline-flex items-center gap-1.5 text-gold">
                <StarGlyph size={9} /> Current destination
              </span>
            ) : (
              <Button
                variant={primaryLock ? "primary" : "secondary"}
                loading={lockPending}
                onClick={() => onLock?.(job)}
              >
                Lock this destination
              </Button>
            )}
          </div>
        )}
      </article>
    </li>
  );
}
