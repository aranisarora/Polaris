import "server-only";
import { createClient } from "./supabase/server";

/**
 * The shareable card — `docs/platform.md` §4.1 and §6 Q5.
 *
 * Exactly what may sit on a public URL: college tier, branch, year and the
 * counts. Never a name, never an exact CGPA, never the percentages. The
 * redaction is enforced in the database by `get_shared_card`, not here, so a
 * mistake in this file cannot leak anything the function does not return.
 */

export type SharedCard = {
  slug: string;
  collegeTier: number | null;
  university: string;
  city: string | null;
  branch: string;
  gradYear: number;
  openCount: number;
  reachCount: number;
  settledCount: number;
  totalCount: number;
  createdAt: string;
};

export async function getSharedCard(slug: string): Promise<SharedCard | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .rpc("get_shared_card", { card_slug: slug })
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  return {
    slug: String(row.slug),
    collegeTier: (row.college_tier as number | null) ?? null,
    university: String(row.university ?? "Your university"),
    city: (row.city as string | null) ?? null,
    branch: String(row.branch),
    gradYear: Number(row.grad_year),
    openCount: Number(row.open_count),
    reachCount: Number(row.reach_count),
    settledCount: Number(row.settled_count),
    totalCount: Number(row.total_count),
    createdAt: String(row.created_at),
  };
}

/** "Tier 3 · VTU, Bengaluru" — identifying enough to be relatable, not to be a person. */
export function cardContext(card: SharedCard): string {
  const parts = [card.branch, String(card.gradYear), card.university];
  if (card.city) parts.push(card.city);
  return parts.join(" · ");
}
