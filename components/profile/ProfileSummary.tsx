"use client";

import { Button, LinkButton, Panel } from "@/components/ui";
import type { CareerProfile, QuestionnaireAnswers } from "@/lib/types";

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

const ANSWER_LABELS: [keyof QuestionnaireAnswers, string][] = [
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
 */
export function ProfileSummary({
  profile,
  onUploadNew,
  onEditAnswers,
}: ProfileSummaryProps) {
  const { cv, questionnaire } = profile;
  const answered = questionnaire
    ? ANSWER_LABELS.filter(([key]) => {
        const v = questionnaire[key];
        return typeof v === "string" && v.trim().length > 0;
      })
    : [];

  const counts = cv
    ? [
        `${cv.experience.length} ${cv.experience.length === 1 ? "ROLE" : "ROLES"}`,
        `${cv.skills.length} SKILLS`,
        `${cv.projects.length} ${cv.projects.length === 1 ? "PROJECT" : "PROJECTS"}`,
        `${cv.education.length} EDUCATION`,
      ].join(" · ")
    : null;

  return (
    <div className="grid gap-6">
      <Panel padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="mono-label text-gold">
            Source · {SOURCE_LABEL[profile.source]}
          </span>
          {profile.completedAt && (
            <span className="mono-label text-moonlight">
              Charted {formatDate(profile.completedAt)}
            </span>
          )}
        </div>

        {cv && (
          <div className="mt-5">
            <h2 className="text-h2 text-starlight">
              {cv.basics.name || "Your CV"}
            </h2>
            {cv.basics.headline && (
              <p className="mt-1 text-moonlight">{cv.basics.headline}</p>
            )}
            {counts && (
              <p className="mono-label mt-4 text-moonlight">{counts}</p>
            )}
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
          <div className={cv ? "mt-6 border-t pt-6" : "mt-5"}>
            <h2 className="text-h3 text-starlight">Your answers</h2>
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
