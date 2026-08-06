import { StarGlyph } from "@/components/ui";

/**
 * The readiness instrument: a compass-rose arc (240° sweep, degree ticks,
 * the north star at its apex) around a mono numeral. Server-rendered SVG;
 * the arc length transitions 600ms when the score changes on a data
 * refresh (CSS only — stops under prefers-reduced-motion via globals).
 */

const CX = 100;
const CY = 106;
const R = 80;
const SWEEP_START = -120;
const SWEEP_END = 120;

function polar(radius: number, angle: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return {
    x: CX + radius * Math.sin(rad),
    y: CY - radius * Math.cos(rad),
  };
}

function arcPath(): string {
  const start = polar(R, SWEEP_START);
  const end = polar(R, SWEEP_END);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${R} ${R} 0 1 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const TICK_ANGLES: number[] = [];
for (let angle = SWEEP_START; angle <= SWEEP_END; angle += 12) {
  if (angle !== 0) TICK_ANGLES.push(angle); // apex belongs to the north star
}

export function ScoreGauge({
  score,
  size = 200,
}: {
  score: number;
  size?: number;
}) {
  const value = Math.min(100, Math.max(0, Math.round(score)));
  const d = arcPath();

  return (
    <div
      role="img"
      aria-label={`Readiness score ${value} of 100`}
      className="relative"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden>
        {/* degree ticks along the outside of the arc */}
        <g stroke="var(--color-starlight)" strokeWidth={1}>
          {TICK_ANGLES.map((angle) => {
            const major = angle % 60 === 0;
            const from = polar(R + 7, angle);
            const to = polar(R + (major ? 15 : 11), angle);
            return (
              <line
                key={angle}
                x1={from.x.toFixed(2)}
                y1={from.y.toFixed(2)}
                x2={to.x.toFixed(2)}
                y2={to.y.toFixed(2)}
                strokeOpacity={major ? 0.45 : 0.22}
              />
            );
          })}
        </g>

        {/* track */}
        <path
          d={d}
          fill="none"
          stroke="var(--color-starlight)"
          strokeOpacity={0.12}
          strokeWidth={6}
          strokeLinecap="round"
        />

        {/* earned arc */}
        <path
          d={d}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth={6}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${value} 100`}
          className="transition-[stroke-dasharray] duration-[600ms] ease-out-expo"
        />

        {/* the north star at the apex — 100 points due north */}
        <g transform="translate(92 6)">
          <StarGlyph size={16} color="var(--color-gold-bright)" />
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
        <span
          aria-hidden
          className="font-mono text-[2.75rem] leading-none text-starlight"
        >
          {value}
        </span>
        <span aria-hidden className="mono-label mt-2 text-moonlight">
          of 100
        </span>
      </div>
    </div>
  );
}
