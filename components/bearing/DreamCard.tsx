"use client";

import * as React from "react";
import type { DreamAssessment } from "@/lib/types";
import { Button, NorthStarGlyph, Skeleton, StarGlyph, TierStar } from "@/components/ui";
import { RequirementChips } from "./RequirementChips";

export interface DreamCardProps {
  dream: DreamAssessment | null;
  state: "idle" | "loading" | "error";
  error?: string | null;
  /** The dream verbatim (or "role at company" for fast-track users). */
  dreamStatement: string;
  /** Interpreted role title, when one exists. */
  dreamTitle: string | null;
  onRetry: () => void;
  onLock: () => void;
  lockPending: boolean;
  /** The dream itself is the currently locked target. */
  isLocked: boolean;
  /** Hide the lock action during the streaming sequence. */
  actionable: boolean;
}

/**
 * The dream in the user's own words. A personal string is never cut mid-word
 * and never left with a dangling separator before the ellipsis — only a very
 * long statement is shortened at all, and only at a word boundary.
 */
function truncateText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${head.replace(/[\s,;:.·—–-]+$/u, "")}…`;
}

/** Wraps the verbatim quoted phrase inside the reasoning in starlight italic. */
function QuotedReasoning({ reasoning, quoted }: { reasoning: string; quoted: string }) {
  if (!quoted) return <>{reasoning}</>;
  const at = reasoning.toLowerCase().indexOf(quoted.toLowerCase());
  if (at === -1) {
    return (
      <>
        Because you said you want{" "}
        <em className="text-starlight">&ldquo;{quoted}&rdquo;</em> — {reasoning}
      </>
    );
  }
  return (
    <>
      {reasoning.slice(0, at)}
      <em className="text-starlight">{reasoning.slice(at, at + quoted.length)}</em>
      {reasoning.slice(at + quoted.length)}
    </>
  );
}

/**
 * The dream, pinned at the top of the bearing — always. Ember-or-honest
 * TierStar, reasoning that quotes the user's own words, have/missing chips,
 * and the quiet "Lock the dream itself" action.
 */
export function DreamCard({
  dream,
  state,
  error,
  dreamStatement,
  dreamTitle,
  onRetry,
  onLock,
  lockPending,
  isLocked,
  actionable,
}: DreamCardProps) {
  const total = dream ? dream.have.length + dream.missing.length : 0;

  return (
    <section
      aria-label="Your dream, assessed"
      className="rounded-xl border border-hairline-strong bg-depth p-5 shadow-panel md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <NorthStarGlyph size={22} pulse label="Your north star" />
          <h2 className="text-h3 text-starlight">{dreamTitle || "Your dream"}</h2>
        </div>
        {dream && state === "idle" ? (
          <TierStar tier={dream.tier} />
        ) : state === "loading" ? (
          <Skeleton className="h-4 w-28" />
        ) : null}
      </div>

      {state === "loading" && (
        <div aria-busy="true" className="mt-4 flex flex-col gap-2">
          <p className="mono-label text-moonlight">Measuring the distance to your dream</p>
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <div className="mt-1 flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-moonlight">
            <em className="text-starlight">&ldquo;{truncateText(dreamStatement, 320)}&rdquo;</em>
          </p>
          <p className="text-sm text-ember">
            {error ?? "Your dream couldn't be assessed."}
          </p>
          <div>
            <Button variant="secondary" onClick={onRetry}>
              Assess it again
            </Button>
          </div>
        </div>
      )}

      {state === "idle" && dream && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="max-w-[70ch] text-[0.9375rem] leading-relaxed text-moonlight">
            <QuotedReasoning reasoning={dream.reasoning} quoted={dream.quoted} />
          </p>

          {total > 0 && (
            <div className="flex flex-col gap-2.5">
              <p className="mono-label text-moonlight">
                {dream.have.length} of {total} requirements
              </p>
              <RequirementChips have={dream.have} missing={dream.missing} />
            </div>
          )}

          {actionable && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-moonlight">
                {dream.tier === "stretch"
                  ? "Stretch is a trajectory, not a rejection."
                  : "The honest reading, from your own chart."}
              </p>
              {isLocked ? (
                <span className="mono-label inline-flex items-center gap-1.5 text-gold">
                  <StarGlyph size={9} /> Current destination
                </span>
              ) : (
                <Button variant="secondary" loading={lockPending} onClick={onLock}>
                  Lock the dream itself
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
