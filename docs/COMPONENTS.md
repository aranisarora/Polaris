# Polaris Components

The design system, built by A1. Import everything from `@/components/ui`
(barrel) or from the individual file. Types shown are the full public props.
`cn` (class combiner) lives at `@/lib/cn`.

General rules baked in:

- All touch targets are ≥44px. One primary (gold) Button per screen.
- Interactive components are keyboard-accessible with the global astral
  focus ring (`:focus-visible` in globals.css).
- A bare `border` class is a 1px starlight-9% hairline (set globally).
  `border-hairline-strong` = 16%. Panels/inputs sit on `bg-depth`.
- `mono-label` utility (globals.css): Fragment Mono, 0.6875rem, uppercase,
  0.14em tracking — for measurement/instrument text only, never prose.
- Type utilities: `text-display`, `text-h1`, `text-h2`, `text-h3`,
  `font-display` (Marcellus), `font-sans` (Hanken Grotesk), `font-mono`
  (Fragment Mono). Easing: `ease-out-expo`. Shadows: `shadow-panel`,
  `shadow-raised`.
- Named animations available as utilities: `animate-rose-spin`,
  `animate-north-pulse`, `animate-waypoint-flare`, `animate-shimmer`,
  `animate-caret`, `animate-fade-up`, `animate-quiet-pulse`. All stop under
  `prefers-reduced-motion` (globals.css kills them globally).

---

## Glyphs — `components/ui/glyphs.tsx`

Authored SVG identity marks. Decorative (aria-hidden) unless `label` is
passed. Strokes stay 1.5px at any size via non-scaling-stroke.

### StarGlyph

```ts
interface StarGlyphProps {
  size?: number;        // default 16
  color?: string;       // default "currentColor"
  filled?: boolean;     // default true; false = hairline outline
  className?: string;
  label?: string;       // accessible name; omit for decorative
}
```

```tsx
<StarGlyph size={14} className="text-gold" />
```

### WaypointGlyph

```ts
type WaypointState = "pending" | "current" | "done";
interface WaypointGlyphProps {
  size?: number;        // default 14
  state?: WaypointState; // default "pending" — pending: gold outline;
                         // current: filled gold + 25% halo ring; done: gold-bright fill
  color?: string;        // override the state color
  className?: string;
  label?: string;
}
```

```tsx
<WaypointGlyph state="current" size={14} label="Current waypoint" />
```

On task completion, ignite with `className="animate-waypoint-flare"`
(400ms scale 1→1.4→1 + brightness).

### NorthStarGlyph

```ts
interface NorthStarGlyphProps {
  size?: number;        // default 28
  color?: string;       // default "var(--color-gold-bright)"
  pulse?: boolean;      // default false — 4s scale pulse, the ONE ambient
                        // motion beyond the star field; auto-stops on reduced motion
  className?: string;
  label?: string;
}
```

```tsx
<NorthStarGlyph pulse label="Your north star" />
```

### PositionCross

```ts
interface PositionCrossProps {
  size?: number;        // default 24
  color?: string;       // default "var(--color-starlight)"
  className?: string;
  label?: string;
}
```

```tsx
<PositionCross size={24} label="You are here" />
```

### CompassRose

```ts
interface CompassRoseProps {
  size?: number;        // default 48
  color?: string;       // default "currentColor"
  labels?: boolean;     // default true — mono N/E/S/W; disable below ~32px
  className?: string;
  label?: string;
}
```

```tsx
<CompassRose size={64} className="text-moonlight/50" />
```

---

## Actions

### Button — `components/ui/Button.tsx`

```ts
type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "md" | "lg"; // md ≥44px, lg ≥52px
interface ButtonProps extends React.ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant; // default "primary" (gold bg, night text)
  size?: ButtonSize;       // default "md"
  loading?: boolean;       // inline CompassSpinner + disabled + aria-busy
}
```

```tsx
<Button size="lg" loading={pending} onClick={lock}>Lock this destination</Button>
```

