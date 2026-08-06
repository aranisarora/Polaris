import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
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
