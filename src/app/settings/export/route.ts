import { NextResponse } from "next/server";
import { readAnonRecord } from "@/lib/session";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * "Download everything" — one file, machine-readable, no ticket to raise.
 *
 * `docs/product.md` §12.4 keeps every raw input forever, so the export includes
 * the originals as well as the parsed entities. A student asking what we hold
 * should get the answer, not a summary of the answer.
 */
export async function GET() {
  const user = await getUser();
  const supabase = await createClient();
  const record = await readAnonRecord();

  if (!user || !supabase) {
    return NextResponse.json(
      { record, note: "No account. This is everything held about you." },
      {
        headers: {
          "Content-Disposition": 'attachment; filename="polaris-export.json"',
        },
      },
    );
  }

  const tables = [
    "profiles",
    "student_records",
    "cv_entities",
    "raw_inputs",
    "analyses",
    "roadmaps",
    "roadmap_tasks",
    "checkins",
    "connections",
    "ledger_runs",
  ] as const;

  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    cookieRecord: record,
  };

  for (const table of tables) {
    const column = table === "profiles" ? "id" : "profile_id";
    const { data } = await supabase.from(table).select("*").eq(column, user.id);
    payload[table] = data ?? [];
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="polaris-export.json"',
    },
  });
}
