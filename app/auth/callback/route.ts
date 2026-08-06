import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveRoute } from "@/lib/flow";
import { FLOW_ROUTE } from "@/lib/types";

/**
 * OAuth code exchange. Google redirects here with `?code=`; we exchange it
 * for a session, then send the user to their resume point. Any failure —
 * missing code, provider error param, exchange failure — lands back on `/`
 * with `?auth_error=1` so the landing page can surface a quiet notice.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");

  // Prefer the configured site URL (correct behind proxies); fall back to
  // the request origin for local development.
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    requestUrl.origin;

  if (!code || providerError) {
    return NextResponse.redirect(`${base}/?auth_error=1`);
  }

  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return NextResponse.redirect(`${base}/?auth_error=1`);
    }

    let destination: string;
    try {
      destination = await resolveRoute(supabase, data.user.id);
    } catch {
      // Resume lookup failed (e.g. schema not applied yet). The session is
      // valid — start them at the beginning rather than bouncing them out.
      destination = FLOW_ROUTE.onboarding;
    }

    return NextResponse.redirect(`${base}${destination}`);
  } catch {
    return NextResponse.redirect(`${base}/?auth_error=1`);
  }
}
