---
name: Polaris
description: A night-sky voyage chart for a career — honest position, fixed star, one drawn route.
colors:
  abyss: "#05080f"
  night: "#0a1226"
  depth: "#111b3a"
  veil: "#1b2850"
  starlight: "#f2f4fa"
  moonlight: "#a9b4d0"
  faint: "#7c87a8"
  gold: "#d9a648"
  gold-bright: "#f0c468"
  gold-deep: "#7a5c1e"
  astral: "#7c9ee8"
  aurora: "#5bc48e"
  ember: "#e0715c"
  hairline: "color-mix(in srgb, #f2f4fa 9%, transparent)"
  hairline-strong: "color-mix(in srgb, #f2f4fa 16%, transparent)"
typography:
  display:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: "clamp(2.5rem, 8vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.15
  title:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.25
  subtitle:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.35
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  body-small:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  control:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Fragment Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.14em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  gutter: "16px"
  gutter-wide: "32px"
  control-x: "14px"
  stack: "12px"
  stack-lg: "20px"
  panel: "20px"
  panel-lg: "24px"
  panel-xl: "32px"
  block: "32px"
  section: "64px"
  section-wide: "96px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.night}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.gold-bright}"
  button-primary-active:
    backgroundColor: "{colors.gold-deep}"
    textColor: "{colors.starlight}"
  button-primary-lg:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.night}"
    rounded: "{rounded.md}"
    padding: "0 28px"
    height: "52px"
  button-secondary:
    textColor: "{colors.starlight}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    textColor: "{colors.moonlight}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  button-destructive:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.night}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
  icon-button:
    textColor: "{colors.moonlight}"
    rounded: "{rounded.md}"
    height: "44px"
    width: "44px"
  input:
    backgroundColor: "{colors.depth}"
    textColor: "{colors.starlight}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "44px"
  input-focus:
    backgroundColor: "{colors.depth}"
    textColor: "{colors.starlight}"
  panel:
    backgroundColor: "{colors.depth}"
    textColor: "{colors.starlight}"
    rounded: "{rounded.lg}"
    padding: "20px"
  panel-lg:
    backgroundColor: "{colors.depth}"
    textColor: "{colors.starlight}"
    rounded: "{rounded.lg}"
    padding: "24px"
  chart-frame:
    backgroundColor: "rgb(10 18 38 / 0.6)"
    textColor: "{colors.moonlight}"
    rounded: "{rounded.lg}"
    padding: "24px"
  choice-card:
    backgroundColor: "{colors.depth}"
    textColor: "{colors.starlight}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  choice-card-selected:
    backgroundColor: "rgb(27 40 80 / 0.3)"
    textColor: "{colors.starlight}"
  chip-have:
    textColor: "{colors.aurora}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  chip-missing:
    textColor: "{colors.ember}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  dialog:
    backgroundColor: "{colors.depth}"
    textColor: "{colors.starlight}"
    rounded: "{rounded.xl}"
    padding: "24px"
  toast:
    backgroundColor: "{colors.depth}"
    textColor: "{colors.starlight}"
    rounded: "{rounded.md}"
    padding: "8px 8px 8px 16px"
  nav-tab:
    textColor: "{colors.moonlight}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "44px"
  nav-tab-active:
    textColor: "{colors.gold}"
---

# Design System: Polaris

## Overview

**Creative North Star: "The Voyage Track Chart"**

Polaris renders a career the way an admiralty chart renders a passage: a fixed
star at the top of the frame, an honestly plotted position low in it, and one
dotted brass-gold route between them. The product's binding identity concept is
Night Sky Navigator (PRODUCT.md); the chart is how that concept was actually
drawn. Every surface sits on the same fixed vertical sky — abyss at the zenith
deepening into nautical-twilight indigo — with a magnitude-varied star field
behind all content and hairline graticules dressing the instruments. Nothing in
the built world is a raster: the sky, the stars, the route, the waypoints, the
compass rose and the readiness gauge are all code-drawn canvas and SVG.

