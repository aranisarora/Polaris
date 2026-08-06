import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Uses only the publishable key — RLS enforces
 * row ownership. Safe to call in any client component; the underlying
 * client is memoized by @supabase/ssr per browser context.
 */
export function createSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return createBrowserClient(url, key);
}
