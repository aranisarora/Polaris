import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Upload your CV" };

/**
 * CV upload — one of the four first-class intake routes (`docs/platform.md`
 * §3.4), and the destination of the LinkedIn route as well, since LinkedIn's
 * own *Save to PDF* export is read by this same parser (§10.5).
 *
 * Behind the gate, because it writes to `raw_inputs` and `cv_entities`. The
 * ungated shock has already been delivered by this point — §3.2 puts account
 * creation at maximum emotional charge, which is the screen before this one.
 */
export default async function UploadIntake({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/gate");

  const { from } = await searchParams;

  return <UploadForm source={from === "linkedin" ? "linkedin" : null} />;
}
