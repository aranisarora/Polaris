"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import {
  Button,
  Dialog,
  Field,
  IconButton,
  Input,
  Panel,
  Textarea,
} from "@/components/ui";
import { ChipListEditor } from "./ChipListEditor";
import type {
  CVData,
  CVEducation,
  CVExperience,
  CVProject,
} from "@/lib/types";

export interface CVConfirmProps {
  initial: CVData;
  pending: boolean;
  submitError?: string | null;
  onConfirm: (cv: CVData) => void;
  /** "Use a different PDF" — back to the dropzone, nothing kept. */
  onDiscard: () => void;
}

/** Drop entries and bullets the user emptied out before saving. */
function sanitize(cv: CVData): CVData {
  return {
    basics: {
      ...cv.basics,
      name: cv.basics.name.trim(),
      links: cv.basics.links.map((l) => l.trim()).filter(Boolean),
    },
    experience: cv.experience
      .map((e) => ({ ...e, bullets: e.bullets.map((b) => b.trim()).filter(Boolean) }))
      .filter((e) => e.role.trim() || e.company.trim() || e.bullets.length > 0),
    education: cv.education.filter(
      (e) => e.institution.trim() || e.degree?.trim() || e.field?.trim(),
    ),
    skills: cv.skills.map((s) => s.trim()).filter(Boolean),
    projects: cv.projects
      .map((p) => ({ ...p, tech: p.tech.map((t) => t.trim()).filter(Boolean) }))
      .filter((p) => p.name.trim() || p.description.trim()),
  };
}

/**
 * "Here is what we understood" — the parsed CV as editable grouped panels.
 * Every field is editable inline; nothing saves until "This is me".
 */
