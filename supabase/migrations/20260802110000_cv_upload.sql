-- ============================================================================
-- Polaris — CV upload
--
-- Additive to the Phase 0 schema. `raw_inputs` (§12.4) and `cv_entities`
-- (§12.3) already hold everything a parsed CV produces; what was missing was
-- somewhere to put the file itself, and a `kind` for the extraction record.
--
-- Three things happen here:
--
--   1. A private bucket for the original file. §12.4 requires the original be
--      kept forever — a parser bug in month two must not destroy the data — so
--      the file outlives every entity derived from it.
--   2. Owner-scoped policies on that bucket. A CV carries a phone number, an
--      address and an email; it is the most identifying artefact a student
--      hands us, and the DPDP Act 2023 is not optional here.
--   3. `analyses.kind` gains 'cv-extraction', so §12.5's rule — version every
--      analysis output — covers the parser too. Which prompt and which model
--      read a student's CV cannot be reconstructed after the fact.
-- ============================================================================

-- ─── The bucket ─────────────────────────────────────────────────────────────

-- Private. Never public: the objects are reached through short-lived signed
-- URLs, so a leaked path is not a leaked document.
--
-- The size and MIME limits are enforced here as well as in the upload action.
-- The action can be changed by a deploy; this cannot, which is the point.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-uploads',
  'cv-uploads',
  false,
  5242880, -- 5 MB. A CV that exceeds this is a scan, and a scan has no text layer.
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─── Bucket policies ────────────────────────────────────────────────────────

-- Objects are keyed `{auth.uid()}/{uuid}.{ext}`, so the first path segment is
-- the owner and every policy is the same comparison. `storage.foldername()`
-- splits the object name on '/'; PostgreSQL arrays are 1-indexed.
--
-- No update policy exists. §12.4 says the original is kept forever, and a row
-- that cannot be overwritten is a stronger guarantee than one we promise not
-- to overwrite. A re-upload is a new object with a new id.

drop policy if exists "own cv uploads: read"   on storage.objects;
drop policy if exists "own cv uploads: write"  on storage.objects;
drop policy if exists "own cv uploads: delete" on storage.objects;

create policy "own cv uploads: read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'cv-uploads'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "own cv uploads: write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'cv-uploads'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Deletion is the DPDP Act 2023 right to erasure, exercised from /settings.
-- Retention forever is our commitment, not a lock on the student's own data.
create policy "own cv uploads: delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'cv-uploads'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- ─── §12.5 covers the parser too ────────────────────────────────────────────

-- The extraction is an analysis like any other: a versioned prompt and model
-- read a document and produced structured output. If that pairing is not
-- recorded per student, "did the new prompt parse better?" is unanswerable.
alter table public.analyses drop constraint if exists analyses_kind_check;

alter table public.analyses add constraint analyses_kind_check
  check (kind in ('ledger','audit','reach','roadmap','altitude','cv-extraction'));