Default `type="button"` — pass `type="submit"` in forms.

### LinkButton — `components/ui/Button.tsx`

Next.js `<Link>` styled exactly like Button (no `loading`).

```ts
interface LinkButtonProps extends React.ComponentPropsWithRef<typeof Link> {
  variant?: ButtonVariant; // default "primary"
  size?: ButtonSize;       // default "md"
}
```

```tsx
<LinkButton href="/bearing" variant="secondary">See your matches</LinkButton>
```

`buttonClasses({ variant, size, className })` is also exported for rare
custom hosts (e.g. a label).

### IconButton — `components/ui/IconButton.tsx`

```ts
interface IconButtonProps extends React.ComponentPropsWithRef<"button"> {
  "aria-label": string;             // required
  variant?: "ghost" | "secondary";  // default "ghost"
}
```

```tsx
<IconButton aria-label="Refresh bearing" onClick={refresh}><RefreshCw size={18} /></IconButton>
```

44×44px. Default `type="button"`.

---

## Forms

### Field — `components/ui/Field.tsx`

```ts
interface FieldProps {
  label: string;
  htmlFor?: string;   // id of the control inside
  help?: string;      // quiet guidance; hidden while error is set
  error?: string;     // ember, role="alert" — name the problem
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}
```

```tsx
<Field label="Location" htmlFor="loc" error={errors.loc}><Input id="loc" invalid={!!errors.loc} /></Field>
```

### Input / Textarea / Select

All extend the native element props (ref included) plus:

```ts
interface InputProps    extends React.ComponentPropsWithRef<"input">    { invalid?: boolean }
interface TextareaProps extends React.ComponentPropsWithRef<"textarea"> { invalid?: boolean }
interface SelectProps   extends React.ComponentPropsWithRef<"select">   {
  invalid?: boolean;
  wrapperClassName?: string; // width/layout classes go here (relative wrapper)
}
```

```tsx
<Input id="company" placeholder="Company" />
<Textarea id="dream" rows={5} placeholder="Describe your dream job — company, role, or just a feeling." />
<Select id="country" defaultValue="gb"><option value="gb">United Kingdom</option><option value="us">United States</option></Select>
```

44px min height, depth ground, hairline border, astral focus. `invalid`
sets the ember border + `aria-invalid`; pair it with Field's `error`.
`CONTROL_CLASSES` (the shared control style string) is exported from
`Input.tsx` if you must style a custom control identically.

### ChoiceCard + ChoiceCardGroup — `components/ui/ChoiceCard.tsx` (client)

Radio-semantics cards: group is `role="radiogroup"`, cards are
`role="radio"`, arrow keys move + select.

```ts
interface ChoiceCardGroupProps {
  label: string;                    // the question, for assistive tech
  value: string | null;
  onChange: (value: string) => void;
  className?: string;               // default layout: "grid gap-2.5"
  children: React.ReactNode;        // ChoiceCards
}
interface ChoiceCardProps {
  value: string;
  title: string;
  description?: string;
  tag?: string;        // mono instrument tag, e.g. "Suggested from your dream"
  disabled?: boolean;
  className?: string;
}
```

```tsx
<ChoiceCardGroup label="What kind of work do you dream of?" value={sector} onChange={setSector}>
  <ChoiceCard value="design" title="Design" />
  <ChoiceCard value="startup" title="Startup" tag="Suggested from your dream" />
</ChoiceCardGroup>
```

Selected = gold hairline + star glyph. Must be rendered from a client
component (controlled value).

---

## Surfaces

### Panel — `components/ui/Panel.tsx`

```ts
interface PanelProps extends React.ComponentPropsWithRef<"div"> {
  padding?: "none" | "md" | "lg"; // default "md" (p-5); lg = p-6 md:p-8
}
```

```tsx
<Panel padding="lg"><h2 className="text-h2">Your position</h2>…</Panel>
```

Depth ground, hairline border, `shadow-panel`. Never nest Panels.

### ChartFrame — `components/ui/ChartFrame.tsx`

