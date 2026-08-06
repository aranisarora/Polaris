"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "./use-reduced-motion";

export interface StarFieldProps {
  className?: string;
}

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  color: string;
  twinkle: { period: number; phase: number } | null;
}

const STARLIGHT = "242, 244, 250";
const GOLD = "240, 196, 104";
const ASTRAL = "124, 158, 232";

/**
 * The night sky: 160–220 magnitude-varied stars on a fixed canvas behind
 * everything (z-0, pointer-events-none). Density rises toward the zenith;
 * 3–4 stars twinkle on slow 6–9s cycles; the whole field drifts ~4px per
 * minute. Fully static under prefers-reduced-motion.
 */
export function StarField({ className }: StarFieldProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let last = 0;

    const generate = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(
        Math.min(220, Math.max(160, (width * height) / 6800)),
      );
      stars = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        // exponent > 1 biases positions toward the top — denser zenith
        y: Math.pow(Math.random(), 1.35) * height,
        r: 0.4 + Math.pow(Math.random(), 2) * 1.2,
        alpha: 0.25 + Math.random() * 0.7,
        color: i % 19 === 0 ? GOLD : i % 23 === 0 ? ASTRAL : STARLIGHT,
        twinkle:
          i < 4
            ? {
                period: 6000 + Math.random() * 3000,
                phase: Math.random() * Math.PI * 2,
              }
            : null,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const drift = reduced ? 0 : (t / 60000) * 4; // ~4px per minute
      for (const s of stars) {
        const x = (s.x + drift) % width;
        let alpha = s.alpha;
        if (s.twinkle && !reduced) {
          const wave =
            0.5 +
            0.5 *
              Math.sin((t / s.twinkle.period) * Math.PI * 2 + s.twinkle.phase);
          alpha = s.alpha * (0.45 + 0.55 * wave);
        }
        ctx.beginPath();
        ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
        ctx.fill();
      }
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 33) return; // ~30fps is plenty for drift + twinkle
      last = t;
      draw(t);
    };

    generate();
    draw(0);
    if (!reduced) raf = requestAnimationFrame(loop);

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        generate();
        draw(last);
      }, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 z-0 h-full w-full",
        className,
      )}
    />
  );
}
