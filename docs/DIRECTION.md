# Polaris — Design Direction Packet

This is the committed visual world for every surface. It is the build-time
authority; DESIGN.md gets written from the *built* world at finish. Read
PRODUCT.md first. If anything here conflicts with PRODUCT.md, PRODUCT.md wins.

## Direction contract

This exact text must survive into the emitted markup as the first child of
`<body>` in `app/layout.tsx`. React strips JSX comments, so emit a real HTML
comment via a hidden wrapper:
`<div hidden dangerouslySetInnerHTML={{ __html: "<!--\n...contract...\n-->" }} />`
placed as the first child of `<body>`. After the first production build, grep
the built output for `a472ca18` to confirm it survived. Keep it exact:

```
POLARIS DIRECTION CONTRACT
THESIS: A voyage track chart for a career: the dream job is a fixed star, the
user's position is honestly plotted, and the product's one idea - "we tell you
what's actually achievable" - is drawn as a navigable route. Refuses the
job-board card grid and the hype-gradient hero.
OWN-WORLD: Nautical-twilight indigo (#0A1226) deepening to #05080F at the
zenith; hairline graticules with degree ticks; star field of magnitude-varied
points; one brass-gold (#D9A648) dotted route with four-point star waypoints;
engraved-roman display (Marcellus); Hanken Grotesk text; Fragment Mono bearing
labels; aurora green / route gold / ember coral as chart classifications.
STORY: A visitor names their dream, sees their true position without flattery,
locks a destination, and watches a route drawn for them alone.
FIRST VIEWPORT: Landing, mobile: wordmark; full-bleed star chart ~55vh with a
YOU ARE HERE cross low in frame and a dotted gold route rising through
waypoints to a labeled north star; display headline "Every dream job has
coordinates."; one gold CTA "Chart your course". Nothing else competes.
FORM: Voyage track chart - candidate 6 of 7 grounded night-sky renditions;
seed key a472ca18.
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md.
```

## Palette (Tailwind v4 `@theme` tokens in `app/globals.css`)

| Token | Value | Role |
|---|---|---|
| `--color-abyss` | `#05080F` | zenith — page top, deepest ground |
| `--color-night` | `#0A1226` | primary ground (the sky) |
| `--color-depth` | `#111B3A` | raised panels, cards, inputs |
| `--color-veil` | `#1B2850` | hover/active panel, strong borders |
| `--color-starlight` | `#F2F4FA` | primary text |
| `--color-moonlight` | `#A9B4D0` | secondary text (indigo-tinted, never gray) |
| `--color-faint` | `#7C87A8` | tertiary/meta text (large sizes only) |
| `--color-gold` | `#D9A648` | Polaris brass — primary action, route, waypoints |
| `--color-gold-bright` | `#F0C468` | gold hover / ignited waypoint |
| `--color-gold-deep` | `#7A5C1E` | gold pressed / gold borders |
| `--color-astral` | `#7C9EE8` | links, focus ring, informational |
| `--color-aurora` | `#5BC48E` | tier: ready ("Ready now") |
| `--color-ember` | `#E0715C` | tier: stretch + destructive/error |

Ground treatment: the page background is a vertical sky — `linear-gradient(to
bottom, var(--color-abyss), var(--color-night) 40%)` fixed behind everything,
with the StarField component over it. Panels are `--color-depth` with 1px
hairline borders `color-mix(in srgb, var(--color-starlight) 9%, transparent)`.
NEVER pure black, NEVER neutral gray text, NEVER neon glow (`box-shadow` halos
with zero offset are banned decoration). Shadows: `0 12px 32px -12px rgb(0 0 0
/ 0.55)` (offset + blur).