The register is quiet and instrumented rather than dark-and-dramatic. Depth
comes almost entirely from four tonal grounds and 1px hairlines, not from
shadow; the two shadow tokens that exist are offset-and-blur, and no surface in
the build carries a zero-offset halo, a neon glow, or backdrop blur. Ink is
never neutral: every "grey" in the system is indigo-tinted. Brass gold is the
single accent and it is rationed hard — it is the route, the waypoints, the
instrument labels, and exactly one action per screen. Aurora green and ember
coral are not decoration at all; they are classifications, and they only appear
where something has been measured.

The type does the same split. An engraved chart-roman (Marcellus, one weight)
carries headings and the wordmark; a plain grotesque (Hanken Grotesk) carries
everything a person reads at length; a mono (Fragment Mono) is reserved for
things that were measured — coordinates, counts, dates, tiers, salaries, stage
readouts. The world is expressed almost entirely in the ground, the glyphs and
the mono readouts, which lets the interaction layer stay completely
conventional: native `<dialog>`, native `<select>`, real radios, a standard
bottom tab bar. Confirmed rejections: the job-board card grid, the
hype-gradient hero, glassmorphism, emoji as icons, and kicker/eyebrow labels.

**Key Characteristics:**

- One fixed sky behind everything — a two-stop vertical gradient plus a canvas star field, never a per-page background.
- Four tonal grounds (abyss → night → depth → veil) and hairline borders do the work shadows usually do.
- One accent (brass gold) and three classification colors (aurora / gold / ember) that only appear on measured things.
- Three faces with three jobs: engraved roman for headings, grotesque for reading, mono for measurement only.
- Every identity mark is an authored SVG glyph — four-point star, waypoint, position cross, compass rose, north star.
- One authored motion per surface; everything else is a 150ms color transition or nothing.
- Conventional interaction patterns throughout; the distinctiveness lives in the skin and the copy.

## Colors

A single low-luminance indigo family carrying one warm brass accent and three
signal colors, with no neutral grey anywhere in the system.

### Primary

- **Polaris Brass** (`gold`): the one accent. It is the route line, the waypoint fill, the mono instrument labels, the active nav tab, the required-field asterisk, and the single filled CTA on a screen. Nothing else earns it.
- **Ignited Brass** (`gold-bright`): the hotter state — a reached waypoint, the north star itself, the primary button on hover, an earned CV line's star, a success toast mark.
- **Deep Brass** (`gold-deep`): pressed state on the primary button, and the only place a gold dark enough to sit under starlight text is used.

### Secondary

- **Astral Blue** (`astral`): informational and navigational blue. Its two real jobs in the build are the global focus ring (`outline: 2px solid`, 2px offset) and the input focus border at 60% opacity. It also seeds roughly one star in twenty-three in the star field.

### Tertiary

Classification colors. These are never decorative — a surface may only use one
where something has actually been assessed.

- **Aurora Green** (`aurora`): tier "Already possible", and the *you have* requirement chips.
- **Ember Coral** (`ember`): tier "Stretch", and doubling as the destructive/error color — invalid field borders at 70%, the error state's 40% border, the *missing* requirement chips, the error toast mark.
- Gold serves as the middle classification, tier "Attainable".

### Neutral

