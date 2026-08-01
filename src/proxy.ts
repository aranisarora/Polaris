import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 renamed `middleware` to `proxy` to clarify the network boundary.
 * The runtime is nodejs and is not configurable.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, images, and the share card's OG image —
    // /r/[slug] must stay edge-cacheable and survive a group chat opening it
    // 200 times (docs/platform.md §1.5).
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|.*\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
