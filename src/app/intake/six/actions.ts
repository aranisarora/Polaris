"use server";

import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * The six-question intake → structured CV entities (`docs/product.md` §12.3).
 *
 * §10.4 notes this route frequently yields *better* data than a student's
 * LinkedIn, because we ask the right questions. It is also the only intake that
 * needs nothing but a thumb, which is why it exists.
 *
 * Everything is written as entities, never as a blob — and the raw answers are
 * kept verbatim per §12.4, because a parser bug in month two must not destroy
 * what the student typed.
 */
export async function submitSix(formData: FormData): Promise<void> {
  const user = await getUser();
  const supabase = await createClient();
  if (!user || !supabase) redirect("/gate");

  const raw = Object.fromEntries(formData.entries());

  await supabase.from("raw_inputs").insert({
    profile_id: user.id,
    kind: "six-questions",
    payload: raw,
  });

  const projects = [1, 2, 3]
    .map((n) => ({
      title: String(formData.get(`project${n}Title`) ?? "").trim(),
      blurb: String(formData.get(`project${n}Blurb`) ?? "").trim(),
      deployedUrl: String(formData.get(`project${n}Url`) ?? "").trim(),
    }))
    .filter((p) => p.title.length > 0);

  if (projects.length) {
    await supabase.from("cv_entities").insert(
      projects.map((p) => ({
        profile_id: user.id,
        kind: "project",
        data: {
          title: p.title,
          blurb: p.blurb || undefined,
          deployedUrl: p.deployedUrl || undefined,
        },
        origin: "six-questions",
      })),
    );
  }

  const leetcode = String(formData.get("leetcode") ?? "").trim();
  if (leetcode) {
    await supabase.from("connections").upsert(
      {
        profile_id: user.id,
        provider: "leetcode",
        handle: leetcode,
        data: {
          solved: Number(formData.get("leetcodeSolved") ?? 0),
          easy: Number(formData.get("leetcodeEasy") ?? 0),
          medium: Number(formData.get("leetcodeMedium") ?? 0),
          hard: 0,
        },
      },
      { onConflict: "profile_id,provider,handle" },
    );
  }

  redirect("/signal");
}
