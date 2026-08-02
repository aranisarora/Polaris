# Polaris

Takes a student from where they are today to being hireable for a specific
target role, within a deadline they cannot move.

**Know where you stand.**

## The documents

These are the specification. Read them before changing anything they touch.

| Document | Decides |
| --- | --- |
| [`docs/product.md`](docs/product.md) | What Polaris is, who pays, the moat, the hard rules |
| [`docs/platform.md`](docs/platform.md) | Form factor, onboarding, page inventory, build order |
| [`docs/research.md`](docs/research.md) | Market evidence and data sources. Figures go stale — re-verify |
| [`docs/brand.md`](docs/brand.md) | Voice, colour, type, motion, the native-feel model, imagery |
| [`docs/design/flow.html`](docs/design/flow.html) | The 36-screen flow board — structure and copy |
| [`docs/design/brand-demo.html`](docs/design/brand-demo.html) | Palette, type scale and components, rendered |

Each carries an **open questions** table at the end. Those are unresolved on
purpose; check them before building anything they touch.

> The flow board is reference for **design, copy and structure**. Its numbers
> are a mock — it shows Accenture open for a student with two active backlogs,
> which their published criteria disallow. Real numbers come from the registry.

## What is built

Phase 0a and most of 0b. Thirty-three routes, all rendering from the engine.

```
Record zone          /  ·  /check  ·  /ledger  ·  /ledger/proof  ·  /r/[slug]
(server-rendered,    /companies/[slug]  ·  /audit  ·  /reach  ·  /contribute
 no gesture layer)   /privacy  ·  /terms  ·  /pricing  ·  /for-colleges

App zone             /today  ·  /roadmap  ·  /roadmap/[task]  ·  /signal
(four tabs, rail     /check-in  ·  /connections  ·  /settings  ·  /intake/*
 on desktop)
```

### The engine

`src/lib/engine/` — pure functions, no I/O, no model calls. The whole chain
from seven fields to a scheduled roadmap is arithmetic over in-process data,
which is what makes the ledger render in one round trip and what makes
`product.md` §13's "useful cold" constraint true rather than aspirational.

| Module | Does |
| --- | --- |
| `record.ts` | The seven fields, semester arithmetic, CGPA trajectory |
| `eligibility.ts` | The ledger: open / within reach / settled, grouped by the fix that opens them |
| `reach.ts` | Safe / stretch / reach bands |
| `audit.ts` | The signal audit against the anti-pattern taxonomy |
| `altitude.ts` | The readiness score, 0–90° |
| `proof.ts` | "Someone like you" matching, and honest refusal to match |
| `roadmap.ts` | Constraint-based scheduling against real exam windows |
| `countdown.ts` | Weeks, exam windows, usable hours |

### The data assets

`src/lib/data/` — the reference data, also mirrored into Postgres by
`npm run seed` so it is correctable without a deploy.

| Asset | Ships at | Target (`product.md` §13.1) |
| --- | --- | --- |
| Company registry | **23** | 40–60 |
| Interview corpus | **2** | 300–500 |
| VTU calendar | 25 windows | — |
| Anti-pattern taxonomy | **26** | ~50 |
| Action catalogue | **33** | 80–150 |

Every criterion carries its sources, the date a human last checked it, and a
grade: `verified`, `reported`, or `contested`. Five of the twenty-three are
contested — credible sources publish different numbers — and each says so on
its own page with the disagreement spelled out rather than resolved silently.

**One finding that contradicts the research.** `research.md` §3.3 expects the
GeeksforGeeks corpus to yield the company × college-tier layer, because its
contribution template asks authors for their college, the criteria that
applied, and whether they were selected. Reading the published articles, that
does not hold: the template asks and authors mostly skip it. Sampled TCS
experiences give a precise round-by-round and state neither CGPA, nor college,
nor backlogs. So the corpus splits — **process** scrapes cleanly, **profile**
does not — and the profiled half has to come from students directly, which is
what `/contribute` exists for. `InterviewRecord.hasProfile` marks which records
can answer *can someone like me get in*.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in from Supabase → Project Settings → API
npm run dev
```

The ledger, audit, reach set and roadmap all work with **no** Supabase keys —
they are arithmetic. Keys are needed for accounts, persistence and share links.

### Database

```bash
supabase link --project-ref <ref>
supabase db push     # 17 tables, RLS on all of them
npm run seed         # push src/lib/data into the reference tables
```

Auth needs Google and LinkedIn enabled in **Supabase → Authentication →
Providers**; until then the sign-in screens say so rather than failing.

## Layout

```
src/
  app/                 routes
  components/          brand marks, ruled rows, the app shell
  lib/
    data/              the reference data — the retrieved facts
    engine/            the arithmetic
    supabase/          clients; every one degrades when unconfigured
  proxy.ts             session refresh (Next 16 renamed middleware → proxy)
scripts/seed.ts        reference data → Postgres
supabase/migrations/   schema and RLS
```

## Rules that are load-bearing

Breaking any of these is a rewrite, not a tweak.

1. **Facts from the data modules, never from a model.** If a recommendation
   would be identical without our registry, it is a wrapper.
2. **A retrieved figure never ships without its source tag.**
3. **An absent criterion never blocks.** A wrong "open" costs an application; a
   wrong "settled" tells someone to stop trying. Those are not symmetric.
4. **Structured CV entities, never a blob**, and every raw input kept forever.
   Both are unretrofittable (`product.md` §12.3–12.4).
5. **Gate the mechanism, not the content.** The whole roadmap stays free.
6. **No affiliate revenue, ever.**
