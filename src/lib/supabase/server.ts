import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "./env";

/**
 * Server-side Supabase client. Returns `null` when the project is not
 * configured, so callers degrade rather than throw — see `env.ts` for why the
 * whole ledger path has to work without a database.
 */
export async function createClient() {
  if (!hasSupabase) return null;

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component. Safe to ignore when the proxy is
          // refreshing the session.
        }
      },
    },
  });
}

/** The signed-in user, or null. Never throws. */
export async function getUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
