# Polaris — Build Spec

Read with PRODUCT.md (product truth), docs/DIRECTION.md (visual world),
docs/CONTRACTS.md (interfaces), lib/types.ts, supabase/schema.sql.
Scope lock: build ONLY what is specified. Personalization beats polish when
they conflict. Every screen ships loading/empty/error states. No analytics.

## Landing `/` (public, Persuade, mobile-first)

Visitors: paid/organic social, low intent, ~5s attention, ~90% mobile.
Single scroll, no nav maze, one action. Static (no Supabase on first paint);
Core Web Vitals green — star chart is inline SVG/CSS, fonts via next/font,
zero client JS above the fold except the sign-in button.

1. **Hero** = DIRECTION's FIRST VIEWPORT: wordmark; full-bleed star chart
   (~55vh) — YOU ARE HERE cross low, dotted gold route through 3 waypoints to
   a labeled north star; headline "Every dream job has coordinates."; subline
   "We'll tell you what's actually achievable — and chart the route to the
   rest."; ONE gold CTA "Chart your course" → Google OAuth → onboarding.
   Nothing else above the fold.
2. **Show, don't claim**: the product's screenshot-worthy moment rebuilt as a
   real component (not an image): a framed ChartFrame showing a mini tiered
   reality check — pinned dream (ember STRETCH with honest reasoning line) +
   attainable (gold) + ready (aurora) rows connected by a route line. Copy:
   "Jobs like these build the experience your dream requires."
3. **How it works** — exactly 3 steps, one line each: Name your north star →
   Take your bearing → Follow your route. Quiet, no icon-card grid — set as a
   route with three waypoints.
4. **Social proof placeholder** — structure only: section titled "Navigators"
   with 2–3 quote slots rendered as clearly-designed placeholder frames
   (greeked lines, no invented names/claims). Structure now, content later.
5. **Closing CTA** — restate the promise in one line + the same gold CTA.
No pricing, no feature grid, no analytics scripts, no cookie banner.
Auth'd visitors are server-redirected to their resume point.

## Phase 1 — Onboarding `/onboarding`

