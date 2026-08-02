"use server";

import { revalidatePath } from "next/cache";
import { getAction } from "@/lib/data/actions";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Completing a task.
 *
 * `docs/product.md` §11.5: auto-updating the CV as tasks complete is not a
 * supplementary feature, it is the reward mechanism of the loop. Student does a
 * project → CV visibly improves → Altitude moves. That reinforcement is what
 * stops the roadmap becoming an abandoned to-do list.
 *
 * So completion writes structured CV entities (§12.3), never a blob.
 */
export async function completeTask(formData: FormData): Promise<void> {
  const slug = String(formData.get("task") ?? "");
  const action = getAction(slug);
  if (!action) return;

  const user = await getUser();
  const supabase = await createClient();
  if (!user || !supabase) return;

  await supabase
    .from("roadmap_tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .eq("action_slug", slug);

  for (const produced of action.produces ?? []) {
    await supabase.from("cv_entities").insert({
      profile_id: user.id,
      kind: produced.kind,
      data: { title: produced.hint, from: action.title },
      origin: "task",
      origin_ref: slug,
    });
  }

  revalidatePath("/today");
  revalidatePath("/roadmap");
  revalidatePath("/signal");
}
