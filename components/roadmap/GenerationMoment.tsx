"use client";

import * as React from "react";
import {
  Button,
  ChartFrame,
  CompassSpinner,
  ErrorState,
  LinkButton,
  NorthStarGlyph,
  PositionCross,
  StageReadout,
  useReducedMotion,
} from "@/components/ui";
import type { GenerationEvent, LockedTarget, Roadmap, Tier } from "@/lib/types";
import { PaceChooser } from "./PaceChooser";

/**
 * The product's peak: the narrated generation moment. One question about
 * weekly capacity, then one gold CTA draws the route; NDJSON stages stream in
 * and type on as instrument readouts — all kept visible, log-style — then the
 * finished chart is handed over (the parent swaps to RoadmapView with the
 * route draw-in).
 *
 * Errors mid-stream keep the log, name the problem, and offer retry —
 * the locked target is never lost. Reduced motion: stages appear
 * instantly as they arrive.
 */

export interface GenerationMomentProps {
  target: LockedTarget;
  /** The target's tier: it preselects the pace and sizes the estimate. */
  tier: Tier | null;
  /**
   * Today as an ISO `YYYY-MM-DD`, resolved by the parent. Read here it would
   * risk a hydration mismatch, and the finish date is the one readout that
   * must not render two ways.
   */
  today: string;
  onComplete: (roadmap: Roadmap) => void;
}

type Phase = "idle" | "streaming" | "error";

/**
 * The pace to open on, by how far the target sits from the user today. A
 * stretch target needs more of their week than a role they could apply for
 * this Friday — this is a starting point, not a verdict, and every card stays
 * one tap away.
 */
const TIER_PACE: Record<Tier, number> = {
  ready: 4,
  attainable: 8,
  stretch: 12,
};

/**
 * Midpoint of the total-effort band the prompt asks the model to aim its hours
 * at (TIER_EFFORT_BAND in lib/gemini/prompts/roadmap.ts: 15–30 / 30–60 /
 * 60–120). No task hours exist before generation, so the live finish date is
 * reckoned from the same band the route will be drawn to — which is why the
 * readout is hedged rather than stated.
 */
const TIER_HOURS: Record<Tier, number> = {
  ready: 22.5,
  attainable: 45,
  stretch: 90,
};

/** No assessment on file: take the middle band rather than the flattering one. */
const UNTIERED: Tier = "attainable";

interface StageLine {
  key: string;
  text: string;
}

const STAGE_LABEL: Record<string, string> = {
  reading: "Reading",
  comparing: "Comparing",
  gaps: "Gaps",
  sequencing: "Sequencing",
};

function isGenerationEvent(value: unknown): value is GenerationEvent {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return type === "stage" || type === "done" || type === "error";
}

function truncate(text: string, max = 26): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** The undrawn chart: both endpoints plotted, no route between them yet. */
function PreviewChart({ targetTitle }: { targetTitle: string }) {
  const stars = React.useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const p = (n: number) => {
          const x = Math.sin(n * 91.7 + 47.3) * 43758.5453;
          return x - Math.floor(x);
        };
        return {
          x: 16 + p(i * 3 + 1) * 368,
          y: 12 + p(i * 3 + 2) * 176,
          r: 0.5 + p(i * 3 + 3) * 0.9,
          o: 0.14 + p(i * 3 + 4) * 0.22,
        };
      }),
    [],
  );

  return (
    <svg viewBox="0 0 400 200" className="block h-auto w-full" aria-hidden>
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x.toFixed(1)}
          cy={s.y.toFixed(1)}
          r={s.r.toFixed(1)}
          fill="var(--color-starlight)"
          opacity={s.o.toFixed(2)}
        />
      ))}
      <g transform="translate(37, 149)">
        <PositionCross size={22} />
      </g>
      <text
        x={36}
        y={186}
        fontSize={9}
        fill="var(--color-starlight)"
        opacity={0.85}
        style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.14em" }}
      >
        YOU ARE HERE
      </text>
      <g transform="translate(337, 25)">
        {/* pulse on a wrapper g with fill-box so the scale stays centered in SVG */}
        <g
          className="animate-north-pulse"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <NorthStarGlyph size={30} />
        </g>
      </g>
      <text
        x={356}
        y={66}
        fontSize={9}
        textAnchor="end"
        fill="var(--color-gold-bright)"
        style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.14em" }}
      >
        {truncate(targetTitle.toUpperCase())}
      </text>
    </svg>
  );
}

