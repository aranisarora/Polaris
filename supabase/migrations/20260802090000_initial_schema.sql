-- ============================================================================
-- Polaris — Phase 0 schema
--
-- Two halves, governed by different rules.
--
-- REFERENCE DATA (companies, calendar, corpus, actions) is curated, read-only
-- to every client, and also ships as typed modules under `src/lib/data`. The
-- modules are the source of truth the ledger renders from, because
-- `docs/platform.md` §1.5 puts a hard <3s budget on the ledger path and
-- `docs/product.md` §13 requires the product to be useful to a single student
-- when nobody else is on the platform. These tables are what makes that data
-- correctable without a deploy, and what the ingestion jobs write to.
--
-- STUDENT DATA is per-user, RLS-enforced, and subject to the DPDP Act 2023.
--
-- Two architectural constraints from the docs are load-bearing here and are
-- easy to get wrong later:
--
--   §12.3  Structured CV entities from day one. A PDF blob makes the
--          auto-updating CV impossible forever without a rewrite.
--   §12.4  Store every raw input forever. Storing only the parsed version
--          means a parser bug in month two destroys the data permanently.
--   §12.5  Version every analysis output, so we can tell which students
--          received which engine version. Cannot be retrofitted.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Reference data ─────────────────────────────────────────────────────────

create table public.universities (
  code              text primary key,
  name              text not null,
  short_name        text not null,
  state             text not null,
  calendar_mapped   boolean not null default false,
  sources           jsonb not null default '[]'::jsonb,
  updated_at        timestamptz not null default now()
);

create table public.colleges (
  slug              text primary key,
  name              text not null,
  university_code   text not null references public.universities (code),
  city              text not null,
  area              text,
  tier              smallint not null check (tier between 1 and 3),
  autonomous        boolean not null default false,
  sources           jsonb not null default '[]'::jsonb,
  updated_at        timestamptz not null default now()
);
create index colleges_university_idx on public.colleges (university_code);
create index colleges_name_idx on public.colleges (lower(name));

create table public.companies (
  slug              text primary key,
  name              text not null,
  programme         text,
  tier              text not null check (tier in ('services','gcc','product','core')),
  sectors           text[] not null default '{}',
  package_min_lpa   numeric(5,2) not null,
  package_max_lpa   numeric(5,2) not null,
  campus_types      text[] not null default '{}',
  typical_drive_month smallint,
  process           jsonb not null default '[]'::jsonb,
  notes             text,
  updated_at        timestamptz not null default now()
);

-- Criteria are versioned per batch year. A student's ledger records which row
-- it read, so a criterion changing later never silently rewrites their history.
create table public.company_criteria (
  id                uuid primary key default gen_random_uuid(),
  company_slug      text not null references public.companies (slug) on delete cascade,
  batch_year        smallint not null,
  tenth_pct         numeric(5,2),
  twelfth_pct       numeric(5,2),
  ug_pct            numeric(5,2),
  ug_cgpa           numeric(4,2),
  max_active_backlogs smallint,
  backlogs_cleared_by_joining boolean,
  max_gap_years     smallint,
  branches          text[],
  -- 'verified' | 'reported' | 'contested'. Rendered to the student as-is.
  confidence        text not null check (confidence in ('verified','reported','contested')),
  contested_note    text,
  sources           jsonb not null default '[]'::jsonb,
  checked_on        date not null,
  unique (company_slug, batch_year)
);

create table public.calendar_events (
  id                uuid primary key default gen_random_uuid(),
  university_code   text not null references public.universities (code) on delete cascade,
  kind              text not null check (kind in ('exam','supplementary','results','teaching','internship-window','placement-registration')),
  label             text not null,
  starts_on         date not null,
  ends_on           date not null,
  semesters         smallint[],
  -- True when derived from VTU's term pattern rather than a published notice.
  -- Every surface that renders a projected window says so.
  projected         boolean not null default false,
  sources           jsonb not null default '[]'::jsonb
);
create index calendar_lookup_idx on public.calendar_events (university_code, kind, starts_on);