- **Zenith Abyss** (`abyss`): the top stop of the fixed sky gradient, the `<html>` background, and (at 70% alpha) the dialog backdrop. The darkest value in the system.
- **Nautical Night** (`night`): the primary ground. The body background, the mobile tab bar, and the text color that sits *on* gold buttons.
- **Chart Depth** (`depth`): every raised surface — panels, cards, list rows, inputs, dialogs, toasts, choice cards, and the autofill inset shadow that keeps browser autofill from flashing white.
- **Veil Indigo** (`veil`): the interactive layer above depth — hover and active fills (at 20–60% alpha), the selected tier segment, skeleton blocks at 60%, and the scrollbar thumb.
- **Starlight** (`starlight`): primary text, and the source color every hairline and tick is mixed from.
- **Moonlight** (`moonlight`): secondary text — body copy under a heading, help text, mono readouts, inactive nav, drawn chevrons. Indigo-tinted, ~7.5:1 on night.
- **Faint** (`faint`): tertiary/meta only — in the built code its single job is input placeholder text.
- **Hairline / Hairline Strong** (`hairline`, `hairline-strong`): 9% and 16% starlight. Hairline is set as the global default `border-color` in the base layer, so a bare `border` utility is already on-world; hairline-strong marks chart frames, the route-ahead track, dialog edges, and control hover.

### Named Rules

**The One Gold Rule.** Gold is the route and the action. A screen gets one
gold-filled control; every other gold on that screen is route, waypoint,
instrument label, or the active tab. When two rows both deserve the action, only
the recommended one gets the gold fill — the rest fall back to secondary.

**The Indigo Neutral Rule.** There is no grey in this system. Every muted text,
border, divider and disabled state is mixed from starlight or drawn from the
indigo family. A `#888`-class value anywhere is a bug.

**The Never Black Rule.** The floor is abyss (`#05080F`) and it only appears at
the zenith of the fixed sky and behind an open dialog. Pure black is never used
as a ground, a border, or a text color.

**The Classification Rule.** Aurora, gold and ember are readings, not paint.
They appear on tier stars, requirement chips, and error surfaces — never on a
heading, a panel, an illustration or a divider to add interest.

## Typography

**Display Font:** Marcellus (with Georgia, serif)
**Body Font:** Hanken Grotesk (with system-ui, sans-serif)
**Label/Mono Font:** Fragment Mono (with ui-monospace, monospace)

**Character:** An engraved single-weight roman against a plain, generously
leaded grotesque — the pairing of an old chart's lettering with a modern
instrument's readout. All three load through `next/font/google` as CSS
variables; nothing is a system display face.

### Hierarchy

- **Display** (400, `clamp(2.5rem, 8vw, 4.25rem)`, 1.06, +0.01em): the landing headline only. Set in sentence case with `text-wrap: balance`, never caps.
- **Headline** (400, 2rem, 1.15): the `h1` on every authenticated surface — "Your bearing", "Ready to draw your route." Also the landing's section headings.
- **Title** (400, 1.5rem, 1.25): section headings inside a surface — CV name block, dialog-scale headings.
- **Subtitle** (400, 1.1875rem, 1.35): the smallest Marcellus step — dialog titles, empty-state titles, CV section headings, landing step titles.
- **Body** (400, 1rem, 1.65): default reading text. Starlight on ground, moonlight for supporting copy. Measure capped at 42–70ch depending on the surface (`max-w-prose`, `max-w-[52ch]`, `max-w-[70ch]`).
- **Body Small** (400, 0.875rem, ~1.6): help text, field errors, card descriptions, tier framing lines, reasoning paragraphs.
- **Control** (500, 0.9375rem, 1.4): button labels at the 44px size, and the dense list-line step used for CV lines and landing step copy.
- **Label** (400, 0.6875rem, 1.5, +0.14em, uppercase): the `mono-label` utility. Coordinates, counts, dates, tiers, salaries, chart-frame corners, requirement counts, progress readouts.

### Named Rules

**The One Weight Rule.** Marcellus ships at 400 and only 400. Size is the entire
heading hierarchy — never bolden a heading, never fake weight with a stroke,
never letterspace a heading to manufacture emphasis. The two sanctioned
tracking exceptions are the wordmark (+0.22em) and the display line (+0.01em).

**The Measurement Rule.** Fragment Mono is only for things that were measured:
coordinates, degrees, counts, dates, tiers, salaries, progress readouts, chart
corners. It is never a costume for prose, a heading, or a button.

