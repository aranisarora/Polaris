-- The share card, without the enumeration hole.
--
-- The previous migration exposed `shared_ledger_cards` as a view readable by
-- anon. The redaction was right — college tier, branch, year and counts only,
-- per docs/platform.md §6 Q5 — but an open view answers `select *`, so anyone
-- could dump every card ever generated and read the cohort. Slugs are random
-- enough to resist guessing; a table scan does not have to guess.
--
-- A security-definer function scoped to one slug closes it: you can read a
-- card only if you already hold its link, which is exactly the sharing model
-- the product intends.

drop view if exists public.shared_ledger_cards;

create or replace function public.get_shared_card(card_slug text)
returns table (
  slug            text,
  college_tier    smallint,
  university      text,
  city            text,
  branch          text,
  grad_year       smallint,
  open_count      smallint,
  reach_count     smallint,
  settled_count   smallint,
  total_count     smallint,
  created_at      timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.slug,
    c.tier,
    coalesce(u.short_name, 'Your university'),
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
  left join public.universities u on u.code = r.university_code
  where r.slug = card_slug
  limit 1;
$$;

revoke all on function public.get_shared_card(text) from public;
grant execute on function public.get_shared_card(text) to anon, authenticated;
