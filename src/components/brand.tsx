import Link from "next/link";
import type { Source } from "@/lib/data/types";

/**
 * The marks and the signature components — `docs/brand.md` §7 and §8.
 *
 * A brand needs one thing that is unmistakably its own before it needs a logo.
 * Ours is not the mark — it is the row, the tick counter, and the source tag.
 */

/**
 * The Fix — §7.1. A sight mark, not a star: a fixed point with four ticks, the
 * northern one longer and breaking out further than the rest.
 *
 * The asymmetric north tick is the whole design. It keeps us clear of the
 * four-point sparkle now stamped on every AI feature in the world, which §1.4
 * disqualifies on strategy rather than taste.
 */
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      role="img"
      aria-label="Polaris"
    >
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <path d="M12 1.5V7" />
      <path d="M12 17v3.5" />
      <path d="M3.5 12H7" />
      <path d="M17 12h3.5" />
    </svg>
  );
}

/**
 * The Ledger — §7.2. Four bars at uneven heights, echoing the tick counter.
 * At 32px a bar chart survives where a reticle turns to mush.
 */
export function LedgerMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      role="img"
      aria-label="Ledger"
    >
      <rect x="3" y="9" width="3" height="12" rx="1.5" />
      <rect x="8.5" y="5" width="3" height="16" rx="1.5" />
      <rect x="14" y="12" width="3" height="9" rx="1.5" />
      <rect x="19.5" y="15" width="3" height="6" rx="1.5" />
    </svg>
  );
}

/**
 * §9 rule 3: the wordmark is in frame on every shareable surface. An
 * unattributed screenshot is free reach we did not collect.
 */
export function Wordmark({
  href = "/",
  eyebrow,
}: {
  href?: string | null;
  eyebrow?: string;
}) {
  const inner = (
    <>
      <Mark size={17} />
      Polaris
    </>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10 }}>
      {href ? (
        <Link href={href} className="wm">
          {inner}
        </Link>
      ) : (
        <span className="wm">{inner}</span>
      )}
      {eyebrow ? <span className="wm-eyebrow">{eyebrow}</span> : null}
    </span>
  );
}

/**
 * The source tag — §8.3. Mono, muted, bracketed, 12px minimum, always adjacent
 * to the figure it justifies. A retrieved figure never ships without one.
 *
 * This is the single clearest visual difference between us and a chat answer,
 * and it is what makes an unwelcome number survive being doubted.
 */
export function SourceTag({
  source,
  suffix,
}: {
  source: Source;
  suffix?: string;
}) {
  const label = `[${source.label}${suffix ? ` · ${suffix}` : ""}]`;
  return (
    <a
      className="prov"
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}

export type StateKey = "open" | "reach" | "settled";

/**
 * §5.3 rule 1: never encode state in colour alone. Every state carries a glyph
 * *and* a word. Roughly 8% of men have a colour vision deficiency and this
 * audience is majority-male engineering students — a product that leans on hue
 * is broken for a meaningful slice of a lecture hall. It is also what makes a
 * compressed screenshot survive.
 */
const STATE_META: Record<
  StateKey,
  { glyph: string; word: string; cls: string }
> = {
  open: { glyph: "●", word: "Open now", cls: "stamp--open" },
  reach: { glyph: "◐", word: "Within reach", cls: "stamp--fix" },
  settled: { glyph: "○", word: "Settled", cls: "stamp--settled" },
};

export function StateStamp({
  state,
  label,
}: {
  state: StateKey;
  label?: string;
}) {
  const meta = STATE_META[state];
  return (
    <span className={`stamp ${meta.cls}`}>
      <span aria-hidden="true">{meta.glyph}</span>
      {label ?? meta.word}
    </span>
  );
}

/**
 * The tick counter — §8.2. Never a donut chart, never a percentage ring. It is
 * the eligibility idea in a form legible at 12px and at thumbnail size in a
 * group chat.
 */
export function TickCounter({
  open,
  reach,
  settled,
}: {
  open: number;
  reach: number;
  settled: number;
}) {
  const total = open + reach + settled;
  return (
    <div
      className="ticks"
      role="img"
      aria-label={`${open} of ${total} open now, ${reach} within reach, ${settled} settled`}
    >
      {Array.from({ length: open }, (_, i) => (
        <i key={`o${i}`} className="on" />
      ))}
      {Array.from({ length: reach }, (_, i) => (
        <i key={`f${i}`} className="fix" />
      ))}
      {Array.from({ length: settled }, (_, i) => (
        <i key={`s${i}`} className="settled" />
      ))}
    </div>
  );
}

/** The hero count — `9 / 23`. Tabular figures, fixed width, never animated. */
export function Count({
  value,
  total,
  label = "open now",
}: {
  value: number;
  total: number;
  label?: string;
}) {
  return (
    <div className="count">
      <b>{value}</b>
      <s>/ {total}</s>
      <em>{label}</em>
    </div>
  );
}

/**
 * §9 rule 7: a date on every artefact. "Updated 2 Aug 2026" is what makes a
 * forwarded image credible in November.
 */
export function DateStamp({ iso }: { iso: string }) {
  return (
    <span className="mono">
      {new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })}
    </span>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * The declination arc — §12.3. One faint arc, a segment of a circle whose
 * centre is off-canvas, bleeding out of the top-right. A single frame of a star
 * trail: everything wheels, and the centre it wheels around is off the edge of
 * the page. One arc, two surfaces, never animated.
 */
export function DeclinationArc() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 400"
      preserveAspectRatio="xMaxYMin slice"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "min(680px, 100%)",
        height: "auto",
        opacity: 0.08,
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      <g fill="none" stroke="var(--p-line-3)" strokeWidth="1">
        <circle cx="640" cy="-90" r="300" />
        <circle cx="640" cy="-90" r="380" />
        <circle cx="640" cy="-90" r="460" />
      </g>
    </svg>
  );
}