**The No Eyebrow Rule.** Nothing floats above a heading. Mono instrument labels
live *inside* instrument components — chart-frame corners, tier rows, readout
strips, the provenance tag inside a choice card — never as a kicker above an
`h1` or `h2`. The build carries zero kickers; keep it that way.

**The Verbatim Quote Rule.** The user's own words return in starlight italic
inside curly quotes, inline in moonlight prose. They are never paraphrased into
a category label, never set in mono, never given a blockquote treatment.

**The Sans Row Rule.** Titles inside a repeating list row (task cards, job rows)
are set in Hanken Grotesk at 1rem/500, not Marcellus. Marcellus marks the
document; the grotesque marks the record.

## Layout

**Page frame.** One centered column at `max-w-6xl` (1152px) with 16px gutters,
widening to 32px at `md`. Authenticated surfaces put their content inside that
frame; long-form moments (the generation moment, the landing hero copy, the
specimen bearing) narrow further to `max-w-2xl` (672px), and the landing's
"How it works" to `max-w-xl` (576px). Desktop is the same single column with
wider gutters and a wider chart — the build ships no dashboard grid, no
sidebar, and no multi-column content anywhere.

**Chrome.** A 56px top bar (64px at `md`) with a bottom hairline carries the
wordmark and sign-out. Below `md`, primary navigation is a fixed 64px bottom tab
bar on the night ground with a top hairline and `env(safe-area-inset-bottom)`
padding; `main` reserves `calc(5.5rem + safe-area)` of bottom padding for it. At
`md` and above the tab bar disappears and the three destinations move inline
into the top bar.

**Breakpoints.** Tailwind defaults, three of them load-bearing: `sm` (640px)
for minor padding steps, `md` (768px) for the whole mobile→desktop chrome swap,
and `xl` (1280px) for the hero chart's widest composition.

**Spacing rhythm.** A 4px base with a small set of recurring steps: 12px between
rows in a list, 20px between panels in a stack, 32px between blocks on a
surface, and 64px (96px at `md`) between landing sections. Panels pad at 20px,
or 24px growing to 32px at `md` for the large variant; list-row cards pad at
16px growing to 20px. Controls pad 14px horizontally; buttons 20px (28px at the
large size). Headings take more space above than below.

**Density and targets.** Every interactive element clears 44×44px — buttons and
inputs have a `min-h-11` floor, icon buttons are exactly 44×44, tier segments
48px, tab-bar items fill a 64px row, and even the inline "view posting" link and
the CV task link are given `min-h-11`. Uncategorized lists stay under ten items;
longer sets get grouped behind the tier switcher.

## Elevation & Depth

Depth is tonal first and shadowed almost never. Four grounds stack in fixed
order — abyss (zenith) → night (page) → depth (raised) → veil (interactive) —
and a 1px hairline does most of the separating work. The fixed sky gradient and
the canvas star field sit at `z-index: -10` and `z-0`; all content rides above
them at `z-10`, the tab bar at `z-40`, and toasts at `z-50`. Only two shadow
tokens exist, both offset-and-blur; there is no ambient halo, no colored glow,
and no `backdrop-filter` in the build.

### Shadow Vocabulary

- **Panel** (`box-shadow: 0 12px 32px -12px rgb(0 0 0 / 0.55)`): every raised surface at rest — panels, cards, list rows, chart frames, error states, toasts.
- **Raised** (`box-shadow: 0 24px 48px -16px rgb(0 0 0 / 0.6)`): the modal tier. Used by `Dialog` only, over a `rgb(5 8 15 / 0.7)` backdrop.

### Named Rules

**The Offset Shadow Rule.** Every shadow has vertical offset and negative
spread. A zero-offset halo is banned decoration — a glow around an element is
never how this system says "elevated" or "active".

**The Drawn Ring Exception.** The one thing that looks like a glow is not one:
the current waypoint's 25%-opacity ring and the roadmap chart's pulsing 1px
circle are *drawn SVG elements*, part of the chart's mark vocabulary. Drawn
rings are allowed; CSS halos are not.

