import * as React from "react";
import { Graticule } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Chart dressing for the mid-page bands.
 *
 * The fixed `StarField` sits behind the whole document, so below the hero the
 * only thing carrying the world at desktop widths is the copy itself — and at
 * 1440px that leaves a narrow column adrift in plain indigo. This drops the
 * chart back onto the band: the hairline graticule with its degree ticks, plus
 * a small deterministic scatter of magnitude-varied stars so density varies
 * band to band instead of reading as one flat sky.
 *
 * Additive at `md` and up only — the mobile column is already dense and is the
 * primary device, so it is left exactly as it was. Decorative throughout.
 */

/** Deterministic PRNG — same generator as the hero, seeded per band. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BandStar {
  left: number; // %
  top: number; // %
  size: number; // px
  opacity: number;
}

const FIELDS = new Map<string, readonly BandStar[]>();

function bandField(seed: number, count: number): readonly BandStar[] {
  const key = `${seed}:${count}`;
  const cached = FIELDS.get(key);
  if (cached) return cached;
  const rand = mulberry32(seed);
  const stars: BandStar[] = [];
  for (let i = 0; i < count; i++) {
    const magnitude = rand();
    stars.push({
      left: Math.round((1 + rand() * 98) * 10) / 10,
      // exponent > 1 keeps the sky denser toward the top of each band
      top: Math.round((2 + Math.pow(rand(), 1.3) * 94) * 10) / 10,
      size: Math.round((0.7 + magnitude * 1.5) * 10) / 10,
      opacity: Math.round((0.16 + magnitude * 0.46) * 100) / 100,
    });
  }
  FIELDS.set(key, stars);
  return stars;
}

export interface ChartBackdropProps {
  /** Which sky this band gets — vary it so no two bands repeat. */
  seed?: number;
  /** Star count for the band. */
  stars?: number;
  /** Hairline 48px graticule grid. */
  grid?: boolean;
  /** Degree ticks along the band edges. */
  ticks?: boolean;
  className?: string;
}

/** Absolute, decorative, `md`+ only. Drop inside a `relative` section. */
export function ChartBackdrop({
  seed = 0xa472ca18,
  stars = 22,
  grid = false,
  ticks = false,
  className,
}: ChartBackdropProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 hidden overflow-hidden md:block",
        className,
      )}
    >
      {(grid || ticks) && <Graticule grid={grid} ticks={ticks} />}
      {bandField(seed, stars).map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-starlight"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}
