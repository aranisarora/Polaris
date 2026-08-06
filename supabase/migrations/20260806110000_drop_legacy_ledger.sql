-- ============================================================================
-- Remove the previous app's schema from this project.
--
-- This Supabase project (`qgvwvbigfurbmylraxzw`) was used for an earlier build
-- — an anonymous college/CGPA ledger with a shared result card — before it was
-- reused for Polaris. Polaris's own tables were applied on top via schema.sql
-- and never conflicted with it, so the leftovers sat here unnoticed until a
-- `supabase db push` refused to run against a migration history it did not
-- recognise.
--
-- Nothing in Polaris reads any of this. `get_shared_card` is already dead: it
-- selects from `colleges` and `universities`, which the earlier build's own
-- reset dropped, so every call has been failing since before Polaris existed.
--
-- Data was backed up before this ran (schema and data dumps, 6 Aug 2026).
-- The two migration records that created these objects — 20260802110000 and
-- 20260802120000 — are marked reverted in the same pass, which is what they
-- now are.
--
-- `cascade` carries the indexes, constraints and RLS policies with each table;
-- `if exists` keeps this re-runnable, like every other file in this directory.
-- ============================================================================

drop function if exists public.get_shared_card(text);

drop table if exists public.ledger_runs cascade;
drop table if exists public.unmatched_colleges cascade;