export function CVConfirm({
  initial,
  pending,
  submitError,
  onConfirm,
  onDiscard,
}: CVConfirmProps) {
  const [cv, setCv] = React.useState<CVData>(initial);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = React.useState(false);

  // ---- update helpers -----------------------------------------------------

  function setBasics(patch: Partial<CVData["basics"]>) {
    setCv((c) => ({ ...c, basics: { ...c.basics, ...patch } }));
  }

  function updateExperience(i: number, patch: Partial<CVExperience>) {
    setCv((c) => ({
      ...c,
      experience: c.experience.map((e, idx) =>
        idx === i ? { ...e, ...patch } : e,
      ),
    }));
  }

  function updateEducation(i: number, patch: Partial<CVEducation>) {
    setCv((c) => ({
      ...c,
      education: c.education.map((e, idx) =>
        idx === i ? { ...e, ...patch } : e,
      ),
    }));
  }

  function updateProject(i: number, patch: Partial<CVProject>) {
    setCv((c) => ({
      ...c,
      projects: c.projects.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    }));
  }

  function removeAt<T>(list: T[], i: number): T[] {
    return list.filter((_, idx) => idx !== i);
  }

  function handleConfirm() {
    const clean = sanitize(cv);
    if (!clean.basics.name) {
      setNameError("Add your name — the chart needs to know who it's for.");
      document.getElementById("cv-name")?.focus();
      return;
    }
    setNameError(null);
    onConfirm(clean);
  }

  /**
   * "Use a different PDF" sits one slip away from the primary CTA and
   * onDiscard keeps nothing — so if the parsed CV has been edited, ask
   * before throwing the corrections away.
   */
  function handleDiscard() {
    const dirty = JSON.stringify(cv) !== JSON.stringify(initial);
    if (dirty) setConfirmingDiscard(true);
    else onDiscard();
  }

  const counts = [
    `${cv.experience.length} ${cv.experience.length === 1 ? "ROLE" : "ROLES"}`,
    `${cv.skills.length} SKILLS`,
    `${cv.projects.length} ${cv.projects.length === 1 ? "PROJECT" : "PROJECTS"}`,
  ].join(" · ");

  return (
    <div className="grid gap-6">
      {/* ------------------------------------------------------------ basics */}
      <Panel padding="lg">
        <h2 className="text-h3 text-starlight">Basics</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="cv-name" error={nameError ?? undefined}>
            <Input
              id="cv-name"
              value={cv.basics.name}
              invalid={!!nameError}
              onChange={(e) => {
                setBasics({ name: e.target.value });
                if (nameError) setNameError(null);
              }}
            />
          </Field>
          <Field label="Headline" htmlFor="cv-headline" help="How you'd introduce yourself in one line.">
            <Input
              id="cv-headline"
              value={cv.basics.headline ?? ""}
              onChange={(e) => setBasics({ headline: e.target.value })}
            />
          </Field>
          <Field label="Email" htmlFor="cv-email">
            <Input
              id="cv-email"
              type="email"
              value={cv.basics.email ?? ""}
              onChange={(e) => setBasics({ email: e.target.value })}
            />
          </Field>
          <Field label="Phone" htmlFor="cv-phone">
            <Input
              id="cv-phone"
              type="tel"
              value={cv.basics.phone ?? ""}
              onChange={(e) => setBasics({ phone: e.target.value })}
            />
          </Field>
          <Field label="Location" htmlFor="cv-location">
            <Input
              id="cv-location"
              value={cv.basics.location ?? ""}
              onChange={(e) => setBasics({ location: e.target.value })}
            />
          </Field>
        </div>
        <ChipListEditor
          id="cv-links"
          label="Links"
          className="mt-4"
          values={cv.basics.links}
          onChange={(links) => setBasics({ links })}
          placeholder="https://…"
          addLabel="Add link"
        />
      </Panel>

      {/* -------------------------------------------------------- experience */}
      <Panel padding="lg">
        <h2 className="text-h3 text-starlight">Experience</h2>
        {cv.experience.length === 0 && (
          <p className="mt-3 text-moonlight">
            Your CV showed no work history. If a role is missing, add it below.
          </p>
        )}
        <div className="mt-5 grid gap-8">
          {cv.experience.map((exp, i) => (
            <div key={i} className={i > 0 ? "border-t pt-8" : undefined}>
              <div className="flex items-center justify-between gap-3">
                <span className="mono-label text-moonlight">
                  Role {String(i + 1).padStart(2, "0")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setCv((c) => ({ ...c, experience: removeAt(c.experience, i) }))
                  }
                >
                  Remove role
                </Button>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Role" htmlFor={`exp-role-${i}`}>
                  <Input
                    id={`exp-role-${i}`}
                    value={exp.role}
                    onChange={(e) => updateExperience(i, { role: e.target.value })}
                  />
                </Field>
                <Field label="Company" htmlFor={`exp-company-${i}`}>
                  <Input
                    id={`exp-company-${i}`}
                    value={exp.company}
                    onChange={(e) =>
                      updateExperience(i, { company: e.target.value })
                    }
                  />
                </Field>
                <Field label="Start" htmlFor={`exp-start-${i}`} help="Any format — “Mar 2021” works.">
                  <Input
                    id={`exp-start-${i}`}
                    value={exp.start ?? ""}
                    onChange={(e) => updateExperience(i, { start: e.target.value })}
                  />
                </Field>
                <Field label="End" htmlFor={`exp-end-${i}`}>
                  <Input
                    id={`exp-end-${i}`}
                    value={exp.end ?? ""}
                    disabled={exp.current}
                    placeholder={exp.current ? "Present" : undefined}
                    onChange={(e) => updateExperience(i, { end: e.target.value })}
                  />
                </Field>
              </div>
              <label className="mt-3 flex min-h-11 w-fit cursor-pointer items-center gap-2.5 text-sm text-starlight">
                <input
                  type="checkbox"
                  checked={exp.current ?? false}
                  onChange={(e) =>
                    updateExperience(i, { current: e.target.checked })
                  }
                  className="size-4 accent-gold"
                />
                I&rsquo;m still in this role
              </label>

              <div className="mt-4">
                <p className="mb-1.5 text-sm font-medium text-starlight">
                  What you did — kept in your words
                </p>
                <div className="grid gap-2.5">
                  {exp.bullets.map((bullet, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <Textarea
                        rows={2}
                        aria-label={`Bullet ${j + 1} of role ${i + 1}`}
                        value={bullet}
                        className="flex-1"
                        style={{ minHeight: "2.75rem" }}
                        onChange={(e) =>
                          updateExperience(i, {
                            bullets: exp.bullets.map((b, idx) =>
                              idx === j ? e.target.value : b,
                            ),
                          })
                        }
                      />
                      <IconButton
                        aria-label={`Remove bullet ${j + 1} of role ${i + 1}`}
                        onClick={() =>
                          updateExperience(i, {
                            bullets: removeAt(exp.bullets, j),
                          })
                        }
                      >
                        <X size={16} strokeWidth={1.5} aria-hidden />
                      </IconButton>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2"
                  onClick={() =>
                    updateExperience(i, { bullets: [...exp.bullets, ""] })
                  }
                >
                  <Plus size={16} strokeWidth={1.5} aria-hidden />
                  Add bullet
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={() =>
            setCv((c) => ({
              ...c,
              experience: [
                ...c.experience,
                { company: "", role: "", bullets: [""] },
              ],
            }))
          }
        >
          Add another role
        </Button>
      </Panel>

      {/* --------------------------------------------------------- education */}
      <Panel padding="lg">
        <h2 className="text-h3 text-starlight">Education</h2>
        {cv.education.length === 0 && (
          <p className="mt-3 text-moonlight">
            Your CV showed no education. Add it here if that&rsquo;s wrong.
          </p>
        )}
        <div className="mt-5 grid gap-8">
          {cv.education.map((edu, i) => (
            <div key={i} className={i > 0 ? "border-t pt-8" : undefined}>
              <div className="flex items-center justify-between gap-3">
                <span className="mono-label text-moonlight">
                  Entry {String(i + 1).padStart(2, "0")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setCv((c) => ({ ...c, education: removeAt(c.education, i) }))
                  }
                >
                  Remove entry
                </Button>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Institution" htmlFor={`edu-inst-${i}`}>
                  <Input
                    id={`edu-inst-${i}`}
                    value={edu.institution}
                    onChange={(e) =>
                      updateEducation(i, { institution: e.target.value })
                    }
                  />
                </Field>
                <Field label="Degree" htmlFor={`edu-degree-${i}`}>
                  <Input
                    id={`edu-degree-${i}`}
                    value={edu.degree ?? ""}
                    onChange={(e) => updateEducation(i, { degree: e.target.value })}
                  />
                </Field>
                <Field label="Field of study" htmlFor={`edu-field-${i}`}>
                  <Input
                    id={`edu-field-${i}`}
                    value={edu.field ?? ""}
                    onChange={(e) => updateEducation(i, { field: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start" htmlFor={`edu-start-${i}`}>
                    <Input
                      id={`edu-start-${i}`}
                      value={edu.start ?? ""}
                      onChange={(e) =>
                        updateEducation(i, { start: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="End" htmlFor={`edu-end-${i}`}>
                    <Input
                      id={`edu-end-${i}`}
                      value={edu.end ?? ""}
                      onChange={(e) => updateEducation(i, { end: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={() =>
            setCv((c) => ({
              ...c,
              education: [...c.education, { institution: "" }],
            }))
          }
        >
          Add education
        </Button>
      </Panel>

      {/* ------------------------------------------------------------ skills */}
      <Panel padding="lg">
        <h2 className="text-h3 text-starlight">Skills</h2>
        <ChipListEditor
          id="cv-skills"
          label="Your skills, one at a time"
          className="mt-5"
          values={cv.skills}
          onChange={(skills) => setCv((c) => ({ ...c, skills }))}
          placeholder="e.g. Python"
          addLabel="Add skill"
          help="Only what your CV can back up — the roadmap builds the rest."
        />
      </Panel>

      {/* ---------------------------------------------------------- projects */}
      <Panel padding="lg">
        <h2 className="text-h3 text-starlight">Projects</h2>
        {cv.projects.length === 0 && (
          <p className="mt-3 text-moonlight">
            Your CV showed no projects. Side work counts — add it if you have it.
          </p>
        )}
        <div className="mt-5 grid gap-8">
          {cv.projects.map((project, i) => (
            <div key={i} className={i > 0 ? "border-t pt-8" : undefined}>
              <div className="flex items-center justify-between gap-3">
                <span className="mono-label text-moonlight">
                  Project {String(i + 1).padStart(2, "0")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setCv((c) => ({ ...c, projects: removeAt(c.projects, i) }))
                  }
                >
                  Remove project
                </Button>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor={`proj-name-${i}`}>
                  <Input
                    id={`proj-name-${i}`}
                    value={project.name}
                    onChange={(e) => updateProject(i, { name: e.target.value })}
                  />
                </Field>
                <Field label="Link" htmlFor={`proj-link-${i}`}>
                  <Input
                    id={`proj-link-${i}`}
                    value={project.link ?? ""}
                    placeholder="https://…"
                    onChange={(e) => updateProject(i, { link: e.target.value })}
                  />
                </Field>
              </div>
              <Field
                label="Description"
                htmlFor={`proj-desc-${i}`}
                className="mt-4"
              >
                <Textarea
                  id={`proj-desc-${i}`}
                  rows={3}
                  value={project.description}
                  onChange={(e) =>
                    updateProject(i, { description: e.target.value })
                  }
                />
              </Field>
              <ChipListEditor
                id={`proj-tech-${i}`}
                label="Built with"
                className="mt-4"
                values={project.tech}
                onChange={(tech) => updateProject(i, { tech })}
                placeholder="e.g. React"
                addLabel="Add"
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={() =>
            setCv((c) => ({
              ...c,
              projects: [...c.projects, { name: "", description: "", tech: [] }],
            }))
          }
        >
          Add a project
        </Button>
      </Panel>

      {/* ------------------------------------------------------- confirm bar */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 rounded-xl border bg-night p-3 shadow-raised sm:p-4 md:bottom-6">
        {submitError && (
          <p role="alert" className="mb-3 px-1 text-sm text-ember">
            {submitError}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="mono-label px-1 text-moonlight">{counts}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleDiscard}>
              Use a different PDF
            </Button>
            <Button
              type="button"
              size="lg"
              loading={pending}
              onClick={handleConfirm}
            >
              This is me
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={confirmingDiscard}
        onClose={() => setConfirmingDiscard(false)}
        title="Discard your corrections?"
        description="You've edited what we read from your PDF. Starting over with a different upload loses those edits."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmingDiscard(false)}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmingDiscard(false);
                onDiscard();
              }}
            >
              Discard and start over
            </Button>
          </>
        }
      />
    </div>
  );
}