**The Flat Panel Rule.** Surfaces do not gain elevation on hover. Hover is a
tonal move into veil (20–60% alpha) or a hairline going from 9% to 16% — never
a shadow change, never a lift.

## Shapes

A five-step radius ladder, all soft-square, no pills except where a thing is
genuinely a token: **6px** (skeletons, small dismiss targets), **8px** (buttons,
inputs, icon buttons, nav items, toasts — the control radius), **12px** (panels,
cards, list rows, chart frames, choice cards, tier switcher — the surface
radius), **16px** (the dialog, and only the dialog), and **fully round**
(requirement chips, progress waypoint dots, the compass hub).

Borders are the system's primary line. The base layer sets `border-color` to the
9% hairline on every element, so an unqualified `border` utility is already
correct; 16% hairline-strong marks chart frames, dialog edges, the route-ahead
track, and control hover. State is expressed by *recoloring* that same 1px
border — gold for a selected choice card, gold at 40–50% for the current task
and recommended job, ember at 40–70% for error and invalid.

The recurring silhouette is the **four-point star**: a rotated square with
concave curves, drawn once as `STAR_PATH` and reused at every scale from 7px
(active tab marker) through 9px (inline markers), 11–14px (wordmark, tier stars,
selected choice card), 16–18px (waypoints), up to 30–36px as the north star with
its fine 45°-rotated secondary cross. The second recurring form is the **dotted
route** — `stroke-dasharray: 2 6` at 1.5px gold in SVG, mirrored in CSS as a
`repeating-linear-gradient` at 2px-on / 6px-off for vertical rails. The third is
the **graticule**: a 48px hairline grid at 7% starlight with edge ticks at 22%,
4px tall every 12px and 8px tall every fifth.

## Components

### Buttons

- **Shape:** control radius (8px), 44px minimum height (`md`) or 52px (`lg`), 20px / 28px horizontal padding, `font-medium`, `gap-2` for an inline glyph.
- **Primary:** gold fill with night text — the one filled action on a screen. Hover lifts to gold-bright; active drops to gold-deep and flips text to starlight.
- **Secondary:** transparent on a 25%-starlight border with starlight text. Hover fills veil at 40%, active at 60%.
- **Ghost:** moonlight text, no border. Hover fills veil at 30% and brightens text to starlight.
- **Destructive:** ember fill with night text; hover/active are brightness steps rather than new hues.
- **Loading:** the button renders an inline 16px CompassSpinner, sets `aria-busy`, and disables itself. Disabled state is `opacity: 0.55` with pointer events off.
- **Transitions:** colors only, 150ms. Buttons never move, scale, or gain shadow.
- **LinkButton** is the same class set applied to a `next/link` for navigation CTAs.

### IconButton

Exactly 44×44, control radius, ghost or secondary tone matching the Button
variants. `aria-label` is a required prop — an icon-only control must name its
action.

### Inputs / Fields

- **Style:** depth ground, 1px hairline, control radius, 44px min height, 14px horizontal padding, body-size starlight text on faint placeholder. Input, Textarea and Select share one `CONTROL_CLASSES` string, so the three are pixel-identical at rest.
- **Focus:** the border shifts to astral at 60%, and the global 2px astral focus ring sits 2px outside it. There is no glow and no fill change.
- **Error:** `invalid` recolors the border to ember at 70% and sets `aria-invalid`; the message lives in Field's slot, in ember, at `role="alert"`.
- **Field:** label 6px above the control in starlight `body-small`/500, with a gold asterisk when required; a single slot below carries help (moonlight) or error (ember) — error replaces help, never stacks.
- **Textarea:** 112px min height, vertically resizable, 10px vertical padding.
- **Select:** a real native `<select>` with appearance stripped and a 16px lucide chevron drawn in moonlight at the right inset.
- **Autofill:** overridden globally with a 1000px inset depth shadow so Chrome never flashes white on the night ground.

