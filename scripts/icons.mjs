/**
 * Renders the Polaris star glyph to the PWA icon set via sharp:
 *   public/icons/icon-192.png            192×192, rounded-square ground
 *   public/icons/icon-512.png            512×512, rounded-square ground
 *   public/icons/icon-maskable-512.png   512×512, full-bleed ground,
 *                                        glyph scaled to leave 20% safe padding
 *   public/icons/apple-touch-icon.png    180×180, full-bleed ground
 *                                        (iOS applies its own corner mask)
 *
 * Run: node scripts/icons.mjs
 * Keep the glyph in sync with app/icon.svg.
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "icons");

const NIGHT = "#0A1226";
const ABYSS = "#05080F";
const GOLD = "#D9A648";
const STARLIGHT = "#F2F4FA";

/** Four-point star (rotated square with concave sides) centered on 256. */
function starPath(radius) {
  const c = 256;
  return [
    `M ${c} ${c - radius}`,
    `Q ${c} ${c} ${c + radius} ${c}`,
    `Q ${c} ${c} ${c} ${c + radius}`,
    `Q ${c} ${c} ${c - radius} ${c}`,
    `Q ${c} ${c} ${c} ${c - radius}`,
    "Z",
  ].join(" ");
}

/**
 * The Polaris glyph on its night ground, 512×512 viewBox.
 * @param {object} opts
 * @param {number} opts.corner  ground corner radius (0 = full bleed)
 * @param {number} opts.scale   glyph scale about the center (1 = tips at r160;
 *                              0.75 leaves ~20% safe padding for maskable)
 */
function glyphSvg({ corner, scale }) {
  const r = Math.round(160 * scale);
  const r2 = Math.round(r * 0.62);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${ABYSS}"/>
      <stop offset="1" stop-color="${NIGHT}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${corner}" fill="url(#sky)"/>
  <g fill="${STARLIGHT}">
    <circle cx="112" cy="124" r="3" opacity="0.5"/>
    <circle cx="396" cy="92" r="3.5" opacity="0.4"/>
    <circle cx="152" cy="396" r="2.5" opacity="0.35"/>
    <circle cx="416" cy="348" r="3" opacity="0.45"/>
    <circle cx="330" cy="146" r="2" opacity="0.3"/>
    <circle cx="92" cy="286" r="2" opacity="0.3"/>
  </g>
  <path d="${starPath(r2)}" transform="rotate(45 256 256)" fill="${GOLD}" opacity="0.35"/>
  <path d="${starPath(r)}" fill="${GOLD}"/>
</svg>`;
}

const TARGETS = [
  // Rounded-square ground for the standard launcher icons.
  { file: "icon-192.png", size: 192, corner: 116, scale: 1 },
  { file: "icon-512.png", size: 512, corner: 116, scale: 1 },
  // Maskable: full-bleed ground; glyph pulled in for a 20% safe padding.
  { file: "icon-maskable-512.png", size: 512, corner: 0, scale: 0.75 },
  // Apple touch icon: full square, iOS rounds the corners itself.
  { file: "apple-touch-icon.png", size: 180, corner: 0, scale: 1 },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const target of TARGETS) {
    const svg = glyphSvg({ corner: target.corner, scale: target.scale });
    const out = path.join(OUT_DIR, target.file);
    await sharp(Buffer.from(svg))
      .resize(target.size, target.size)
      .png()
      .toFile(out);
    console.log(`wrote ${path.relative(process.cwd(), out)} (${target.size}px)`);
  }
}

main().catch((err) => {
  console.error("icon render failed:", err);
  process.exitCode = 1;
});
