-- Polaris schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Every user table has RLS; policies restrict rows to auth.uid().
-- Re-runnable: Postgres has no `create policy if not exists`, so every policy
-- is dropped first. Re-run the whole file after any change to this schema.

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: own read" on public.profiles;
create policy "profiles: own read" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles: own update" on public.profiles;
create policy "profiles: own update" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------- onboarding

create table if not exists public.onboarding (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dream_text text not null default '',
  dream_interpretation jsonb,
  sector text,
  sector_other text,
  company_type text,
  fast_track boolean not null default false,
  fast_track_company text,
  fast_track_role text,
  current_step int not null default 1,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.onboarding enable row level security;
drop policy if exists "onboarding: own all" on public.onboarding;
create policy "onboarding: own all" on public.onboarding
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --------------------------------------------------------- career profiles

create table if not exists public.career_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cv_structured jsonb,
  questionnaire jsonb,
  source text check (source in ('cv', 'questionnaire', 'both')),
  cv_file_path text,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.career_profiles enable row level security;
drop policy if exists "career_profiles: own all" on public.career_profiles;
create policy "career_profiles: own all" on public.career_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --------------------------------------------------------- job search cache

create table if not exists public.job_search_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query_hash text not null,
  query jsonb not null,
  results jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (user_id, query_hash)
);

alter table public.job_search_cache enable row level security;
drop policy if exists "job_search_cache: own all" on public.job_search_cache;
create policy "job_search_cache: own all" on public.job_search_cache
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------- job assessments

create table if not exists public.job_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  posting jsonb not null,
  posting_id text not null,
  tier text not null check (tier in ('ready', 'attainable', 'stretch')),
  reasoning text not null,
  have jsonb not null default '[]',
  missing jsonb not null default '[]',
  match_score numeric not null default 0,
  is_dream boolean not null default false,
  recommended boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, posting_id)
);

alter table public.job_assessments enable row level security;
drop policy if exists "job_assessments: own all" on public.job_assessments;
create policy "job_assessments: own all" on public.job_assessments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------ locked targets

create table if not exists public.locked_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  assessment_id uuid references public.job_assessments (id) on delete set null,
  title text not null,
  company text not null,
  location text not null default '',
  posting jsonb,
  is_dream boolean not null default false,
  dream_beyond text,
  active boolean not null default true,
  locked_at timestamptz not null default now()
);

create unique index if not exists locked_targets_one_active
  on public.locked_targets (user_id) where active;

alter table public.locked_targets enable row level security;
drop policy if exists "locked_targets: own all" on public.locked_targets;
create policy "locked_targets: own all" on public.locked_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------- roadmaps

create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references public.locked_targets (id) on delete cascade,
  dream_beyond text,
  narrative jsonb,
  active boolean not null default true,
  generated_at timestamptz not null default now()
);

create unique index if not exists roadmaps_one_active
  on public.roadmaps (user_id) where active;

alter table public.roadmaps enable row level security;
drop policy if exists "roadmaps: own all" on public.roadmaps;
create policy "roadmaps: own all" on public.roadmaps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position int not null,
  title text not null,
  why text not null,
  category text not null check (category in ('project', 'skill', 'certification', 'experience')),
  effort text not null default '',
  done boolean not null default false,
  done_at timestamptz,
  first_week boolean not null default false,
  cv_line jsonb
);

create index if not exists roadmap_tasks_roadmap on public.roadmap_tasks (roadmap_id, position);

alter table public.roadmap_tasks enable row level security;
drop policy if exists "roadmap_tasks: own all" on public.roadmap_tasks;
create policy "roadmap_tasks: own all" on public.roadmap_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------------- cv versions

create table if not exists public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  snapshot jsonb not null,
  score int not null default 0 check (score between 0 and 100),
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists cv_versions_user on public.cv_versions (user_id, created_at desc);

alter table public.cv_versions enable row level security;
drop policy if exists "cv_versions: own all" on public.cv_versions;
create policy "cv_versions: own all" on public.cv_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------- checkins

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asked_at timestamptz not null default now(),
  questions jsonb not null default '[]',
  answers jsonb,
  completed_at timestamptz
);

create index if not exists checkins_user on public.checkins (user_id, asked_at desc);

alter table public.checkins enable row level security;
drop policy if exists "checkins: own all" on public.checkins;
create policy "checkins: own all" on public.checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------- gemini throttle

-- Per-user request budget for Gemini-backed endpoints (the shared free tier
-- is ~10 req/min — docs/CONTRACTS.md). RLS is enabled with NO policies on
-- purpose: rows are only ever touched through the security-definer function
-- below, so a client can't reset its own window.
create table if not exists public.gemini_throttle (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz not null default now(),
  calls int not null default 1
);

alter table public.gemini_throttle enable row level security;

-- Atomically claim one Gemini call slot for the calling user. Returns true
-- when the call may proceed; false when the user has already spent
-- max_calls inside the current window_seconds window. Single statement —
-- race-safe under concurrent requests.
create or replace function public.claim_gemini_slot(
  max_calls int default 6,
  window_seconds int default 60
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  claimed boolean;
begin
  if uid is null then
    return false;
  end if;
  insert into public.gemini_throttle as t (user_id, window_start, calls)
  values (uid, now(), 1)
  on conflict (user_id) do update
    set window_start = case
          when t.window_start <= now() - make_interval(secs => window_seconds)
            then now()
          else t.window_start
        end,
        calls = case
          when t.window_start <= now() - make_interval(secs => window_seconds)
            then 1
          else t.calls + 1
        end
    where t.window_start <= now() - make_interval(secs => window_seconds)
       or t.calls < max_calls
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

-- Callable only by a signed-in user (proxy.ts calls it with the user's JWT).
revoke all on function public.claim_gemini_slot(int, int) from public, anon;
grant execute on function public.claim_gemini_slot(int, int) to authenticated;

-- ------------------------------------------------------------------ storage

insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

drop policy if exists "cvs: own read" on storage.objects;
create policy "cvs: own read" on storage.objects
  for select using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "cvs: own insert" on storage.objects;
create policy "cvs: own insert" on storage.objects
  for insert with check (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "cvs: own update" on storage.objects;
create policy "cvs: own update" on storage.objects
  for update using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "cvs: own delete" on storage.objects;
create policy "cvs: own delete" on storage.objects
  for delete using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