export function GenerationMoment({
  target,
  tier,
  today,
  onComplete,
}: GenerationMomentProps) {
  const reduced = useReducedMotion();

  const [hoursPerWeek, setHoursPerWeek] = React.useState(
    () => TIER_PACE[tier ?? UNTIERED],
  );
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [stages, setStages] = React.useState<StageLine[]>([]);
  const [typedCount, setTypedCount] = React.useState(0);
  const [result, setResult] = React.useState<Roadmap | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [conflict, setConflict] = React.useState(false);

  const abortRef = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => abortRef.current?.abort(), []);

  const start = React.useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("streaming");
    setStages([]);
    setTypedCount(0);
    setResult(null);
    setErrorMessage(null);
    setConflict(false);

    let sawTerminal = false;

    const fail = (message: string, isConflict = false) => {
      sawTerminal = true;
      setErrorMessage(message);
      setConflict(isConflict);
      setPhase("error");
    };

    const handle = (event: GenerationEvent) => {
      if (event.type === "stage") {
        setStages((current) => [...current, { key: event.key, text: event.text }]);
      } else if (event.type === "done") {
        sawTerminal = true;
        setResult(event.roadmap);
      } else {
        fail(event.message);
      }
    };

    try {
      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // The only input the calendar is built from. The route clamps it to
        // 1–60 and falls back to 8 on anything it cannot read, so a torn body
        // still draws a route.
        body: JSON.stringify({ hoursPerWeek }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let message = "The route couldn't be drawn. Your destination is still locked — try again.";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // Non-JSON error body — keep the generic line.
        }
        fail(message, res.status === 409);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          try {
            const parsed: unknown = JSON.parse(line);
            if (isGenerationEvent(parsed)) handle(parsed);
          } catch {
            // A malformed line never breaks the moment.
          }
        }
      }

      // A final line without a trailing newline still counts.
      const tail = buffer.trim();
      if (tail) {
        try {
          const parsed: unknown = JSON.parse(tail);
          if (isGenerationEvent(parsed)) handle(parsed);
        } catch {
          // Ignore a torn tail — the terminal check below covers it.
        }
      }

      if (!sawTerminal) {
        fail("The connection dropped mid-draw. Your destination is still locked — try again.");
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      fail("The route couldn't be drawn. Your destination is still locked — try again.");
    }
  }, [hoursPerWeek]);

  // Hand the chart over once the log has fully typed out.
  const allTyped = typedCount >= stages.length && stages.length > 0;
  React.useEffect(() => {
    if (!result || !allTyped) return;
    const hold = reduced ? 0 : 600;
    const timer = setTimeout(() => onComplete(result), hold);
    return () => clearTimeout(timer);
  }, [result, allTyped, reduced, onComplete]);

  const visibleStages = stages.slice(0, typedCount + 1);
  const waiting = phase === "streaming" && typedCount >= stages.length && !result;
  const lockedOn = Number.isNaN(Date.parse(target.lockedAt))
    ? null
    : new Date(target.lockedAt).toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col justify-center gap-8 py-4">
      <header className="flex flex-col gap-3">
        <h1 className="text-h1 text-starlight">Ready to draw your route.</h1>
        <p className="max-w-prose text-moonlight">
          Your destination is locked:{" "}
          <span className="text-starlight">
            {target.title}
            {target.company ? ` at ${target.company}` : ""}
          </span>
          . The route is drawn for you alone — from your skills and projects,
          against the requirements real postings name.
        </p>
      </header>

      <ChartFrame
        grid
        topLeft="VOYAGE CHART"
        topRight={lockedOn ? `LOCKED ${lockedOn}` : "COURSE LOCKED"}
        bottomLeft="POSITION PLOTTED"
        bottomRight={phase === "idle" ? "ROUTE UNDRAWN" : "ROUTE DRAWING"}
        contentClassName="p-5 pt-9 pb-9 md:p-6 md:pt-9 md:pb-9"
      >
        <PreviewChart targetTitle={target.title} />

        {/* The narration is sentences, not readings: the gold mono stage
            label stays an instrument label, and the sentence it introduces is
            set in Hanken Grotesk at body size (DIRECTION.md Type — mono is
            for measurement, never a costume for prose). Stages breathe
            further apart now that each one is a paragraph. */}
        {(phase === "streaming" || (phase === "error" && stages.length > 0)) && (
          <div className="mt-5 flex flex-col gap-4 border-t pt-5" aria-live="polite">
            {visibleStages.map((stage, i) => (
              <StageReadout
                key={stage.key}
                tone="prose"
                label={STAGE_LABEL[stage.key] ?? stage.key}
                text={stage.text}
                onDone={() => setTypedCount((c) => Math.max(c, i + 1))}
              />
            ))}
            {waiting && (
              <div className="flex items-center gap-3 pt-1">
                <CompassSpinner size={16} label="" />
                <span className="mono-label animate-quiet-pulse text-moonlight">
                  Plotting waypoints
                </span>
              </div>
            )}
          </div>
        )}
      </ChartFrame>

      {/* The one question the calendar is built from. It stays through the
          error state so a retry can be re-paced, and goes while the route is
          drawing — the answer is already in flight by then. */}
      {phase !== "streaming" && (
        <PaceChooser
          value={hoursPerWeek}
          onChange={setHoursPerWeek}
          totalHours={TIER_HOURS[tier ?? UNTIERED]}
          startDate={today}
          today={today}
        />
      )}

      {phase === "idle" && (
        <Button size="lg" onClick={start} className="self-start">
          Draw my roadmap
        </Button>
      )}

      {phase === "error" && errorMessage && (
        <ErrorState
          title="Your roadmap couldn't be drawn"
          detail={errorMessage}
          action={
            <div className="flex flex-wrap gap-3">
              <Button onClick={start}>Draw it again</Button>
              {conflict && (
                <LinkButton variant="secondary" href="/bearing">
                  Back to your matches
                </LinkButton>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
