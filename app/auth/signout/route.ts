import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * POST /auth/signout — ends the session and returns to the landing page.
 * 303 so a plain <form method="post"> lands on GET /.
 */
export async function POST(request: Request) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    new URL(request.url).origin;

  try {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  } catch {
    // Even if sign-out fails (already signed out, network), send them home —
    // middleware will treat a dead session as signed-out anyway.
  }

  return NextResponse.redirect(`${base}/`, { status: 303 });
}