Tier semantics (this replaces the brief's emoji — emoji are never used as
icons): tier is shown as a drawn four-point star glyph (`TierStar`) in the tier
color plus a mono label: AURORA `#5BC48E` "Ready now" · GOLD `#D9A648`
"Almost there" · EMBER `#E0715C` "Not yet". The dream is always EMBER-or-honest,
pinned, never hidden. These labels are the SAME strings on the chip and on the
tab above it — `TIER_LABEL` (lib/types.ts) and `TIER_SHORT`
(components/bearing/helpers.ts) must never drift apart.

## Type

- Display: **Marcellus** (Google Fonts, 400 only) — headings, wordmark, display
  lines. Engraved chart-roman. Scale carries hierarchy since there is one
  weight: display `clamp(2.5rem, 8vw, 4.25rem)`, h1 `2rem`, h2 `1.5rem`,
  h3 `1.1875rem`. Letter-spacing on caps display: `0.02em`; wordmark `0.22em`.
- Text/UI: **Hanken Grotesk** (variable 300–700) — body 1rem/1.65,
  small `.875rem`, weights: 400 body, 500 UI labels, 600 emphasis.
- Data: **Fragment Mono** (400) — bearing/instrument labels ONLY: coordinates,
  degrees, counts, dates, progress readouts, tier labels. `.6875rem`,
  uppercase, tracking `0.14em`, color moonlight or gold. Monospace is for
  measurement, never a "technical" costume for prose.
- All three loaded via `next/font/google` in `app/layout.tsx` with CSS
  variables `--font-display`, `--font-sans`, `--font-mono`, wired into
  `@theme` as `--font-*`.

Craft rules that bind every agent:
- NO kicker/eyebrow labels above headings (hard ban). Mono instrument labels
  live inside instrument components (readout strips, chart edges, tier rows),
  never floating above a heading.
- No gradient text. No section numbers. No same-size icon-card grids as page
  structure. No nested cards. No glassmorphism/backdrop-blur decoration.
- Body measure 65–75ch. More space above headings than below.
- Contrast: body text ≥4.5:1 on its actual ground (starlight on night = 15:1 ✓,
  moonlight on night = 7.5:1 ✓, faint only ≥1rem sizes).

## Materials & signature elements (all code-drawn — no raster anywhere)

| Ingredient | Medium | Spec |
|---|---|---|
| Star field | `StarField` client component, one `<canvas>` (or SVG) | 160–220 stars per viewport, magnitude-varied radii 0.4–1.6px, opacity 0.25–0.95, slight density increase toward top; 3–4 stars twinkle on a slow 6–9s cycle; whole field drifts ~4px over 60s; ALL motion disabled under `prefers-reduced-motion`. Runs at z-0 behind content, `pointer-events-none`. |
| Graticule | `Graticule` SVG | hairline grid every 48px at 7% starlight opacity, plus degree tick marks (4px strokes) along chart edges every 12px, every 5th tick 8px. |
| Route line | SVG path, `stroke-dasharray: 2 6`, gold, 1.5px | connects waypoints with gentle curves (quadratic beziers). Draw-in animation via `stroke-dashoffset` when it enters viewport (700ms expo-out, once). |
| Waypoint | authored SVG four-point star (rotated square with concave curves), 10–14px | pending: hairline gold outline; current: filled gold with 2px halo ring at 25% (ring has offset none but is a marker, ok — it is an element, not a shadow); done: filled gold-bright with 6px flare on completion (400ms scale 1→1.4→1 + brightness). |
| Position marker ("you are here") | authored SVG cross-hair: 12px cross + 20px circle at 40% | starlight color, mono label under it. |
| North star | authored SVG: larger 4-point star + fine 45°-rotated secondary cross, gold-bright | the dream marker. Subtle 4s pulse (scale 1↔1.06) — the ONE ambient motion beyond the star field. |
| Compass rose | authored SVG thin-line, 8 points, mono N/E/S/W | used in `CompassSpinner` (loading: slow rotation) and as quiet ornament on empty states. |
| Chart frame | `ChartFrame` — panel with tick-marked border + corner coordinates in mono | frames the roadmap chart and landing chart card on desktop. |
| Icons | `lucide-react`, 1.5px stroke, 20px default | never emoji, never unicode glyphs. Identity glyphs (star, waypoint, cross, compass) are the authored SVGs above, exported from `components/ui/glyphs.tsx`. |

