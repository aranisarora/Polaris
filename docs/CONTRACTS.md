# Polaris — Interface Contracts

Binding for every agent. Types referenced here live in `lib/types.ts`.
DB tables live in `supabase/schema.sql`. Do not invent new shared surface —
extend your own feature's files only.

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | public | Landing. Statically prerendered — the redirect for authed visitors happens in `proxy.ts`, not in the page (see below). |
| `/onboarding` | auth | Phase 1 wizard (3 steps + fast track). |
| `/profile` | auth | Phase 2: CV upload + parse confirm, or questionnaire. |
| `/bearing` | auth | Phase 3 reality check + lock target. |
| `/roadmap` | auth | Phase 4: generation moment + star-chart roadmap. |
| `/cv` | auth | Phase 5: living CV, versions, score, export. |
| `/auth/callback` | public | OAuth code exchange (route handler). |
| `/auth/signout` | auth | POST → sign out → redirect `/`. |

Auth pages live under route group `app/(app)/` sharing `app/(app)/layout.tsx`
(AppShell + CheckInGate). `proxy.ts` (Next 16's rename of `middleware.ts`;
the file at the repo root is `proxy.ts` and it exports `proxy`) refreshes the
Supabase session and redirects unauthenticated visitors of `(app)` routes
to `/`.

`proxy.ts` also matches `/` — and that is the ONLY reason it matches it:
sending a signed-in visitor to their resume point. `app/page.tsx` does no
auth work at all, which is what lets the landing page stay statically
prerendered for cold social traffic. Before any Supabase call,
`lib/supabase/middleware.ts` checks for a Supabase session cookie
(`sb-*-auth-token*`, excluding the PKCE `-code-verifier`); a request without
one is waved straight through to the prerendered HTML, so an anonymous
visitor costs zero Supabase work. A stale cookie that resolves to no user
also falls through to the landing page.

### Flow resume — `lib/flow.ts`

`resolvePhase(supabase, userId): Promise<FlowPhase>`:
1. onboarding row missing or `completed_at` null → `onboarding`
2. career_profiles `completed_at` null → `profile`
3. no active locked_targets row → `bearing`
4. no active roadmaps row → `roadmap`
5. else → `roadmap` if any task not done, `cv` never forced — default `roadmap`.
An authenticated visit to `/` is redirected by `lib/supabase/middleware.ts`
calling `resolveRoute(supabase, userId)`; a visit to a phase *ahead* of the
resume point is redirected to `FLOW_ROUTE[phase]` by `guardPhase(...)`, which
each phase page calls for itself. Earlier phases stay reachable (users may
revisit onboarding answers or profile). If the resume lookup throws, the
visitor gets the public landing page rather than a 500.

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
  parse/validation failure, retries once on 429/503. Throws `GeminiError`
  with a user-safe `message` and a `kind`
  (`not-configured` | `rate-limited` | `daily-quota` | `unreadable` |
  `unknown`) so callers can tell a wait-and-retry from a dead end.
  - The 429 retry honours Gemini's own `google.rpc.RetryInfo.retryDelay`
    (e.g. `"20.3s"`), clamped to 0.5–30s; 6s when the payload names none.
  - A per-DAY quota exhaustion is NOT retried and is never described as a
    momentary wait. `readQuotaSignal(err): { daily, retryAfterMs }` (exported
    from `json.ts`) reads the `google.rpc.QuotaFailure` violations that the
    API returns — `GenerateRequestsPerDay…` vs `GenerateRequestsPerMinute…` —
    with a text-scan fallback. `MSG_DAILY_QUOTA` / `MSG_RATE_LIMITED` are
    exported alongside it.
  - `app/api/cv/parse/route.ts` makes its multimodal call directly (inlineData
    PDFs can't go through `generateJSON`), but reads the same 429 with the
    same `readQuotaSignal` / `MSG_DAILY_QUOTA` exports — so a CV upload that
    hits the day's wall names it as the day's wall, not a momentary wait.
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
  Provider failures never throw. The ONE throw is
  `JobSearchPersistError`: postings were found but the cache write failed
  twice (one retry, 250ms apart). Persisting is load-bearing, not
  best-effort — `POST /api/jobs/classify` is fail-closed and trusts only ids
  it can find in this user's cache rows, so returning unrecorded postings
  would hand the user a bearing where every batch 400s. `POST
  /api/jobs/search` has no special branch for it: like any throw it becomes
  the route's retryable 500 ("The bearing couldn't be taken. Try again.").

## API routes & server actions

Mutations are server actions colocated at `app/(app)/<feature>/actions.ts`.
Route handlers exist only where actions can't serve (streaming, binary, upload).
Every handler/action: auth-check first (401/redirect), zod-validate input,
never leak provider errors raw (map to user-safe messages).

| Endpoint | Shape |
|---|---|
| action `saveOnboardingStep` | partial OnboardingState → upserts `onboarding`, sets `current_step`; step 1 also calls Gemini for `dream_interpretation` (non-blocking failure: store null, proceed). Fast-track sets all + `completed_at`. |
| action `saveProfile` | `{ cv?: CVData; questionnaire?: QuestionnaireDraft; cvFilePath?: string; stay?: boolean }` → merges with what is stored (cv + answers → source `both`), upserts `career_profiles` with `completed_at`, inserts a `cv_versions` snapshot (score via `lib/score.ts`, never lowered). `questionnaire` is `QuestionnaireAnswers` **plus `name`** (`components/profile/answers.ts`, ≤120 chars, optional): it is stored with the answers AND mirrored to `profiles.full_name`, which is where the living CV and the PDF export read the name from for questionnaire-only users. `stay: true` skips the `/bearing` redirect so the client can offer the optional addendum. |
| `POST /api/cv/parse` | multipart form `file` (PDF ≤ 8MB) → Gemini (inlineData application/pdf) → `{ cv: CVData }`. Does NOT persist; client shows confirm/edit then calls `saveProfile`. Uploads original to storage `cvs/{userId}/cv.pdf` (best-effort). |
| `POST /api/jobs/search` | `{}` → reads onboarding + profile, builds JobQuery (keywords from `dream_interpretation.searchKeywords` or fast-track role; location/country from profile hints, default gb) → `JobSearchResult`. |
| `POST /api/jobs/classify` | `{ postings: JobPosting[], reset?: boolean }` (≤ 24) → rehydrates every id from this user's `job_search_cache` (the client's copies are discarded) → Gemini in batches of `CLASSIFY_BATCH_SIZE` = **12** (one call per batch, JSON array out) vs the career profile → upserts `job_assessments`, marks `recommended` per tier (highest matchScore) → `{ classified: ClassifiedJob[] }` for the requested postings only. Quota discipline: postings that already have a stored assessment are skipped (no second call for an answer we hold — `reset` deletes the rows first, so a retake still re-reads), and a short batch is topped up to 12 with not-yet-read postings from the same cached search, so a 24-posting bearing costs 2 model calls however the client chunks it. Consecutive calls in one request are paced 12s apart from call *start*. |
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