### ChoiceCard

- **Style:** depth ground, surface radius, 1px hairline, 14px/16px padding, left-aligned, full width. Optional mono provenance tag in gold above the title, title in starlight/500, description in moonlight `body-small`.
- **Selected:** the border turns gold, the fill goes veil at 30%, and a 14px gold star fades in at the right of the title row.
- **Hover (unselected):** hairline-strong border, veil at 20%.
- **Semantics:** `ChoiceCardGroup` is a real `radiogroup`; each card is `role="radio"` with roving tabindex and arrow-key navigation. Never a fake toggle.

### Chips

- **Style:** fully round, 1px border at 35% of the signal color, 4px/10px padding, `text-xs` in the signal color, with an 11px lucide check or X inline.
- **State:** two variants only — aurora *have* and ember *missing* — each preceded by a mono label. Chips are read-only readings; they are never filters or actions.

### Cards / Containers

- **Panel:** depth ground, surface radius (12px), 1px hairline, panel shadow, 20px padding (`md`) or 24px growing to 32px at `md` (`lg`).
- **List rows** (job row, task card): the same recipe at 16px padding growing to 20px, rendered as `<li>`. The row's border carries its state — gold at 40–50% for current/recommended, hairline otherwise.
- **Never nest a card in a card.** A panel holds rows, dividers (`divide-y` hairline) and instruments — not more panels.

### ChartFrame

The instrument container: an overflow-hidden surface at 60% night with a
hairline-strong border, an inset Graticule (edge ticks always, interior grid
opt-in), and up to four mono corner coordinates in moonlight at 80%. It frames
the specimen bearing on the landing page and the voyage chart in the generation
moment.

### Dialog

Native `<dialog>` with `showModal()` — focus trap, Escape and `aria-modal` come
from the platform. Depth ground, 16px radius, hairline-strong border, 24px
padding, raised shadow, a `rgb(5 8 15 / 0.7)` backdrop, and body scroll locked
via `body:has(dialog[open])`. Title in Marcellus subtitle, description in
moonlight `body-small`, a 44px close IconButton pulled into the padding, and a
right-aligned footer row. Entry is the 400ms fade-up.

### Toast

Bottom-centered, above the tab bar (`4.75rem + safe-area`, 24px at `md`), depth
ground, control radius, panel shadow, fade-up entry, `aria-live="polite"`,
auto-dismiss at 4s, at most three on screen. Tone marks are a gold-bright star
(success) or an ember alert circle (error) — never a full-width colored banner.

### Navigation

- **Top bar:** wordmark left, sign-out IconButton right, bottom hairline. At `md` the three destinations sit inline: 44px tall, control radius, `body-small`/500, moonlight with a veil-30% hover, gold when active with a 9px gold star before the label.
- **Bottom tab bar (below `md`):** fixed, 64px, night ground, top hairline, safe-area padding. Each tab is a 20px lucide icon at 1.5px stroke over an uppercase mono label; the active tab turns gold and gains a 7px star above the icon. `aria-current="page"` on the active destination.
- **Locked state:** destinations ahead of the user's resume point render as non-navigating `aria-disabled` spans at 40% opacity with a plain-language title — never dead taps.
- **Nav labels are the one place the metaphor yields:** the bearing tab reads "Matches". The surface itself keeps bearing language.

### Tier Switcher

A three-segment `tablist` on a depth panel with 4px inner padding: each segment
is 48px tall, control radius, with a 9px star in the tier color beside a short
tier name and the count in mono beneath. The selected segment fills solid veil
with starlight text. Arrow keys move between segments.

### Signature Components

**Wordmark.** A gold four-point star beside POLARIS in Marcellus caps tracked at
0.22em, in three sizes (11/14/20px star). This is the entire identity — there is
no logotype file.

