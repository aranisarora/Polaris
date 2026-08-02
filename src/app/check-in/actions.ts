"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * `docs/product.md` §11.3: every input must visibly change something they see.
 * Never ask a question whose answer only benefits us. So a check-in response
 * either completes the task or adjusts next week's load — it is never recorded
 * and forgotten.
 */
export async function submitCheckIn(formData: FormData): Promise<void> {
  const response = String(formData.get("response") ?? "");
  const taskSlug = String(formData.get("task") ?? "");

  const user = await getUser();
  const supabase = await createClient();

  if (user && supabase) {
    const weekOf = new Date();
    weekOf.setUTCDate(weekOf.getUTCDate() - weekOf.getUTCDay());

    await supabase.from("checkins").insert({
      profile_id: user.id,
      week_of: weekOf.toISOString().slice(0, 10),
      response,
    });

    if (response === "done" && taskSlug) {
      await supabase
        .from("roadmap_tasks")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("profile_id", user.id)
        .eq("action_slug", taskSlug);
    }
  }

  revalidatePath("/today");
  redirect("/today");
}