Multi-step wizard, ONE question per screen. ProgressRoute starts at ~10%,
never 0. Progress saved after EVERY step (server action); returning resumes
at `current_step`. Steps:
1. **Dream** — "Where do you dream of going?" One free-text textarea:
   "Describe your dream job — company, role, or just a feeling." Stored
   verbatim; Gemini interpretation stored alongside (failure tolerated).
   Fast track: a clearly-secondary link below ("I already know my exact
   target") expanding company + role inputs → completes onboarding, skips to
   /profile. Never competes visually with the textarea.
2. **Sector** — ≤7 ChoiceCards + "Something else" with inline text input.
3. **Company type** — ≤7 ChoiceCards, smart default pre-selected from the
   dream interpretation (e.g. companyHints mention a startup → preselect),
   shown as "Suggested from your dream" mono tag on that card.
Completion → brief transition moment ("Course charted. Now — where are you
today?") → /profile.

## Phase 2 — Profile `/profile`

Two paths, CV upload visibly recommended:
- **CV upload (default)**: dropzone + file picker (PDF ≤8MB, 44px+ targets).
  No CV? Collapsed disclosure: "Export your LinkedIn as a PDF" — 3 short
  steps. Upload → POST /api/cv/parse with progress state → **confirmation
  screen**: parsed CVData rendered in editable grouped sections (basics,
  experience, education, skills, projects) — user sees exactly what the
  system understood, edits inline, confirms → saveProfile.
- **Questionnaire**: for no-CV users AND offered after CV confirm as
  "Anything your CV doesn't show?" (optional, skippable). ≤9 fields per step
  in labeled groups; labels 4–8px above inputs; flexible date/text formats.
Already-completed visits show current profile with re-upload/edit options.

## Phase 3 — Reality check `/bearing`

On first entry: "Taking your bearing" — POST /api/jobs/search then
/api/jobs/classify in batches (skeleton JobRow cards stream in; never blank).
- **Dream pinned at top, always**: DreamAssessment card — tier star (honest,
  usually ember), reasoning that QUOTES their dream text verbatim, have/missing
  requirement chips. Never hidden or filtered.
- Below: classified jobs grouped by tier — tab/segment control (Ready /
  Attainable / Stretch), each group headed by one line of trajectory framing:
  "Jobs like these build the experience your dream job requires." ONE
  highlighted "Recommended target" per tier (gold hairline + mono tag).
- Each JobRow: title, company, location, salary when known, TierStar, the WHY
  visible: "You have 4 of 6 requirements" + expandable have/missing lists +
  reasoning sentence. Source link. 44px+ targets.
- **Lock**: each row has "Lock this destination"; dream card has "Lock the
  dream itself". Locking → confirmation moment (Dialog): route glyph, "Course
  locked: [title] at [company]." + what happens next → CTA "Draw my route" →
  /roadmap. If target ≠ dream: one line "Your north star stays on the chart —
  this waypoint builds toward it."
- Unconfigured providers → full-screen designed state: "The sky is quiet —
  job search isn't configured yet." + which keys are missing (names only) +
  retry. Partial failure (one provider down) → quiet inline notice, results
  from the healthy provider still shown.
- Refresh action re-queries (cache makes it cheap). Empty results → EmptyState
  with suggestions (broaden keywords — offers editing dream/sector).

## Phase 4 — Roadmap `/roadmap`

No roadmap yet + locked target → **the generation moment** (full screen, the
product's peak): "Generate roadmap" CTA → POST /api/roadmap/generate, NDJSON
stages render as StageReadout instrument lines typing on, each referencing
real data (real skill count, named project, real posting count, 3 named
gaps). Then the reveal: route draws itself across the chart, waypoints
appear, first task highlighted. This must feel like a cartographer handing
over a chart drawn for them alone. Errors mid-stream → ErrorState + retry
(idempotent server side).
Roadmap view:
- ChartFrame star chart: route from YOU ARE HERE through task waypoints to
  the north star (target). Overall ProgressRoute + mono readout "3 OF 9
  WAYPOINTS". Current task waypoint visually distinct (pulse); done ignited.
- Task list below chart (mobile) / beside (desktop): ordered RoadmapTask
  cards — title, category, effort, done toggle, and the WHY always visible,
  tied to their profile + target's real requirements ("Because you said you
  want '<verbatim>' and 5 of 8 postings require X…"). First task marked
  "This week" (mono tag).
- Completing a task: waypoint ignition + small acknowledgment line + score
  nudge toast ("+4 — your chart brightens"). Un-done allowed.
- Stepping-stone footer, always visible when applicable: "This route gets you
  to [target]. From there, [dream] becomes attainable."
- Locked target summary row with "Change destination" → /bearing (confirm
  dialog: regenerating replaces the route).

## Phase 5 — Living CV `/cv`

- **Diff view**: the target-state CV — earned lines normal, unearned lines
  greyed (40% starlight) each with a mono tag naming its task; completing the
  task un-greys live (400ms starlight fade + gold tick). Sections grouped
  with clear common-region panels: header/basics, experience, projects,
  skills, education.
- **Readiness score**: 0–100 prominent — a compass-rose arc gauge, mono
  numeral, one-line meaning ("Ready to be seen by [target company]-class
  reviewers" tiers of copy). NEVER decreases (enforced server-side).
- **Version history**: drawer/section listing cv_versions (date, reason,
  score) — view snapshot + "Restore this version" (creates a new version).
- **Export**: one gold button → GET /api/cv/export → clean single-column PDF
  of earned lines only. Loading state on button.
- Empty state (no roadmap yet): compass EmptyState pointing to /bearing.

## Check-ins (global, in (app) shell)

On app open, if due (max once per 48h): Dialog "While you were away" — ≤3
yes/no questions from open tasks ("Have you finished 'X'?"). Yes → marks done
(never un-marks). One-tap dismiss. Never blocks; never re-asks within 48h.

## PWA

manifest.webmanifest (name Polaris, short_name Polaris, display standalone,
background #05080F, theme #0A1226, icons 192/512 + maskable via
scripts/icons.mjs sharp render of the star glyph SVG), service worker
(public/sw.js): precache app shell assets, network-first pages, cache-first
static; registered by a small client component in root layout. Installable on
desktop + mobile; apple-touch-icon; viewport theme-color matches.

## Acceptance criteria (finish gate)

Visitor understands the promise in 5s → Google sign-in → onboarding (or fast
track) → CV parsed + confirmed → real tiered list with dream pinned → lock →
narrated personal generation → roadmap where every task shows a personal why
→ toggling tasks un-greys CV lines + raises score → PDF export. Mobile +
desktop, installable PWA, `npm run build` clean, every state designed, no
placeholder anywhere except the labeled social-proof slots.

---

# Agent file ownership (build workflow)

NEVER write outside your set. Shared read: docs/*, lib/types.ts, PRODUCT.md.

**A1 design-system**: app/globals.css, app/layout.tsx (fonts, contract
comment, metadata/viewport, StarField, PWA register mount), components/ui/*
(full DIRECTION inventory + glyphs.tsx), components/shell/AppShell.tsx,
app/(app)/layout.tsx (auth guard + shell + CheckInGate placeholder slot),
lib/cn.ts, docs/COMPONENTS.md, app/not-found.tsx, app/error.tsx,
app/loading.tsx.

**A2 platform**: lib/supabase/*, proxy.ts (Next 16's rename of
middleware.ts), app/auth/callback/route.ts,
app/auth/signout/route.ts, lib/flow.ts, lib/gemini/{client,json}.ts,
lib/jobs/* (provider, jooble, adzuna, search/merge/cache), lib/score.ts,
public/manifest.webmanifest, public/sw.js, components/pwa/RegisterSW.tsx,
scripts/icons.mjs + public/icons/*, .env.example, supabase/README.md.

**B1 landing**: app/page.tsx, components/landing/*.
**B2 onboarding**: app/(app)/onboarding/**, components/onboarding/*,
lib/gemini/prompts/dream.ts.
**B3 profile**: app/(app)/profile/**, app/api/cv/parse/route.ts,
components/profile/*, lib/gemini/prompts/cv.ts.
**B4 bearing**: app/(app)/bearing/**, app/api/jobs/{search,classify}/route.ts,
app/api/dream/assess/route.ts, components/bearing/*,
lib/gemini/prompts/classify.ts.
**B5 roadmap**: app/(app)/roadmap/**, app/api/roadmap/generate/route.ts,
components/roadmap/*, lib/gemini/prompts/roadmap.ts.
**B6 living-cv**: app/(app)/cv/**, app/api/cv/export/route.ts,
components/cv/*, components/checkin/*, lib/cvdiff.ts, MAY edit
app/(app)/layout.tsx ONLY to wire CheckInGate (sole phase-B editor of it).

**C integration**: any file — builds, fixes, wires; runs alone after B.