**StarField.** A fixed full-viewport canvas at `z-0`, `pointer-events-none`,
160–220 magnitude-varied stars (radius 0.4–1.6px, alpha 0.25–0.95) biased toward
the zenith, four slow twinklers on 6–9s cycles, and a ~4px-per-minute horizontal
drift capped at 30fps. Roughly one star in nineteen is gold and one in
twenty-three astral. Fully static under reduced motion.

**Route chart (HeroChart / RouteChart).** The product's central image: a
position cross labeled YOU ARE HERE low in frame, a Catmull-Rom dotted gold
route rising through four-point-star waypoints, and the north star labeled with
the destination in mono. Waypoint state carries progress — pending is a hairline
gold outline, current adds a 25% ring, done fills gold-bright. The draw-in is a
solid stroke animating through an SVG mask over 700ms expo-out, which reveals
the dashed route beneath; waypoints settle in behind it on a 60ms stagger. The
hero ships three fixed-aspect compositions (phone / tablet / wide) swapped by
`visibility`, never `display`, so the one-shot animation is not restarted at a
breakpoint crossing.

**ProgressRoute.** Horizontal route-line progress: a hairline track, a 2px gold
fill animating width over 400ms expo-out, 8px waypoint dots that fill gold as
they are passed, and a 16px north star at the far end that goes from 60% to full
opacity and gold-bright at completion. A real `progressbar`.

**StageReadout.** A line that types itself on at 16ms/char with a blinking gold
caret block, labeled by an uppercase gold mono tag. Screen readers get the whole
line immediately via a visually hidden copy; reduced motion renders it
instantly. This is the generation moment's entire vocabulary — stages accumulate
as a log rather than replacing one another. `tone` picks the typeface of the
line body: `"mono"` (default) for a short instrument reading, `"prose"` for the
generation moment, whose stages are sentences about the user and belong in
Hanken Grotesk — mono is for measurement, never a costume for prose.

**TierStar.** The tier marker: a drawn four-point star in the tier color plus the
tier's mono label in the same color. Never an emoji, never a colored dot.

**ReadinessMeridian** (`components/cv/ReadinessMeridian.tsx`). The CV readiness
instrument, and the one place a 0–100 number appears. It is plotted, not gauged:
a vertical meridian carrying one brass-gold dotted route from the datum up to
the north star of the locked destination, hairline degree ticks every 10 points
(every fifth long; 100 omitted because the apex is the star), the authored
`PositionCross` at the plotted position, and the numeral riding with the cross
as its readout — `35 / 100` over `YOU ARE HERE`. One route, part sailed: lit at
0.9 behind you, the same route at 0.22 ahead. The lit length and the marker
transition over 600ms on a score change. It replaced an earlier compass-arc
gauge, whose progress-ring-plus-hero-metric shape was a template borrowed from
outside this world rather than drawn from it.

**CompassSpinner.** A thin-line eight-point compass rose with mono cardinals
rotating on a 3.2s linear loop in gold. It is the only element exempted from the
reduced-motion kill switch, and the exemption swaps rotation for a quiet opacity
pulse — motion is removed, liveness is not.

**Skeleton.** A veil-60% block with a starlight-10% shimmer sweeping across it on
a 1.8s loop. The block stays visible when the shimmer stops; a skeleton is never
blank.

**EmptyState / ErrorState.** Empty is a 64px compass rose at 50% moonlight, a
Marcellus subtitle, one line of copy, one way forward. Error is a depth panel
with an ember 40% border, a 20px ember alert glyph, the problem named in
starlight, the recovery in moonlight, and a retry action — announced as
`role="alert"`.

## Do's and Don'ts

### Do:

