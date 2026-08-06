"use client";

import * as React from "react";
import { Button, Field, Input, Panel, Textarea } from "@/components/ui";
import type { QuestionnaireAnswers } from "@/lib/types";

export interface QuestionnaireFormProps {
  initial?: QuestionnaireAnswers;
  onSubmit: (answers: QuestionnaireAnswers) => void;
  pending: boolean;
  submitLabel: string;
  submitError?: string | null;
  /** Optional escape hatch rendered as a ghost button beside submit. */
  onBack?: () => void;
  backLabel?: string;
}

type Key = keyof QuestionnaireAnswers;

interface QuestionSpec {
  key: Key;
  label: string;
  help: string;
  kind: "input" | "textarea";
  placeholder?: string;
}

/** Three labeled groups, nine fields — one calm step, flexible formats. */
const GROUPS: { title: string; questions: QuestionSpec[] }[] = [
  {
    title: "Today",
    questions: [
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
  const [answers, setAnswers] = React.useState<QuestionnaireAnswers>(
    initial ?? {},
  );
  const [emptyError, setEmptyError] = React.useState<string | null>(null);

  function set(key: Key, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
    if (emptyError) setEmptyError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasAny = Object.values(answers).some(
      (v) => typeof v === "string" && v.trim().length > 0,
    );
    if (!hasAny) {
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
