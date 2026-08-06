"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Panel, useToast } from "@/components/ui";
import { saveProfile } from "@/app/(app)/profile/actions";
import { CVConfirm } from "./CVConfirm";
import { CVDropzone } from "./CVDropzone";
import { LinkedInDisclosure } from "./LinkedInDisclosure";
import { ParsingState } from "./ParsingState";
import { ProfileSummary } from "./ProfileSummary";
import { QuestionnaireForm } from "./QuestionnaireForm";
import type { QuestionnaireDraft } from "./answers";
import type { CareerProfile, CVData } from "@/lib/types";

export interface ProfileFlowProps {
  initialProfile: CareerProfile;
  userName: string | null;
}

type QuestionnaireMode = "fresh" | "addendum" | "edit";

type View =
  | { kind: "entry" }
  | { kind: "parsing"; fileName: string }
  | { kind: "parse-error"; message: string }
  | { kind: "confirm"; cv: CVData; storagePath: string | null }
  | { kind: "addendum" }
  | { kind: "questionnaire"; mode: QuestionnaireMode; initial?: QuestionnaireDraft }
  | { kind: "summary" };

const MSG_NETWORK =
  "The upload didn't go through. Check your connection and try again.";
const MSG_UNEXPECTED =
  "Something went wrong while reading your CV. Try again.";

/** Map what the CV already knows into the addendum questionnaire. */
function prefillFromCV(cv: CVData | null): QuestionnaireDraft {
  if (!cv) return {};
  const latest = cv.experience[0];
  return {
    name: cv.basics.name.trim() || undefined,
    currentRole: latest
      ? latest.company
        ? `${latest.role} at ${latest.company}`
        : latest.role
      : cv.basics.headline,
    location: cv.basics.location,
    topSkills: cv.skills.length > 0 ? cv.skills.join(", ") : undefined,
    education:
      cv.education
        .map((e) =>
          [e.degree, e.field, e.institution].filter(Boolean).join(", "),
        )
        .filter(Boolean)
        .join("\n") || undefined,
  };
}

/**
 * Open the questionnaire with the name we already hold (parsed CV, saved
 * answers, or the signed-in account) — the field is there to be corrected,
 * never to be asked twice.
 */
function withKnownName(
  answers: QuestionnaireDraft,
  fallback: string | null,
): QuestionnaireDraft {
  if (answers.name?.trim()) return answers;
  const name = fallback?.trim();
  return name ? { ...answers, name } : answers;
}

function heading(view: View): { title: string; sub?: string } {
  switch (view.kind) {
    case "confirm":
      return {
        title: "Here is what we understood",
        sub: "Check it against reality. Edit anything that reads wrong — these are your words, not ours.",
      };
    case "addendum":
      return {
        title: "Anything your CV doesn't show?",
        sub: "Certifications in progress, work rights, the work you're proudest of that never made the page.",
      };
    case "questionnaire":
      if (view.mode === "addendum") {
        return {
          title: "Anything your CV doesn't show?",
          sub: "Add what's missing, skip what doesn't apply. Your profile is already saved.",
        };
      }
      if (view.mode === "edit") {
        return {
          title: "Your answers",
          sub: "Adjust what's changed. Your next bearing reads from this.",
        };
      }
      return {
        title: "Where are you now?",
        sub: "Ten questions, plain words. Any format works — nothing here is graded.",
      };
    case "summary":
      return {
        title: "Your starting point",
        sub: "This is the position your bearing and route are drawn from. Keep it true.",
      };
    default:
      return {
        title: "Where are you now?",
        sub: "Your route starts from your true position — no polish needed, just what you've actually done.",
      };
  }
}

/**
 * The whole profile surface as one client state machine:
 * entry → parsing → confirm → (optional addendum) → /bearing, with the
 * questionnaire as the no-CV path and a summary state for return visits.
 * Every save lands before navigation — progress is never lost.
 */