## Motion grammar

One authored moment per surface; everything else is instant or a 200ms
opacity/transform ease-out. Easing: `--ease-out-expo: cubic-bezier(0.16, 1,
0.3, 1)`. Durations: 150ms (feedback), 400ms (state), 700ms (signature).
Signature moments, one each:
- Landing: route line draws itself on load (after LCP; CSS only).
- Onboarding: progress route extends to the next waypoint on step change.
- Bearing: tier stars settle in with 60ms stagger as classifications stream in.
- Roadmap generation: narration stages appear as instrument readouts typing on
  (see SPEC — this is the product's peak moment).
- Roadmap: completing a task ignites its waypoint (flare) and nudges the route
  progress.
- CV: a line un-greying is a 400ms starlight fade-in with a brief gold tick.
`prefers-reduced-motion`: all of the above become instant opacity swaps; star
drift and pulses stop. Use `motion` (framer-motion successor) or plain CSS —
prefer CSS where equivalent.

## Component inventory (built by the design-system agent, `components/ui/`)

Button (primary gold w/ night text; secondary hairline starlight; ghost; sizes
md 44px / lg 52px min-height — every touch target ≥44px), IconButton, Field
(label 4–8px above input, help + error slots), Input, Textarea, Select,
ChoiceCard + ChoiceCardGroup (radio cards for onboarding options), Panel,
ChartFrame, Skeleton (depth shimmer), Dialog (centered, hairline border, used
for check-ins), EmptyState (compass rose + line of copy + optional action),
ErrorState (names the problem + recovery action), TierStar (glyph + mono
label), ProgressRoute (horizontal route-line progress: filled gold to current
waypoint, hairline ahead; used in onboarding ~10% start and roadmap overall),
StarField, Graticule, Wordmark (star glyph + POLARIS in Marcellus tracked
caps), CompassSpinner, StageReadout (mono instrument line that types on),
Toast (bottom, quiet). Export everything from `components/ui/index.ts` and
document props in `docs/COMPONENTS.md` for the feature agents.

## Voice (copy rules for every agent)

Calm, certain, second person. Chart language, sparingly: north star, bearing,
waypoint, route, "You are here." Never: "unlock your potential", "level up",
"supercharge", "journey" as filler, exclamation marks, corporate job-board
speak. Honesty is warm, not clinical: "You hold 4 of 6 requirements. The
missing two are exactly what the roadmap below builds." Errors name the
problem and the recovery: "The sky is quiet — job search isn't configured
yet. Add your Jooble and Adzuna keys to take a real bearing."

**Controls are the exception to the metaphor.** Prose, headings and empty-state
titles keep the celestial voice; anything the user must click names the literal
outcome, in the same words the nav uses — "See your matches" (not "Take your
bearing"), "Search again" (not "Retake bearing"), "Draw my roadmap" (not "Draw
my route"), "Lock this destination", "Mark as done". PRODUCT.md already carves
this out for the nav ("the bearing tab reads Matches"); the rule is simply
applied to every control. Where a metaphor is worth teaching, pair it with its
plain reading in the same sentence rather than dropping it onto a button.

The user's own words are sacred material: quote them back verbatim in
starlight italic inside quote marks — "Because you said you want *'to design
games that make people feel something'*…" — never paraphrased into a category.

## Surface modes

Landing `/` = Persuade (the chart leads; see FIRST VIEWPORT). Everything
authenticated = Operate (scanability and native form expectations outrank
expression; the world lives in the ground, the glyphs, the mono readouts, and
the one signature motion per surface). Roadmap chart + generation moment =
the two places Operate is allowed a designed peak.
