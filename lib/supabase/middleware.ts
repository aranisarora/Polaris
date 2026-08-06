import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveRoute } from "@/lib/flow";

/** The public landing chart — statically prerendered (docs/SPEC.md). */
const LANDING = "/";

/** App routes that require an authenticated session. */
const PROTECTED_PREFIXES = [
  "/onboarding",
  "/profile",
  "/bearing",
  "/roadmap",
  "/cv",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Gemini-backed endpoints under a per-user request budget.
 *
 * The free tier's measured ceiling is 5 requests/MINUTE and 20 requests/DAY,
 * per project per model (docs/CONTRACTS.md) — shared by every user of this
 * deployment. The old budget of 6/60s sat *above* the per-minute ceiling, so
 * it could not protect anything; 4/60s sits under it.
 *
 * Four is also what one honest bearing costs: the dream assessment plus the
 * classify requests, which now spend at most two model calls between them
 * (app/api/jobs/classify/route.ts skips postings already read and tops short
 * batches up). Over budget → 429 with the designed "at capacity" copy.
 */
const GEMINI_API_PATHS = [
  "/api/cv/parse",
  "/api/jobs/classify",
  "/api/dream/assess",
  "/api/roadmap/generate",
] as const;

const GEMINI_MAX_CALLS = 4;
const GEMINI_WINDOW_SECONDS = 60;

/** Same designed copy the Gemini client uses for upstream rate limits. */
const MSG_AT_CAPACITY =
  "The model is at capacity right now. Wait a moment and try again.";

function isGeminiApiPath(pathname: string): boolean {
  return GEMINI_API_PATHS.some((path) => pathname === path);
}

function redirectTo(
  request: NextRequest,
  pathname: string,
  carry?: NextResponse,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const response = NextResponse.redirect(url);
  // Carry over any session cookies Supabase rotated while we looked.
  carry?.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

function redirectHome(request: NextRequest): NextResponse {
  return redirectTo(request, LANDING);
}

/**
 * Does this request carry a Supabase session at all?
 *
 * @supabase/ssr stores the session in `sb-<project-ref>-auth-token`, split
 * into `.0`, `.1`… chunks when it outgrows one cookie. The PKCE
 * `-code-verifier` cookie shares the prefix but carries no session, so it
 * does not count: someone who bounced out of Google mid-sign-in is still an
 * anonymous visitor.
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      ({ name }) =>
        name.startsWith("sb-") &&
        name.includes("-auth-token") &&
        !name.includes("-code-verifier"),
    );
}

/**
 * @supabase/ssr middleware pattern: refresh the auth session on every matched
 * request and mirror refreshed cookies onto both the forwarded request and
 * the response. Unauthenticated visitors of protected app routes are
 * redirected to `/`. `/auth/*` is matched only for the session refresh —
 * it is never redirected here (the callback must work signed-out).
 *
 * `/` is matched for one reason: sending signed-in visitors to their resume
 * point, which used to happen inside the page and forced it to render on
 * demand. Cold traffic arrives with no session cookie and is waved straight
 * through to the prerendered HTML below, before any Supabase work.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const isLanding = request.nextUrl.pathname === LANDING;

  // Fast path for the overwhelming majority of landing traffic: no session
  // cookie means nobody to redirect, so we never touch Supabase.
  if (isLanding && !hasSessionCookie(request)) {
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Unconfigured Supabase: never crash the whole site from middleware.
  // Protected routes can't authenticate anyone, so send them home.
  if (!url || !key) {
    return isProtectedPath(request.nextUrl.pathname)
      ? redirectHome(request)
      : NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: no logic between client creation and getUser() — the call
  // refreshes the session and writes any rotated cookies via setAll above.
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Network hiccup against Supabase auth: treat as signed-out rather
    // than throwing a 500 for every matched route.
    user = null;
  }

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    return redirectHome(request);
  }

  // Signed-in visitor of `/`: send them to their resume point rather than
  // to the pitch (docs/CONTRACTS.md). A stale or invalid cookie lands here
  // with no user — they get the landing page, and the response above carries
  // Supabase's cookie clear-down. If the resume lookup itself fails, showing
  // the public page beats a 500.
  if (isLanding) {
    if (!user) return supabaseResponse;
    try {
      return redirectTo(
        request,
        await resolveRoute(supabase, user.id),
        supabaseResponse,
      );
    } catch {
      return supabaseResponse;
    }
  }

  // Per-user cooldown on Gemini-backed endpoints. Signed-out requests pass
  // through — the route's own auth check answers them with a designed 401.
  if (
    user &&
    request.method === "POST" &&
    isGeminiApiPath(request.nextUrl.pathname)
  ) {
    try {
      const { data: allowed, error } = await supabase.rpc("claim_gemini_slot", {
        max_calls: GEMINI_MAX_CALLS,
        window_seconds: GEMINI_WINDOW_SECONDS,
      });
      if (error) {
        // Fail open: a missing migration or a throttle hiccup must never
        // take the feature down for legitimate users.
        console.error("[middleware] gemini throttle check failed:", error.message);
      } else if (allowed === false) {
        const denied = NextResponse.json(
          { error: MSG_AT_CAPACITY },
          { status: 429 },
        );
        // Preserve any auth cookies refreshed above.
        supabaseResponse.cookies
          .getAll()
          .forEach((cookie) => denied.cookies.set(cookie));
        return denied;
      }
    } catch (err) {
      console.error("[middleware] gemini throttle check threw:", err);
    }
  }

  // Always return supabaseResponse (with its cookies) — replacing it with a
  // fresh NextResponse would drop the refreshed session.
  return supabaseResponse;
}
