"use client";

import { Button, LinkButton, Panel } from "@/components/ui";
import type { QuestionnaireDraft } from "./answers";
import type { CareerProfile } from "@/lib/types";

export interface ProfileSummaryProps {
  profile: CareerProfile;
  onUploadNew: () => void;
  onEditAnswers: () => void;
}

const SOURCE_LABEL: Record<CareerProfile["source"], string> = {
  cv: "CV",
  questionnaire: "Answers",
  both: "CV + answers",
};

const ANSWER_LABELS: [keyof QuestionnaireDraft, string][] = [
  ["name", "Name"],
  ["currentRole", "Current role"],
  ["yearsExperience", "Experience"],
  ["location", "Location"],
  ["topSkills", "Top skills"],
  ["proudestWork", "Proudest work"],
  ["education", "Education"],
  ["certifications", "Certifications"],
  ["workRights", "Work rights"],
  ["extras", "More"],
];

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/** Deterministic date readout — no locale drift between server and client. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Revisit state: the saved profile at a glance, with re-upload and
 * edit-answers actions. The forward action stays "Take your bearing".
 *
 * Where the profile came from is an instrument reading, not a kicker: it
 * rides in the mono readout strip *under* the heading, alongside the counts
 * it belongs with (docs/DIRECTION.md hard-bans eyebrow labels above
 * headings). The charted date sits on the heading's own baseline.
 */
export function ProfileSummary({
  profile,
  onUploadNew,
  onEditAnswers,
}: ProfileSummaryProps) {
  const { cv } = profile;
  const questionnaire = profile.questionnaire as QuestionnaireDraft | null;
  const answered = questionnaire
    ? ANSWER_LABELS.filter(([key]) => {
        // The CV panel above already leads with the name — don't say it twice.
        if (key === "name" && cv) return false;
        const v = questionnaire[key];
        return typeof v === "string" && v.trim().length > 0;
      })
    : [];

  const charted = profile.completedAt
    ? `Charted ${formatDate(profile.completedAt)}`
    : null;

  // One readout strip per panel, under whichever heading leads it.
  const readout = [
    SOURCE_LABEL[profile.source],
    ...(cv
      ? [
          `${cv.experience.length} ${cv.experience.length === 1 ? "ROLE" : "ROLES"}`,
          `${cv.skills.length} SKILLS`,
          `${cv.projects.length} ${cv.projects.length === 1 ? "PROJECT" : "PROJECTS"}`,
          `${cv.education.length} EDUCATION`,
        ]
      : // Source reads "Answers" here, so the count needs no second noun.
        [`${answered.length} recorded`]),
  ].join(" · ");

  return (
    <div className="grid gap-6">
      <Panel padding="lg">
        {cv && (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className="text-h2 text-starlight">
                {cv.basics.name || "Your CV"}
              </h2>
              {charted && (
                <span className="mono-label text-moonlight">{charted}</span>
              )}
            </div>
            {cv.basics.headline && (
              <p className="mt-1 text-moonlight">{cv.basics.headline}</p>
            )}
            <p className="mono-label mt-4 text-moonlight">{readout}</p>
            {cv.experience[0] && (
              <p className="mt-4 text-starlight">
                {cv.experience[0].role}
                {cv.experience[0].company && (
                  <span className="text-moonlight">
                    {" "}
                    — {cv.experience[0].company}
                  </span>
                )}
              </p>
            )}
            {cv.skills.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Skills">
                {cv.skills.slice(0, 10).map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full border px-3 py-1 text-sm text-moonlight"
                  >
                    {skill}
                  </li>
                ))}
                {cv.skills.length > 10 && (
                  <li className="mono-label self-center px-1 text-moonlight">
                    +{cv.skills.length - 10} more
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        {answered.length > 0 && (
          <div className={cv ? "mt-6 border-t pt-6" : undefined}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className={cv ? "text-h3 text-starlight" : "text-h2 text-starlight"}>
                Your answers
              </h2>
              {!cv && charted && (
                <span className="mono-label text-moonlight">{charted}</span>
              )}
            </div>
            {!cv && <p className="mono-label mt-4 text-moonlight">{readout}</p>}
            <dl className="mt-4 grid gap-3">
              {answered.map(([key, label]) => (
                <div key={key} className="grid gap-0.5 sm:grid-cols-[10rem_1fr]">
                  <dt className="mono-label pt-0.5 text-moonlight">{label}</dt>
                  <dd className="whitespace-pre-line text-starlight">
                    {questionnaire?.[key]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <LinkButton href="/bearing" size="lg">
          Take your bearing
        </LinkButton>
        <Button type="button" variant="secondary" onClick={onUploadNew}>
          Upload a new CV
        </Button>
        <Button type="button" variant="secondary" onClick={onEditAnswers}>
          {answered.length > 0 ? "Edit answers" : "Add answers"}
        </Button>
      </div>
    </div>
  );
}
