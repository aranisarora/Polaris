-- Dated roadmaps: a start date and a weekly capacity on the roadmap, an hours
-- estimate per task, and the steps that unpack a task into single sittings.
--
-- Every statement is guarded, so this is safe to run against a project that
-- already has some or all of it. The same statements live in schema.sql —
-- apply either one.

-- ---------------------------------------------------- roadmaps: the calendar

-- Added nullable, backfilled, then constrained. Adding it straight to
-- `not null default current_date` would stamp today onto every existing
-- roadmap and lose the day it was actually generated.
alter table public.roadmaps add column if not exists start_date date;
update public.roadmaps set start_date = generated_at::date where start_date is null;
alter table public.roadmaps alter column start_date set default current_date;
alter table public.roadmaps alter column start_date set not null;

-- 8h/week is the middle pace — the one the chooser preselects for an
-- "almost there" target — so an existing roadmap gets a believable pace
-- rather than an optimistic one.
alter table public.roadmaps add column if not exists hours_per_week int;
update public.roadmaps set hours_per_week = 8 where hours_per_week is null;
alter table public.roadmaps alter column hours_per_week set default 8;
alter table public.roadmaps alter column hours_per_week set not null;

-- --------------------------------------------------------- tasks: the hours

-- Deliberately left NULL for existing rows: those tasks were never estimated,
-- and readers fall back to defaultHours(category) in lib/schedule.ts. A
-- backfilled number would read as a measurement that never happened.
alter table public.roadmap_tasks add column if not exists estimate_hours numeric(5, 2);

-- --------------------------------------------------------------- the steps

create table if not exists public.roadmap_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.roadmap_tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position int not null,
  title text not null,
  detail text not null default '',
  minutes int not null default 30,
  done boolean not null default false,
  done_at timestamptz
);

create index if not exists roadmap_steps_task on public.roadmap_steps (task_id, position);

alter table public.roadmap_steps enable row level security;
drop policy if exists "roadmap_steps: own all" on public.roadmap_steps;
create policy "roadmap_steps: own all" on public.roadmap_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
