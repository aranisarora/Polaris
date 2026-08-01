import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "./env";

/** Browser client. Null when the project is not configured. */
export function createClient() {
  if (!hasSupabase) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