The chart instrument: tick-marked border + mono corner coordinates.

```ts
interface ChartFrameProps {
  children: React.ReactNode;
  topLeft?: string;     // mono corner labels, e.g. "BEARING 042°"
  topRight?: string;
  bottomLeft?: string;
  bottomRight?: string;
  grid?: boolean;       // default false — also draw the interior 48px graticule
  className?: string;
  contentClassName?: string; // default "p-6"
}
```

```tsx
<ChartFrame topLeft="ROUTE 01" bottomRight="9 WAYPOINTS" grid>{chart}</ChartFrame>
```

### Dialog — `components/ui/Dialog.tsx` (client)

Native `<dialog>` modal: focus trap, Escape, aria-modal, backdrop click to
close, body scroll lock.

```ts
interface DialogProps {
  open: boolean;
  onClose: () => void;   // Escape, backdrop, close button
  title: string;         // required — labels the dialog
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode; // right-aligned action row
  className?: string;
}
```

```tsx
<Dialog open={open} onClose={close} title="Course locked" footer={<Button onClick={go}>Draw my route</Button>}>…</Dialog>
```

---

## States

### Skeleton — `components/ui/Skeleton.tsx`

```ts
interface SkeletonProps { className?: string } // size it: "h-4 w-48"
```

```tsx
<div aria-busy="true" className="grid gap-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-24" /></div>
```

Depth block with a veil shimmer; static under reduced motion. Show within
400ms of any load; never a blank screen, never a spinner-only page.

### EmptyState — `components/ui/EmptyState.tsx`

```ts
interface EmptyStateProps {
  title: string;
  body?: string;
  action?: React.ReactNode; // one Button/LinkButton pointing forward
  className?: string;
}
```

```tsx
<EmptyState title="The sky is clear" body="No postings matched. Broaden your keywords." action={<Button onClick={edit}>Edit your dream</Button>} />
```

### ErrorState — `components/ui/ErrorState.tsx`

```ts
interface ErrorStateProps {
  title: string;            // name the problem
  detail?: string;          // name the recovery / what was preserved
  action?: React.ReactNode; // wired retry Button
  className?: string;
}
```

```tsx
<ErrorState title="The bearing couldn't be taken" detail="The job providers didn't answer. Your profile is untouched." action={<Button onClick={retry}>Try again</Button>} />
```

`role="alert"`.

### Toast — `components/ui/Toast.tsx` (client)

```ts
type ToastTone = "default" | "success" | "error";
interface ToastOptions { tone?: ToastTone; duration?: number } // default 4000ms
// <ToastProvider>{children}</ToastProvider>
// useToast(): { toast(message: string, options?: ToastOptions): void }
```

```tsx
const { toast } = useToast();
toast("+4 — your chart brightens", { tone: "success" });
```

Quiet, bottom-anchored (clears the mobile tab bar), auto-dismisses, max 3.
**AppShell already provides ToastProvider** — every authenticated surface
can call `useToast()` from any client component. Throws outside a provider.

---

## Instruments

### TierStar — `components/ui/TierStar.tsx`

```ts
interface TierStarProps {
  tier: Tier;           // "ready" | "attainable" | "stretch" (lib/types)
  showLabel?: boolean;  // default true — mono TIER_LABEL text
  size?: number;        // glyph px, default 12
  className?: string;
}
```

```tsx
<TierStar tier="stretch" />
```

Colors: ready→aurora, attainable→gold, stretch→ember. `TIER_COLOR`
(Record<Tier, string> of CSS vars) is also exported.

### ProgressRoute — `components/ui/ProgressRoute.tsx`

```ts
interface ProgressRouteProps {
  percent: number;    // 0–100; width animates 400ms ease-out-expo
  waypoints?: number; // dot count incl. start; far end is the north star; 0 = none
  label?: string;     // aria-label, default "Progress"
  className?: string;
}
```

```tsx
<ProgressRoute percent={33} waypoints={9} label="Roadmap progress" />
```

