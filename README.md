# Polaris

Next.js (App Router) + TypeScript + Tailwind, backed by Supabase.

## The documents

Read these before writing code. They are the specification.

| Document | Decides |
| --- | --- |
| [`docs/product.md`](docs/product.md) | What Polaris is, who pays, the moat, the hard rules |
| [`docs/platform.md`](docs/platform.md) | Form factor, onboarding, page inventory, build order |
| [`docs/research.md`](docs/research.md) | Market evidence and data sources. Figures go stale — re-verify |
| [`docs/brand.md`](docs/brand.md) | Voice, colour, type, motion, the native-feel model, imagery |
| [`docs/design/flow.html`](docs/design/flow.html) | The 36-screen flow board — structure and copy |
| [`docs/design/brand-demo.html`](docs/design/brand-demo.html) | Palette, type scale and components, rendered |

Each document carries an **open questions** table at the end. Those are unresolved
on purpose; check them before building anything they touch.

## Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local` and fill in from the Supabase dashboard
(Project Settings → API):

| Variable | Where it's used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server |
| `SUPABASE_SERVICE_ROLE_KEY` | server only — bypasses RLS, never expose it |

## Supabase

Clients live in `src/lib/supabase/`:

- `client.ts` — browser components (`"use client"`)
- `server.ts` — Server Components, Route Handlers, Server Actions
- `middleware.ts` — session refresh, wired up in `src/middleware.ts`

Local CLI workflow:

```bash
supabase login          # once, interactive
supabase link --project-ref <ref>
supabase db pull        # pull remote schema into supabase/migrations
supabase start          # local stack (requires Docker)
```

## Layout

```
src/
  app/                 routes and layouts
  lib/supabase/        Supabase client factories
  middleware.ts        auth session refresh
supabase/              CLI project config and migrations
```
