import { renderToBuffer } from "@react-pdf/renderer";
import { createSupabaseServer } from "@/lib/supabase/server";
import { earnedExtraLines } from "@/lib/cvdiff";
import { createCvDocument } from "@/components/cv/pdf";
import { fetchActiveTasks, fetchCurrentCV } from "@/app/(app)/cv/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cv/export — the earned CV as a PDF (docs/CONTRACTS.md).
 * Earned lines only: the user's current CV plus lines from completed
 * roadmap tasks. Unearned (grey) lines never leave the chart.
 */
export async function GET(): Promise<Response> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: "Sign in to export your CV." },
        { status: 401 },
      );
    }

    const cv = await fetchCurrentCV(supabase, user.id);
    if (!cv) {
      return Response.json(
        { error: "No CV on your chart yet. Complete your profile first." },
        { status: 404 },
      );
    }

    const { tasks } = await fetchActiveTasks(supabase, user.id);
    const extras = earnedExtraLines(cv, tasks);

    const buffer = await renderToBuffer(createCvDocument(cv, extras));

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="polaris-cv.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "The export couldn't be drawn. Try again." },
      { status: 500 },
    );
  }
}