### Gemini free-tier budget (measured, August 2026)

**5 requests/minute AND 20 requests/day, per project per model.** Not ~10/min
— that figure was wrong, and everything sized against it was too loose. The
daily cap is the binding one. A complete journey costs 7 model calls:

| Call | Where |
|---|---|
| dream interpretation | `saveOnboardingStep`, step 1 (failure tolerated) |
| CV parse | `POST /api/cv/parse` (questionnaire path spends none) |
| classify ×2 | `POST /api/jobs/classify`, 24 postings at 12/call |
| dream assess | `POST /api/dream/assess` |
| gaps | `POST /api/roadmap/generate` (falls back to recorded missing reqs) |
| roadmap draft | `POST /api/roadmap/generate` |

Repair and 429 retries add to that, so 20/day is roughly two journeys with
room to stumble. Design to it:

- Batch classifications 12/call and skip postings already assessed (see
  `/api/jobs/classify` above). A 24-posting bearing = 2 calls.
- Roadmap generation is 2 calls, not more.
- Pace, don't race: sequential calls with ≥12s between starts stay under
  5/min without any coordination.
- Retry a per-minute 429 once, honouring Gemini's `RetryInfo.retryDelay`
  (clamped 0.5–30s). Never retry a per-day 429 — say `MSG_DAILY_QUOTA`
  instead, which promises tomorrow rather than "a moment".

Per-user budget: `proxy.ts` matches the four Gemini endpoints (cv/parse,
jobs/classify, dream/assess, roadmap/generate) and `lib/supabase/middleware.ts`
claims a slot via the `claim_gemini_slot` RPC before the route runs —
**4 requests / 60s per user**, deliberately under the 5/min project ceiling,
and exactly what one honest bearing costs (dream assess + up to three classify
requests, of which at most two reach the model). Over budget → 429
`{ error }` with the designed "at capacity" copy. Missing migration fails
open. `GEMINI_MAX_CALLS` in `lib/supabase/middleware.ts` is the value that
binds (it is passed explicitly on every call); the matching default in
`supabase/schema.sql` exists so the function reads true on its own. Change
both, and re-run `schema.sql` — `create or replace` makes that safe at any
time.

## Global states matrix (every screen designs all of these)

- Loading: skeletons (never blank, never spinner-only page) within 400ms.
- Empty: EmptyState with compass rose + a next action.
- Error: ErrorState naming problem + recovery (retry button wired).
- Unconfigured (bearing only): "The sky is quiet" provider state.
- All buttons: pending state (disabled + subtle progress) during actions.
