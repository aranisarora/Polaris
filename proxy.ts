import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Landing — matched only to send signed-in visitors to their resume
    // point, so app/page.tsx can stay statically prerendered. Requests
    // without a Supabase session cookie short-circuit in updateSession
    // before any auth call (lib/supabase/middleware.ts).
    "/",
    "/onboarding/:path*",
    "/profile/:path*",
    "/bearing/:path*",
    "/roadmap/:path*",
    "/cv/:path*",
    "/auth/:path*",
    // Gemini-backed endpoints — matched for the per-user request budget
    // enforced in lib/supabase/middleware.ts.
    "/api/cv/parse",
    "/api/jobs/classify",
    "/api/dream/assess",
    "/api/roadmap/generate",
  ],
};
