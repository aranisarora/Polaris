# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) as an installable PWA, Tailwind v4, Supabase (Postgres + Auth with Google OAuth, RLS on all user tables), Gemini for all AI reasoning (server-side only), Jooble + Adzuna behind a single JobProvider interface (free tiers; keys arrive later — the reality check ships a designed "not configured" state until then). Confirmed by the user in the build brief.

## Users

Any job seeker, US + UK. One core flow — no segmentation by seniority or sector. Landing traffic arrives from paid/organic social: low intent, ~90% mobile, ~5 seconds of attention. Authenticated users are people who named a dream job and want an honest, personal route to it.

## Product Purpose

Polaris helps job seekers reach their dream job. The user names where they dream of ending up; Polaris shows what's actually achievable right now based on real posted job requirements; they lock in a target; Polaris generates a personalized roadmap that closes the gap — their CV updating live as they complete it. The emotional arc is the product: honest about today, ambitious about the destination.

## Positioning

"We'll tell you what's actually achievable." Every classification and roadmap task shows its why, grounded in real posted job requirements compared against the user's own profile — not aspirational fluff, not a generic tier template. Neighboring products either flatter (career-coach content) or overwhelm (job boards); Polaris takes an honest bearing and charts a personal route.

## Operating Context

Five-phase flow: onboarding ("Where do you dream of going?") → profile via CV upload or questionnaire ("Where are you now?") → reality check with real jobs tiered 🟢/🟡/🔴 against the profile ("What's actually possible?") → locked target → narrated roadmap generation and a living CV that un-greys as tasks complete. Progress saves after every step; abandoning and returning resumes exactly where the user left off. Check-ins at most once per 48h, never blocking.

## Capabilities and Constraints

- Personalization is the product: the user's own words (dream description, projects, specifics) reappear verbatim in the reality check and roadmap ("Because you said you want ___…"). What they type is never flattened into a visible category label.
- Roadmap generation is a staged, narrated moment referencing their data — never a spinner.
- The dream job is always shown in the reality check, pinned, tiered honestly (usually 🔴), never hidden. Stretch is framed as trajectory, not rejection.
- CV readiness score (0–100) never decreases from check-in answers.
- Scope lock: no analytics, no pricing, no feature grid. Landing is one page, one action.
- All Gemini calls server-side. Job search results cached per user-query for 24h.
- UX ground rules: touch targets ≥44×44px, one primary CTA per screen, ≤9 items per uncategorized list, feedback <100ms with skeletons past 400ms, conventional interaction patterns (identity lives in the visual layer and copy).
- If polish ever trades against personalization-feel, personalization wins.

## Brand Commitments

Name: Polaris. Identity concept (binding): **Night Sky Navigator** — the dream job is the user's north star; the app is celestial navigation. The roadmap is a star chart with waypoints; onboarding is "charting your course"; the reality check is "taking a bearing." Mood: quiet, premium, aspirational — a planetarium, not a job board. Copy voice: calm, certain, second-person ("Your north star." "Chart your course." "You are here.") — never corporate job-board language. No existing logo/wordmark; the design system has free rein to create the identity from scratch (confirmed 2026-08-06).

Navigation labels are the one exception to the metaphor: the bearing tab reads "Matches" so low-intent arrivals know where real postings live; the surface itself keeps its bearing language.

## Evidence on Hand

None — pre-launch. The landing page's social-proof section is explicitly a structural placeholder (structure now, content later). Never fabricate testimonials, user counts, or press. Job data at runtime is real (Jooble + Adzuna postings). A vendor-strategy research doc exists at the repo owner's desktop (`polaris-job-market-data-research.md`) for future data-layer expansion; out of scope for this build.

## Product Principles

1. Honest about today, ambitious about the destination — never hide the hard truth, always frame it as trajectory.
2. Made for them, not their category — the user's own words carry through every surface.
3. The moment matters — generation, locking, completion are designed peaks, not transactions.
4. Progress is never lost — every step saved, every return resumes.
5. Conventional interactions, distinctive skin — identity lives in visuals and voice, never novel UI patterns.

## Accessibility & Inclusion

Touch targets ≥44×44px throughout. Motion is restrained and must respect `prefers-reduced-motion`. Dark, low-luminance visual world must maintain readable contrast for body text and controls (WCAG AA).
