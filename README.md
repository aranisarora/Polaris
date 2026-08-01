# Polaris

Next.js (App Router) + TypeScript + Tailwind, backed by Supabase.

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
