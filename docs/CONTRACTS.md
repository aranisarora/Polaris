# Polaris — Interface Contracts

Binding for every agent. Types referenced here live in `lib/types.ts`.
DB tables live in `supabase/schema.sql`. Do not invent new shared surface —
extend your own feature's files only.

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | public | Landing. If already authed AND onboarded, server-redirect to resume point. |
| `/onboarding` | auth | Phase 1 wizard (3 steps + fast track). |
| `/profile` | auth | Phase 2: CV upload + parse confirm, or questionnaire. |
| `/bearing` | auth | Phase 3 reality check + lock target. |
| `/roadmap` | auth | Phase 4: generation moment + star-chart roadmap. |
| `/cv` | auth | Phase 5: living CV, versions, score, export. |
| `/auth/callback` | public | OAuth code exchange (route handler). |
| `/auth/signout` | auth | POST → sign out → redirect `/`. |

Auth pages live under route group `app/(app)/` sharing `app/(app)/layout.tsx`
(AppShell + CheckInGate). `proxy.ts` (Next 16's rename of `middleware.ts`)
refreshes the Supabase session and redirects unauthenticated visitors of
`(app)` routes to `/`.

### Flow resume — `lib/flow.ts`

`resolvePhase(supabase, userId): Promise<FlowPhase>`:
1. onboarding row missing or `completed_at` null → `onboarding`
2. career_profiles `completed_at` null → `profile`
3. no active locked_targets row → `bearing`
4. no active roadmaps row → `roadmap`
5. else → `roadmap` if any task not done, `cv` never forced — default `roadmap`.
Authenticated visit to `/` and to a phase *ahead* of the resume point
redirects to `FLOW_ROUTE[phase]`. Earlier phases stay reachable (users may
revisit onboarding answers or profile).

## Supabase access

- Browser: `lib/supabase/client.ts` → `createBrowserClient` (@supabase/ssr)
  with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Server (RSC/actions/routes): `lib/supabase/server.ts` →
  `createServerClient` bound to `cookies()`. ALWAYS the user-scoped client —
  RLS enforces ownership. `SUPABASE_SECRET_KEY` exists in env but is reserved;
  do not use it in feature code.
- `proxy.ts` delegates to `lib/supabase/middleware.ts`, which uses the
  @supabase/ssr middleware pattern (getAll/setAll).

## Gemini — `lib/gemini/`

- `client.ts` (server-only): `getGemini()` → GoogleGenAI with
  `GEMINI_API_KEY`; `MODEL` = `process.env.GEMINI_MODEL ?? "gemini-2.5-flash"`.
- `json.ts`: `generateJSON<T>(opts: { prompt: string; schema: ZodType<T>;
  system?: string; temperature?: number }): Promise<T>` — calls
  `responseMimeType: "application/json"`, validates with zod, retries once on
  parse/validation failure, retries once with backoff on 429/503. Throws
  `GeminiError` with a user-safe `message`.
- Feature prompts live in `lib/gemini/prompts/<feature>.ts` and are owned by
  that feature's agent. Every prompt that reasons about the user MUST receive
  and use their verbatim `dream_text` and `quotedPhrases`.

## Job providers — `lib/jobs/`

```ts
export interface JobProvider {
  readonly name: "jooble" | "adzuna";
  configured(): boolean;
  search(q: JobQuery): Promise<JobPosting[]>; // throws ProviderError
}
```
- `jooble.ts`: `POST https://jooble.org/api/${JOOBLE_API_KEY}` body
  `{ keywords, location, page: "1" }`. Map `jobs[]` → JobPosting
  (`salary` → `{ text }`, `link` → url, `updated` → postedAt).
- `adzuna.ts`: `GET https://api.adzuna.com/v1/api/jobs/{country}/search/1`
  query `app_id, app_key, what, where, results_per_page=25,
  content-type=application/json`. Map `results[]` → JobPosting with
  salary_min/salary_max (currency GBP for gb, USD for us).
- `search.ts`: `searchJobs(supabase, userId, q): Promise<JobSearchResult>` —
  checks `job_search_cache` (hash = sha256 of normalized query JSON, TTL 24h),
  else queries all configured providers in parallel (`Promise.allSettled`),
  merges + dedupes by `normalize(title)+normalize(company)+normalize(city)`
  (lowercase, strip punctuation/whitespace; city = first location segment).
  On duplicate, keep the Jooble record but merge Adzuna's structured salary.
  Caps at 24 postings, balanced across tiers of relevance (keep input order).
  Persists to cache. Zero configured providers → returns
  `{ postings: [], providers: [{configured:false}...], cached: false }` —
  the UI renders the designed "instruments not configured" state, never a crash.

## API routes & server actions

Mutations are server actions colocated at `app/(app)/<feature>/actions.ts`.
Route handlers exist only where actions can't serve (streaming, binary, upload).
Every handler/action: auth-check first (401/redirect), zod-validate input,
never leak provider errors raw (map to user-safe messages).

| Endpoint | Shape |
|---|---|
| action `saveOnboardingStep` | partial OnboardingState → upserts `onboarding`, sets `current_step`; step 1 also calls Gemini for `dream_interpretation` (non-blocking failure: store null, proceed). Fast-track sets all + `completed_at`. |
| action `saveProfile` | `{ cv?: CVData; questionnaire?: QuestionnaireAnswers }` → upsert `career_profiles` with `completed_at`, insert first `cv_versions` snapshot (score via `lib/score.ts`). |
| `POST /api/cv/parse` | multipart form `file` (PDF ≤ 8MB) → Gemini (inlineData application/pdf) → `{ cv: CVData }`. Does NOT persist; client shows confirm/edit then calls `saveProfile`. Uploads original to storage `cvs/{userId}/cv.pdf` (best-effort). |
| `POST /api/jobs/search` | `{}` → reads onboarding + profile, builds JobQuery (keywords from `dream_interpretation.searchKeywords` or fast-track role; location/country from profile hints, default gb) → `JobSearchResult`. |
| `POST /api/jobs/classify` | `{ postings: JobPosting[] }` (≤ 24) → Gemini in batches of 8 (one call per batch, JSON array out) vs the career profile → upserts `job_assessments`, marks `recommended` per tier (highest matchScore) → `{ classified: ClassifiedJob[] }`. |
| `POST /api/dream/assess` | `{}` → Gemini: dream vs profile (uses real posting requirements when a matching posting exists in results) → upsert `job_assessments` with `is_dream: true` → `{ dream: DreamAssessment }`. |
| action `lockTarget` | `{ assessmentId }` or `{ dream: true }` → deactivate previous, insert `locked_targets` (`dream_beyond` = dream title when stepping-stone) |
| `POST /api/roadmap/generate` | `{}` → NDJSON stream of `GenerationEvent`. Stages MUST be real work, personalized: `reading` (profile facts: n skills, named project), `comparing` (real count of cached postings for the target role), `gaps` (3 named gaps from assessments), `sequencing`. Final Gemini call returns 6–10 RoadmapTask drafts (each with why referencing profile specifics + posting requirements, effort, cvLine, category; task 1 `firstWeek: true`). Persist roadmap + tasks (deactivate prior), emit `done`. On failure mid-stream emit `error`. |
| action `toggleTask` | `{ taskId, done }` → update task, snapshot `cv_versions` (reason = task title), score via `lib/score.ts` — `max(previousScore, newScore)`, never lower. |
| action `answerCheckin` | `{ checkinId, answers: [{taskId, done}] }` → updates tasks (done only — never un-done from a check-in), completes checkin, snapshots version. |
| `GET /api/cv/export` | → `application/pdf` via @react-pdf/renderer: earned lines only, one clean single-column template (Polaris-branded footer line), filename `polaris-cv.pdf`. |

## Check-ins

`app/(app)/layout.tsx` (server) computes due-ness: latest checkin `asked_at`
older than 48h (or none) AND an active roadmap with ≥1 not-done task → create
a `checkins` row with ≤3 questions from the oldest not-done tasks ("Have you
finished 'X'?") and pass it to `<CheckInGate checkin={...}>` (client). Dialog:
≤3 yes/no rows, one-tap dismiss (records `completed_at` with empty answers),
never blocks the page behind it. Never shown when one was asked <48h ago.

## Score — `lib/score.ts`

`computeScore(profile: CVData, tasks: RoadmapTask[]): number` — deterministic,
no AI: 35 base (profile complete) + 65 × (weighted done tasks / all tasks)
where task weight = category weight (project 1.5, experience 1.5,
certification 1.2, skill 1.0). Round; clamp 0–100. Callers apply the
never-decrease rule against the latest stored version.

## CV diff — `lib/cvdiff.ts` (owned by living-CV agent)

`buildDiff(profile: CVData, tasks: RoadmapTask[]): CVDiffLine[]` — real CV
lines (earned) merged with `cvLine`s of not-done tasks (unearned, greyed,
linked to `taskId`), grouped by section in fixed order: basics header,
experience, projects, skills, education.

## Env

```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  — client + server
SUPABASE_SECRET_KEY      — reserved, server only, unused by feature code
GEMINI_API_KEY, GEMINI_MODEL (default gemini-2.5-flash) — server only
JOOBLE_API_KEY           — server only, optional (provider unconfigured state)
ADZUNA_APP_ID, ADZUNA_APP_KEY — server only, optional
NEXT_PUBLIC_SITE_URL     — OAuth redirect base
```
Gemini free tier is ~10 req/min: batch classifications (8/call), keep roadmap
generation ≤4 model calls total, retry-once on 429 with 6s backoff.
Per-user budget: `proxy.ts` matches the four Gemini endpoints (cv/parse,
jobs/classify, dream/assess, roadmap/generate) and `lib/supabase/middleware.ts`
claims a slot via the `claim_gemini_slot` RPC (6 requests / 60s per user —
sized so the bearing burst of 3 classify batches + dream assess fits) before
the route runs; over budget → 429 `{ error }` with the designed "at capacity"
copy. Missing migration fails open.

## Global states matrix (every screen designs all of these)

- Loading: skeletons (never blank, never spinner-only page) within 400ms.
- Empty: EmptyState with compass rose + a next action.
- Error: ErrorState naming problem + recovery (retry button wired).
- Unconfigured (bearing only): "The sky is quiet" provider state.
- All buttons: pending state (disabled + subtle progress) during actions.