- **Do** put content on the existing sky. The gradient and star field are global and fixed; a new surface adds no background of its own.
- **Do** use a bare `border` utility for any 1px line — the base layer already resolves it to 9% starlight hairline.
- **Do** express state by recoloring the 1px border (gold for selected/current, ember for invalid/error) rather than by adding fills, shadows or outlines.
- **Do** keep gold to one filled control per screen; every other action on that screen is secondary or ghost.
- **Do** set anything that was measured in the `mono-label` utility (0.6875rem, +0.14em, uppercase) — counts, tiers, dates, coordinates, salaries, readouts.
- **Do** quote the user's own words verbatim in starlight italic inside curly quotes, inline in the surrounding moonlight prose.
- **Do** give every interactive element a 44px minimum in both axes, including inline links inside dense rows.
- **Do** draw identity marks from `components/ui/glyphs.tsx` and functional icons from lucide-react at 1.5px stroke.
- **Do** ship exactly one authored motion per surface and make everything else a 150ms color transition.
- **Do** verify every new animation dies under `prefers-reduced-motion`; the only sanctioned exemption is `.motion-pulse-exempt` on the compass spinner.

### Don't:

- **Don't** use a zero-offset `box-shadow` as a glow, halo, or focus treatment. Both shadow tokens have vertical offset and negative spread; a ring is drawn in SVG or it does not exist.
- **Don't** introduce a neutral grey. If a value is not from the indigo family or mixed from starlight, it is wrong.
- **Don't** use pure black as a ground, border, or text color — abyss is the floor.
- **Don't** put a kicker, eyebrow, or floating mono label above a heading. Mono labels live inside instrument components.
- **Don't** bolden, letterspace, or otherwise fake weight on a Marcellus heading; the face has one weight and size is the hierarchy.
- **Don't** set prose, headings, or buttons in Fragment Mono. Monospace means measured.
- **Don't** use aurora, ember or gold as decoration — they only mark something that was actually assessed.
- **Don't** nest a card inside a card, or build a page out of same-size icon-card grids.
- **Don't** use emoji or unicode dingbats as icons; tiers are drawn stars with mono labels.
- **Don't** add `backdrop-filter`, gradient text, section numbers, or a gradient hero — all four are refused by the built world.
- **Don't** swap responsive compositions with `display: none` when a one-shot animation is involved; use `visibility` so the animation is not restarted at a breakpoint.
- **Don't** widen an authenticated surface past the single centered column; desktop widens gutters and charts, it does not add a second column.

---

<!-- Divergences from docs/DIRECTION.md, recorded as built. The build is
     authoritative; these are the places intent and artifact differ.

     1. Display letter-spacing ships at 0.01em (--text-display--letter-spacing),
        not the 0.02em DIRECTION specified for caps display — and the display
        line is set in sentence case, so the caps rule never applied.
     2. A second shadow token, --shadow-raised (0 24px 48px -16px rgb(0 0 0 /
        0.6)), exists for the modal tier. DIRECTION named only one shadow.
     3. Button ships a fourth variant, `destructive` (ember fill / night text),
        beyond the primary / secondary / ghost inventory DIRECTION listed.
     4. StarField tints roughly one star in 19 gold and one in 23 astral.
        DIRECTION specified magnitude variation only.
     5. Graticule edge ticks are drawn at 22% starlight; DIRECTION fixed the
        grid at 7% but left tick opacity unstated. Tick pitch (12px / 60px
        major) matches.
     6. lucide icons render at 14/16/18/20px depending on context rather than
        DIRECTION's single 20px default. Stroke weight is 1.5px throughout, as
        specified.
     7. The bearing tab is labeled "Matches" — a sanctioned PRODUCT.md
        exception, not a drift.
     8. Carried inconsistency, deliberately NOT canonized as a scale step: the
        mobile tab bar sets its mono label inline at 0.625rem instead of using
        the 0.6875rem `mono-label` utility, and JobRow's row title uses a
        one-off 1.125rem sans where TaskCard uses 1rem/500. The system rule is
        `mono-label` for instrument text and 1rem/500 sans for row titles;
        these two values are drift to reconcile, not tokens to inherit.
-->