`role="progressbar"`. Onboarding starts at ~10, never 0.

### StageReadout — `components/ui/StageReadout.tsx` (client)

```ts
interface StageReadoutProps {
  label: string;      // instrument label, e.g. "READING" — mono gold
  text: string;       // narration line; types on
  speed?: number;     // ms per character, default 16
  tone?: "mono" | "prose"; // typeface of the line body, default "mono"
  onDone?: () => void; // fires once when typing finishes — use to sequence stages
  className?: string;
}
```

```tsx
<StageReadout label="Comparing" text="41 live postings for Product Designer measured against your chart." onDone={next} />
<StageReadout label="Comparing" tone="prose" text="…" onDone={next} />
```

Gold caret while typing; instant + immediate `onDone` under reduced motion;
screen readers get the full line at once.

`tone="mono"` is a short instrument reading. `tone="prose"` sets the body in
Hanken Grotesk at 1rem/relaxed for lines that are sentences about the user —
the roadmap generation moment uses it. The label stays mono gold either way.
Under `sm` the label stacks above the line; at `sm`+ it becomes a fixed gutter
so a log of stages hangs off one left edge.

### CompassSpinner — `components/ui/CompassSpinner.tsx`

```ts
interface CompassSpinnerProps {
  size?: number;   // default 32; cardinal letters appear at ≥40
  label?: string;  // sr-only announcement, default "Loading"; "" to silence
  className?: string;
}
```

```tsx
<CompassSpinner size={48} />
```

`role="status"`. Reduced motion: rotation stops, quiet opacity pulse
remains (the one sanctioned motion exemption).

---

## World

### StarField — `components/ui/StarField.tsx` (client)

```ts
interface StarFieldProps { className?: string }
```

```tsx
<StarField />
```

Fixed full-viewport canvas at z-0, pointer-events-none. **Already mounted
once in `app/layout.tsx` — do not mount a second one.**

### Graticule — `components/ui/Graticule.tsx`

```ts
interface GraticuleProps {
  grid?: boolean;  // default true — 48px hairline grid at 7% starlight
  ticks?: boolean; // default true — edge degree ticks (every 12px, 5th longer)
  className?: string;
}
```

```tsx
<div className="relative h-[55vh]"><Graticule />{chart}</div>
```

Decorative (aria-hidden); fills the nearest positioned ancestor.

### Wordmark — `components/ui/Wordmark.tsx`

```ts
interface WordmarkProps { size?: "sm" | "md" | "lg"; className?: string }
```

```tsx
<Link href="/"><Wordmark size="lg" /></Link>
```

---

## Shell

### AppShell — `components/shell/AppShell.tsx` (client)

```ts
interface AppShellUser { name: string | null; email: string | null }
interface AppShellProps {
  user: AppShellUser;
  phase: FlowPhase;          // resume phase from lib/flow.ts
  children: React.ReactNode;
}
```

Rendered by `app/(app)/layout.tsx` — feature agents never mount it.
Mobile: top bar (wordmark + sign-out POSTing to `/auth/signout`) + fixed
bottom tab bar (Matches / Roadmap / CV, 44px+, safe-area padded). Desktop
(md+): single top bar with inline nav. Active tab is gold with a star glyph.
While `phase` is `onboarding` or `profile` the tabs are not yet reachable:
they render as `aria-disabled` non-navigating spans at `opacity-40` with the
tooltip "Opens once your profile is saved". The `/bearing` tab is labelled
**Matches** — navigation is the one place the metaphor yields to
comprehension; the surface itself keeps its bearing language.
Wraps children in `ToastProvider` and a `<main id="main">` with page
padding (max-w-6xl) — pages just render content.

---

## Hooks

### useReducedMotion — `components/ui/use-reduced-motion.ts` (client)

```ts
function useReducedMotion(): boolean // SSR-safe, false on the server
```

```tsx
const reduced = useReducedMotion();
```

Use it to swap authored motion (route draw-in, waypoint flare) for instant
states in client components.
