"use client";

import * as React from "react";
import { Button, Field, Input, Panel, Textarea } from "@/components/ui";
import { hasRealAnswer, NAME_MAX, type QuestionnaireDraft } from "./answers";

export interface QuestionnaireFormProps {
  initial?: QuestionnaireDraft;
  onSubmit: (answers: QuestionnaireDraft) => void;
  pending: boolean;
  submitLabel: string;
  submitError?: string | null;
  /** Optional escape hatch rendered as a ghost button beside submit. */
  onBack?: () => void;
  backLabel?: string;
}

type Key = keyof QuestionnaireDraft;

interface QuestionSpec {
  key: Key;
  label: string;
  help: string;
  kind: "input" | "textarea";
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
}

/** Three labeled groups, ten fields — one calm step, flexible formats. */
const GROUPS: { title: string; questions: QuestionSpec[] }[] = [
  {
    title: "Today",
    questions: [
      {
        key: "name",
        label: "Your name",
        help: "As you'd want it at the top of your CV — optional, but it makes the chart yours.",
        kind: "input",
        placeholder: "e.g. Ada Lovelace",
        autoComplete: "name",
        maxLength: NAME_MAX,
      },
      {
        key: "currentRole",
        label: "Your current role",
        help: "A job title, or plain words — “between roles” counts.",
        kind: "input",
        placeholder: "e.g. Junior data analyst",
      },
      {
        key: "yearsExperience",
        label: "Years of experience",
        help: "However you count them — “3”, “about 5”, “first job”.",
        kind: "input",
      },
      {
        key: "location",
        label: "Where you're based",
        help: "City and country is plenty.",
        kind: "input",
        placeholder: "e.g. Manchester, UK",
      },
    ],
  },
  {
    title: "Evidence",
    questions: [
      {
        key: "topSkills",
        label: "Your strongest skills",
        help: "Comma-separated or one per line — your call.",
        kind: "textarea",
      },
      {
        key: "proudestWork",
        label: "The work you're proudest of",
        help: "A project, a shipped thing, a hard problem — in your own words.",
        kind: "textarea",
      },
      {
        key: "extras",
        label: "Anything else that counts",
        help: "Side projects, volunteering, a portfolio, a community you run.",
        kind: "textarea",
      },
    ],
  },
  {
    title: "Foundations",
    questions: [
      {
        key: "education",
        label: "Education",
        help: "Degree, school, bootcamp, self-taught — as you'd say it.",
        kind: "input",
      },
      {
        key: "certifications",
        label: "Certifications",
        help: "Finished or in progress — both matter.",
        kind: "input",
      },
      {
        key: "workRights",
        label: "Where you can work",
        help: "e.g. “UK citizen”, “US green card”, “need sponsorship”.",
        kind: "input",
      },
    ],
  },
];

export function QuestionnaireForm({
  initial,
  onSubmit,
  pending,
  submitLabel,
  submitError,
  onBack,
  backLabel = "Back",
}: QuestionnaireFormProps) {
  const [answers, setAnswers] = React.useState<QuestionnaireDraft>(
    initial ?? {},
  );
  const [emptyError, setEmptyError] = React.useState<string | null>(null);

  function set(key: Key, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
    if (emptyError) setEmptyError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // A name alone is not a position — it never satisfies this gate.
    if (!hasRealAnswer(answers)) {
      setEmptyError(
        "Give us at least one answer — a role or a few skills is enough to start from.",
      );
      return;
    }
    onSubmit(answers);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-6">
        {GROUPS.map((group) => (
          <Panel key={group.title} padding="lg">
            <fieldset>
              <legend className="mb-5">
                <h2 className="text-h3 text-starlight">{group.title}</h2>
              </legend>
              <div className="grid gap-5">
                {group.questions.map((q) => (
                <Field
                  key={q.key}
                  label={q.label}
                  htmlFor={`q-${q.key}`}
                  help={q.help}
                >
                  {q.kind === "textarea" ? (
                    <Textarea
                      id={`q-${q.key}`}
                      rows={3}
                      value={answers[q.key] ?? ""}
                      placeholder={q.placeholder}
                      onChange={(e) => set(q.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      id={`q-${q.key}`}
                      value={answers[q.key] ?? ""}
                      placeholder={q.placeholder}
                      autoComplete={q.autoComplete}
                      maxLength={q.maxLength}
                      onChange={(e) => set(q.key, e.target.value)}
                    />
                  )}
                  </Field>
                ))}
              </div>
            </fieldset>
          </Panel>
        ))}
      </div>

      {(emptyError || submitError) && (
        <p role="alert" className="mt-4 text-sm text-ember">
          {emptyError ?? submitError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack}>
            {backLabel}
          </Button>
        )}
        <Button type="submit" size="lg" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
