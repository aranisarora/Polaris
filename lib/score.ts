import type { CVData, RoadmapTask, TaskCategory } from "@/lib/types";

/**
 * Category weights for the readiness score. Projects and real experience
 * move a CV most (1.5), certifications are strong signals (1.2), individual
 * skills are the baseline unit of progress (1.0).
 */
export const CATEGORY_WEIGHT: Record<TaskCategory, number> = {
  project: 1.5,
  experience: 1.5,
  certification: 1.2,
  skill: 1.0,
};

function taskWeight(task: RoadmapTask): number {
  return CATEGORY_WEIGHT[task.category] ?? 1.0;
}

/**
 * CV readiness score, 0–100. Deterministic — no AI involved.
 *
 * Formula (docs/CONTRACTS.md):
 *   score = 35 + 65 × (Σ weight(done tasks) / Σ weight(all tasks))
 *
 * - The 35 base represents the completed profile the roadmap was built on.
 * - The remaining 65 points are earned by completing roadmap tasks,
 *   weighted by category (see CATEGORY_WEIGHT), so finishing a project
 *   moves the needle more than picking up a single skill.
 * - No tasks yet → progress is 0 → score is the 35 base.
 * - Result is rounded and clamped to 0–100.
 *
 * The NEVER-DECREASE rule is applied by callers, not here: persist
 * `max(previousScore, computeScore(...))` against the latest stored
 * cv_versions row.
 */
export function computeScore(profile: CVData, tasks: RoadmapTask[]): number {
  const base = profile ? 35 : 0;

  const totalWeight = tasks.reduce((sum, task) => sum + taskWeight(task), 0);
  const doneWeight = tasks.reduce(
    (sum, task) => sum + (task.done ? taskWeight(task) : 0),
    0,
  );

  const progress = totalWeight > 0 ? doneWeight / totalWeight : 0;
  const score = Math.round(base + 65 * progress);

  return Math.min(100, Math.max(0, score));
}
