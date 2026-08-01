/**
 * Supabase configuration, treated as optional on purpose.
 *
 * `docs/product.md` §13 sets a hard constraint: the product must be useful to
 * a single student when nobody else is on the platform. The ledger, the audit,
 * the reach set and the roadmap are all pure arithmetic over the reference
 * modules, so none of them needs a database — and a build or a page render
 * should never fail because a key is missing.
 *
 * What does need Supabase: accounts, persistence, and the share link. Those
 * surfaces check `hasSupabase` and degrade with a stated reason rather than
 * throwing.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
