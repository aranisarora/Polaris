import type {
  CVData,
  CVDiffLine,
  CVLine,
  QuestionnaireAnswers,
  RoadmapTask,
} from "@/lib/types";

/**
 * Living-CV diff builder (docs/CONTRACTS.md, owned by the living-CV agent).
 *
 * The diff shows the TARGET-state CV: every line the user already holds
 * (earned) merged with the lines their route will add (unearned, greyed,
 * tied to the task that unlocks them). Fixed section order — the basics
 * header renders separately from `CVData.basics` because `CVLine` cannot
 * target it (tasks never add basics lines).
 *
 * Done-task cvLines are included as EARNED lines with their taskId attached:
 * that is what lets a line un-grey in place when its task completes, and it
 * stays correct whether or not the roadmap agent also merges the line into
 * `career_profiles.cv_structured` (duplicates are de-duplicated by
 * normalized text, keeping the task-linked copy so the animation key is
 * stable).
 */

export const DIFF_SECTION_ORDER: readonly CVLine["section"][] = [
  "experience",
  "projects",
  "skills",
  "education",
];

export const DIFF_SECTION_TITLE: Record<CVLine["section"], string> = {
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  education: "Education",
};

/** Diff line plus a rendering hint: entry headings vs detail lines. */
export interface DiffLineDetail extends CVDiffLine {
  kind: "entry" | "detail";
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function dateSpan(start?: string, end?: string, current?: boolean): string {
  const from = start?.trim() ?? "";
  const to = current ? "now" : (end?.trim() ?? "");
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

interface SectionLine {
  text: string;
  kind: "entry" | "detail";
}

/** Compose the earned lines of a CVData, per section, in render order. */
function cvSectionLines(cv: CVData): Record<CVLine["section"], SectionLine[]> {
  const experience: SectionLine[] = [];
  for (const role of cv.experience ?? []) {
    const heading = [role.role?.trim(), role.company?.trim()]
      .filter(Boolean)
      .join(" — ");
    const dates = dateSpan(role.start, role.end, role.current);
    if (heading) {
      experience.push({
        text: dates ? `${heading} · ${dates}` : heading,
        kind: "entry",
      });
    }
    for (const bullet of role.bullets ?? []) {
      const text = bullet.trim();
      if (text) experience.push({ text, kind: "detail" });
    }
  }

  const projects: SectionLine[] = [];
  for (const project of cv.projects ?? []) {
    const head = [project.name?.trim(), project.description?.trim()]
      .filter(Boolean)
      .join(" — ");
    if (!head) continue;
    const tech = (project.tech ?? []).map((t) => t.trim()).filter(Boolean);
    projects.push({
      text: tech.length ? `${head} (${tech.join(", ")})` : head,
      kind: "entry",
    });
  }

  const skills: SectionLine[] = (cv.skills ?? [])
    .map((skill) => skill.trim())
    .filter(Boolean)
    .map((skill) => ({ text: skill, kind: "detail" as const }));

  const education: SectionLine[] = [];
  for (const school of cv.education ?? []) {
    const qualification = [school.degree?.trim(), school.field?.trim()]
      .filter(Boolean)
      .join(", ");
    const head = [qualification, school.institution?.trim()]
      .filter(Boolean)
      .join(" — ");
    if (!head) continue;
    const dates = dateSpan(school.start, school.end);
    education.push({
      text: dates ? `${head} · ${dates}` : head,
      kind: "entry",
    });
  }

  return { experience, projects, skills, education };
}

/**
 * Full diff with rendering hints. Stable ordering: per section, the CV's own
 * lines in document order, then task lines by roadmap position.
 */
export function buildDiffLines(
  profile: CVData,
  tasks: RoadmapTask[],
): DiffLineDetail[] {
  const bySection = cvSectionLines(profile);
  const taskLines = tasks
    .filter((task) => task.cvLine != null)
    .sort((a, b) => a.position - b.position);

  const out: DiffLineDetail[] = [];

  for (const section of DIFF_SECTION_ORDER) {
    const cvLines = bySection[section];
    const sectionTasks = taskLines.filter(
      (task) => task.cvLine!.section === section,
    );

    // Done tasks whose line may already exist verbatim in the CV: keep the
    // task-linked copy in the CV line's slot so keys stay stable.
    const doneByNorm = new Map<string, RoadmapTask>();
    for (const task of sectionTasks) {
      if (!task.done) continue;
      const key = normalize(task.cvLine!.text);
      if (key && !doneByNorm.has(key)) doneByNorm.set(key, task);
    }

    const cvNorms = new Set(cvLines.map((line) => normalize(line.text)));
    const consumed = new Set<string>();

    for (const line of cvLines) {
      const match = doneByNorm.get(normalize(line.text));
      if (match && !consumed.has(match.id)) {
        consumed.add(match.id);
        out.push({
          section,
          text: line.text,
          earned: true,
          taskId: match.id,
          kind: line.kind,
        });
      } else {
        out.push({
          section,
          text: line.text,
          earned: true,
          taskId: null,
          kind: line.kind,
        });
      }
    }

    for (const task of sectionTasks) {
      if (consumed.has(task.id)) continue;
      const text = task.cvLine!.text.trim();
      if (!text) continue;
      // A not-done task whose exact line the CV already holds adds nothing.
      if (!task.done && cvNorms.has(normalize(text))) continue;
      out.push({
        section,
        text,
        earned: task.done,
        taskId: task.id,
        kind: "detail",
      });
    }
  }

  return out;
}

/** Contract shape (docs/CONTRACTS.md): the diff without rendering hints. */
export function buildDiff(profile: CVData, tasks: RoadmapTask[]): CVDiffLine[] {
  return buildDiffLines(profile, tasks).map((line) => ({
    section: line.section,
    text: line.text,
    earned: line.earned,
    taskId: line.taskId,
  }));
}

/**
 * Earned lines a completed task adds that are NOT already in the CV itself —
 * the PDF export appends these so the exported document matches the earned
 * state of the diff view.
 */
export function earnedExtraLines(
  profile: CVData,
  tasks: RoadmapTask[],
): CVLine[] {
  const bySection = cvSectionLines(profile);
  const seen = new Map<CVLine["section"], Set<string>>();
  for (const section of DIFF_SECTION_ORDER) {
    seen.set(section, new Set(bySection[section].map((l) => normalize(l.text))));
  }

  const extras: CVLine[] = [];
  const done = tasks
    .filter((task) => task.done && task.cvLine != null)
    .sort((a, b) => a.position - b.position);

  for (const task of done) {
    const line = task.cvLine!;
    const text = line.text.trim();
    if (!text) continue;
    const norms = seen.get(line.section)!;
    const norm = normalize(text);
    if (norms.has(norm)) continue;
    norms.add(norm);
    extras.push({ section: line.section, text });
  }

  return extras;
}

/**
 * Deterministic CVData for users who chose the questionnaire path and have
 * no parsed CV. Nothing is invented — every field comes from their answers.
 */
export function questionnaireToCV(
  answers: QuestionnaireAnswers | null | undefined,
  name?: string | null,
  email?: string | null,
): CVData {
  const q = answers ?? {};

  const skills = (q.topSkills ?? "")
    .split(/[,;·\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  const certifications = (q.certifications ?? "")
    .split(/[,;·\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  const experience = q.currentRole?.trim()
    ? [
        {
          company: "",
          role: q.yearsExperience?.trim()
            ? `${q.currentRole.trim()} (${q.yearsExperience.trim()})`
            : q.currentRole.trim(),
          current: true,
          bullets: q.proudestWork?.trim() ? [q.proudestWork.trim()] : [],
        },
      ]
    : [];

  const education = q.education?.trim()
    ? [{ institution: q.education.trim() }]
    : [];

  return {
    basics: {
      name: name?.trim() ?? "",
      headline: q.currentRole?.trim() || undefined,
      email: email?.trim() || undefined,
      location: q.location?.trim() || undefined,
      links: [],
    },
    experience,
    education,
    skills: [...skills, ...certifications],
    projects: [],
  };
}