export function ProfileFlow({ initialProfile, userName }: ProfileFlowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = React.useState<CareerProfile>(initialProfile);
  const [view, setView] = React.useState<View>(
    initialProfile.completedAt ? { kind: "summary" } : { kind: "entry" },
  );
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  /** Was the profile already complete when the page loaded? */
  const revisit = initialProfile.completedAt != null;

  /**
   * The saved answers as this surface collects them. `CareerProfile` types the
   * column as the shared contract; the profile surface also stores the name
   * there, so it survives a round trip back into the form.
   */
  const storedAnswers = profile.questionnaire as QuestionnaireDraft | null;

  // ---- CV path ------------------------------------------------------------

  async function handleFile(file: File) {
    setActionError(null);
    setView({ kind: "parsing", fileName: file.name });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/cv/parse", { method: "POST", body });
      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        // non-JSON failure body — fall through to the generic message
      }
      if (!res.ok) {
        const message =
          json !== null &&
          typeof json === "object" &&
          "error" in json &&
          typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : MSG_UNEXPECTED;
        setView({ kind: "parse-error", message });
        return;
      }
      const { cv, storagePath } = json as {
        cv: CVData;
        storagePath: string | null;
      };
      setView({ kind: "confirm", cv, storagePath });
    } catch {
      setView({ kind: "parse-error", message: MSG_NETWORK });
    }
  }

  function handleConfirm(cv: CVData, storagePath: string | null) {
    setActionError(null);
    startTransition(async () => {
      const res = await saveProfile({
        cv,
        cvFilePath: storagePath ?? undefined,
        stay: true,
      });
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      const updated: CareerProfile = {
        ...profile,
        cv,
        source: profile.questionnaire ? "both" : "cv",
        completedAt: profile.completedAt ?? new Date().toISOString(),
      };
      setProfile(updated);

      if (updated.questionnaire) {
        // Answers already on file — nothing left to ask.
        if (revisit) {
          toast("CV updated. Your chart stays true.", { tone: "success" });
          setView({ kind: "summary" });
        } else {
          router.push("/bearing");
        }
      } else {
        setView({ kind: "addendum" });
      }
    });
  }

  // ---- questionnaire path ---------------------------------------------------

  function handleQuestionnaire(
    answers: QuestionnaireDraft,
    mode: QuestionnaireMode,
  ) {
    setActionError(null);
    startTransition(async () => {
      if (mode === "edit") {
        const res = await saveProfile({ questionnaire: answers, stay: true });
        if (!res.ok) {
          setActionError(res.error);
          return;
        }
        setProfile((p) => ({
          ...p,
          questionnaire: answers,
          source: p.cv ? "both" : "questionnaire",
          completedAt: p.completedAt ?? new Date().toISOString(),
        }));
        toast("Answers saved. Your chart stays true.", { tone: "success" });
        setView({ kind: "summary" });
        return;
      }
      // fresh + addendum: the action redirects to /bearing on success
      const res = await saveProfile({ questionnaire: answers });
      if (res && !res.ok) setActionError(res.error);
    });
  }

  // ---- render ---------------------------------------------------------------

  const { title, sub } = heading(view);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="max-w-[65ch]">
        <h1 className="text-h1 text-starlight">{title}</h1>
        {sub && <p className="mt-3 text-moonlight">{sub}</p>}
      </div>

      <div className="mt-8">
        {view.kind === "entry" && (
          <div className="grid gap-6">
            <Panel padding="lg">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-h3 text-starlight">Upload your CV</h2>
                <span className="mono-label shrink-0 text-gold">
                  Recommended
                </span>
              </div>
              <p className="mt-1.5 text-sm text-moonlight">
                The fastest way to plot your position — we read it, you correct
                us.
              </p>
              <CVDropzone onFile={handleFile} className="mt-5" />
              <LinkedInDisclosure />
            </Panel>

            <Panel padding="lg" className="sm:flex sm:items-center sm:justify-between sm:gap-6">
              <div>
                <h2 className="text-h3 text-starlight">No CV handy?</h2>
                <p className="mt-1.5 text-sm text-moonlight">
                  Answer a few questions instead — same chart, drawn from your
                  words.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-4 shrink-0 sm:mt-0"
                onClick={() =>
                  setView({ kind: "questionnaire", mode: "fresh" })
                }
              >
                Answer the questions
              </Button>
            </Panel>

            {profile.completedAt && (
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setView({ kind: "summary" })}
                >
                  Keep my current profile
                </Button>
              </div>
            )}
          </div>
        )}

        {view.kind === "parsing" && <ParsingState fileName={view.fileName} />}

        {view.kind === "parse-error" && (
          <ErrorState
            title="The CV didn't come through"
            detail={view.message}
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => setView({ kind: "entry" })}
                >
                  Try another PDF
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setView({ kind: "questionnaire", mode: "fresh" })
                  }
                >
                  Answer the questions instead
                </Button>
              </div>
            }
          />
        )}

        {view.kind === "confirm" && (
          <CVConfirm
            initial={view.cv}
            pending={pending}
            submitError={actionError}
            onConfirm={(cv) => handleConfirm(cv, view.storagePath)}
            onDiscard={() => {
              setActionError(null);
              setView({ kind: "entry" });
            }}
          />
        )}

        {view.kind === "addendum" && (
          <Panel padding="lg" className="mx-auto max-w-xl">
            <p className="text-moonlight">
              {userName ? `${userName.split(" ")[0]}, your` : "Your"} profile
              is saved. A few plain-words answers can fill in what a CV never
              shows — or sail straight on to your bearing.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="lg"
                onClick={() => router.push("/bearing")}
              >
                Take your bearing
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setView({
                    kind: "questionnaire",
                    mode: "addendum",
                    initial: prefillFromCV(profile.cv),
                  })
                }
              >
                Add a few answers
              </Button>
            </div>
          </Panel>
        )}

        {view.kind === "questionnaire" && (
          <QuestionnaireForm
            initial={withKnownName(
              view.initial ??
                (view.mode === "edit"
                  ? storedAnswers ?? prefillFromCV(profile.cv)
                  : {}),
              userName,
            )}
            pending={pending}
            submitError={actionError}
            submitLabel={
              view.mode === "edit" ? "Save answers" : "Save and take your bearing"
            }
            onSubmit={(answers) => handleQuestionnaire(answers, view.mode)}
            onBack={() => {
              setActionError(null);
              if (view.mode === "addendum") setView({ kind: "addendum" });
              else if (view.mode === "edit") setView({ kind: "summary" });
              else setView({ kind: "entry" });
            }}
            backLabel={
              view.mode === "fresh" ? "I have a CV after all" : "Back"
            }
          />
        )}

        {view.kind === "summary" && (
          <ProfileSummary
            profile={profile}
            onUploadNew={() => {
              setActionError(null);
              setView({ kind: "entry" });
            }}
            onEditAnswers={() => {
              setActionError(null);
              setView({
                kind: "questionnaire",
                mode: "edit",
                initial: storedAnswers ?? prefillFromCV(profile.cv),
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