create table public.interview_records (
  id                text primary key,
  company_slug      text not null references public.companies (slug) on delete cascade,
  role              text not null,
  year              smallint,
  campus_type       text not null,
  college_tier      smallint check (college_tier between 1 and 3),
  university_code   text,
  college_name      text,
  branch            text,
  cgpa_band         text,
  backlog_note      text,
  outcome           text not null check (outcome in ('selected','rejected')),
  rounds            jsonb not null default '[]'::jsonb,
  takeaway          text not null,
  -- True only when tier, CGPA band and branch are all present. Only these can
  -- answer "can someone like me get in" (docs/product.md §9.2.1).
  has_profile       boolean not null default false,
  provenance        text not null check (provenance in ('public-corpus','student-submitted','tpo')),
  source            jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index interview_match_idx
  on public.interview_records (company_slug, college_tier, cgpa_band, branch)
  where has_profile;

-- ─── Student data ───────────────────────────────────────────────────────────

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  college_slug      text references public.colleges (slug),
  university_code   text references public.universities (code),
  -- Free text only for a college outside the mapped set. §3.5 forbids free
  -- text where it would break the join; this field never participates in one.
  college_other     text,
  branch            text,
  grad_year         smallint,
  target_sector     text,
  -- §5.1 constraint 4: the free-window clock starts at account creation and
  -- must be recorded from the very first account. It cannot be retrofitted.
  free_until        timestamptz not null default (now() + interval '28 days'),
  plan              text not null default 'free' check (plan in ('free','paid')),
  paid_until        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.student_records (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  cgpa              numeric(4,2) not null,
  active_backlogs   smallint not null,
  tenth_pct         numeric(5,2) not null,
  twelfth_pct       numeric(5,2) not null,
  gap_years         smallint,
  manual_exam_start date,
  manual_exam_end   date,
  -- 'onboarding' | 'marksheet' | 'correction'
  source            text not null default 'onboarding',
  created_at        timestamptz not null default now()
);
create index student_records_profile_idx on public.student_records (profile_id, created_at desc);

-- An anonymous run of the ledger. Created before any account exists, which is
-- the whole point: §10.1 delivers the shock before asking for anything.
create table public.ledger_runs (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  profile_id        uuid references public.profiles (id) on delete set null,
  college_slug      text references public.colleges (slug),
  university_code   text,
  branch            text not null,
  grad_year         smallint not null,
  target_sector     text not null,
  cgpa              numeric(4,2) not null,
  active_backlogs   smallint not null,
  tenth_pct         numeric(5,2) not null,
  twelfth_pct       numeric(5,2) not null,
  -- The computed counts, denormalised so the share card renders without
  -- re-running the engine. §1.5: /r/[slug] must survive 200 opens from one chat.
  open_count        smallint not null,
  reach_count       smallint not null,
  settled_count     smallint not null,
  total_count       smallint not null,
  engine_version    text not null,
  registry_version  text not null,
  created_at        timestamptz not null default now()
);
create index ledger_runs_profile_idx on public.ledger_runs (profile_id, created_at desc);

-- §12.3 — structured entities, never a blob.
create table public.cv_entities (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  kind              text not null check (kind in ('project','skill','education','experience','certification')),
  data              jsonb not null,
  -- Which task or import produced this entity, so the CV can explain itself.
  origin            text not null default 'manual',
  origin_ref        text,
  version           integer not null default 1,
  archived_at       timestamptz,
  created_at        timestamptz not null default now()
);
create index cv_entities_profile_idx on public.cv_entities (profile_id, kind);

-- §12.4 — store every raw input forever.
create table public.raw_inputs (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  kind              text not null check (kind in ('cv','marksheet','linkedin-pdf','six-questions','onboarding','github','leetcode')),
  storage_path      text,
  mime              text,
  original_name     text,
  payload           jsonb,
  created_at        timestamptz not null default now()
);
create index raw_inputs_profile_idx on public.raw_inputs (profile_id, created_at desc);

-- §12.5 — version every analysis output.
create table public.analyses (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  kind              text not null check (kind in ('ledger','audit','reach','roadmap','altitude')),
  engine_version    text not null,
  registry_version  text,
  output            jsonb not null,
  created_at        timestamptz not null default now()
);
create index analyses_profile_idx on public.analyses (profile_id, kind, created_at desc);

create table public.roadmaps (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  engine_version    text not null,
  constraints       jsonb not null default '{}'::jsonb,
  starts_on         date not null,
  deadline_label    text not null,
  deadline_on       date not null,
  generated_at      timestamptz not null default now(),
  superseded_at     timestamptz
);
create index roadmaps_profile_idx on public.roadmaps (profile_id, generated_at desc);

create table public.roadmap_tasks (
  id                uuid primary key default gen_random_uuid(),
  roadmap_id        uuid not null references public.roadmaps (id) on delete cascade,
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  action_slug       text not null,
  title             text not null,
  category          text not null,
  effort_hours      numeric(5,2) not null,
  week              smallint not null,
  starts_on         date not null,
  due_on            date not null,
  status            text not null default 'todo' check (status in ('todo','done','skipped')),
  verify_via        text not null,
  evidence          jsonb,
  because           text,
  opens             smallint,
  completed_at      timestamptz
);
create index roadmap_tasks_profile_idx on public.roadmap_tasks (profile_id, status, week);

create table public.checkins (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  task_id           uuid references public.roadmap_tasks (id) on delete set null,
  week_of           date not null,
  response          text not null,
  note              text,
  created_at        timestamptz not null default now()
);
create index checkins_profile_idx on public.checkins (profile_id, created_at desc);

create table public.connections (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  provider          text not null check (provider in ('github','leetcode','certification')),
  handle            text not null,
  data              jsonb not null default '{}'::jsonb,
  verified_at       timestamptz,
  created_at        timestamptz not null default now(),
  unique (profile_id, provider, handle)
);

-- Student-submitted outcome records. This is how the profiled half of the
-- corpus actually gets built — the public corpus does not carry CGPA or tier
-- (see src/lib/data/corpus.ts). Held separately from the curated table until
-- reviewed.
create table public.record_submissions (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid references public.profiles (id) on delete set null,
  company_slug      text references public.companies (slug),
  payload           jsonb not null,
  status            text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at        timestamptz not null default now()
);

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table public.universities        enable row level security;
alter table public.colleges            enable row level security;
alter table public.companies           enable row level security;
alter table public.company_criteria    enable row level security;
alter table public.calendar_events     enable row level security;
alter table public.interview_records   enable row level security;
alter table public.profiles            enable row level security;
alter table public.student_records     enable row level security;
alter table public.ledger_runs         enable row level security;
alter table public.cv_entities         enable row level security;
alter table public.raw_inputs          enable row level security;
alter table public.analyses            enable row level security;
alter table public.roadmaps            enable row level security;
alter table public.roadmap_tasks       enable row level security;
alter table public.checkins            enable row level security;
alter table public.connections         enable row level security;
alter table public.record_submissions  enable row level security;

-- Reference data is world-readable and never client-writable. Writes go
-- through the service role from the ingestion jobs.
create policy "reference readable" on public.universities      for select using (true);
create policy "reference readable" on public.colleges          for select using (true);
create policy "reference readable" on public.companies         for select using (true);
create policy "reference readable" on public.company_criteria  for select using (true);
create policy "reference readable" on public.calendar_events   for select using (true);
create policy "reference readable" on public.interview_records for select using (true);

-- Student data: owner only, for every verb.
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own records" on public.student_records
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "own cv" on public.cv_entities
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "own raw inputs" on public.raw_inputs
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "own analyses" on public.analyses
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "own roadmaps" on public.roadmaps
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "own tasks" on public.roadmap_tasks
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "own checkins" on public.checkins
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "own connections" on public.connections
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "own submissions" on public.record_submissions
  for select using (auth.uid() = profile_id);
create policy "submit a record" on public.record_submissions
  for insert with check (auth.uid() = profile_id or profile_id is null);

-- ledger_runs is the one table anonymous clients write to, because the ledger
-- is delivered before any account exists. Reads are NOT open — the raw row
-- carries the student's exact CGPA and percentages, and platform.md §6 Q5
-- limits a public URL to college tier, branch, year and counts. The share page
-- reads the redacted view below instead.
create policy "anyone may create a run" on public.ledger_runs
  for insert with check (true);
create policy "own runs" on public.ledger_runs
  for select using (auth.uid() is not null and auth.uid() = profile_id);
create policy "claim a run" on public.ledger_runs
  for update using (auth.uid() is not null) with check (auth.uid() = profile_id);

-- The share card. Exactly what platform.md §6 Q5 permits on a public URL:
-- college tier, branch, year and the counts. Never a name, never an exact CGPA,
-- never the percentages.
create view public.shared_ledger_cards
with (security_invoker = off) as
  select
    r.slug,
    c.tier            as college_tier,
    coalesce(u.short_name, 'Your university') as university,
    c.city,
    r.branch,
    r.grad_year,
    r.open_count,
    r.reach_count,
    r.settled_count,
    r.total_count,
    r.created_at
  from public.ledger_runs r
  left join public.colleges c on c.slug = r.college_slug
  left join public.universities u on u.code = r.university_code;

grant select on public.shared_ledger_cards to anon, authenticated;

-- A profile row is created the moment an account is. The 28-day clock in the
-- default is what makes §5.1 constraint 4 enforceable from the first account.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
