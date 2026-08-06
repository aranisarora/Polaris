"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button, Dialog, useToast } from "@/components/ui";
import type { Checkin } from "@/lib/types";
import { answerCheckin } from "@/app/(app)/cv/actions";

/**
 * "While you were away" — the 48h check-in (docs/SPEC.md Check-ins).
 * ≤3 yes/no rows from open tasks. Yes marks done (never un-marks); closing
 * by any route is a one-tap dismiss that records completion with empty
 * answers, so the same questions never re-ask within 48h. Backdrop click,
 * Escape and the close button all dismiss — it never blocks the page.
 */
export function CheckInGate({ checkin }: { checkin: Checkin }) {
  const [open, setOpen] = React.useState(true);
  const [answers, setAnswers] = React.useState<Record<string, boolean>>({});
  const [pending, setPending] = React.useState(false);
  const settled = React.useRef(false);
  const router = useRouter();
  const { toast } = useToast();

  const answeredCount = Object.keys(answers).length;

  function dismiss() {
    if (pending) return;
    setOpen(false);
    if (!settled.current) {
      settled.current = true;
      // Fire-and-forget: dismissal must never hold the page.
      void answerCheckin({ checkinId: checkin.id, answers: [] });
    }
  }

  async function submit() {
    const list = Object.entries(answers).map(([taskId, done]) => ({
      taskId,
      done,
    }));
    if (list.length === 0) {
      dismiss();
      return;
    }

    setPending(true);
    const result = await answerCheckin({
      checkinId: checkin.id,
      answers: list,
    });
    setPending(false);

    if (!result.ok) {
      toast(result.error ?? "That didn't save. Try again.", { tone: "error" });
      return;
    }

    settled.current = true;
    setOpen(false);

    if (result.marked > 0) {
      const delta =
        result.score != null && result.previousScore != null
          ? result.score - result.previousScore
          : 0;
      toast(
        delta > 0
          ? `+${delta} — your chart brightens.`
          : "Marked done — your chart holds its score.",
        { tone: "success" },
      );
    } else {
      toast("Noted. Your route holds.");
    }
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      title="While you were away"
      description="Your route kept its course. Mark anything you finished — nothing un-marks."
      footer={
        <>
          <Button variant="ghost" onClick={dismiss} disabled={pending}>
            Not now
          </Button>
          <Button
            onClick={submit}
            loading={pending}
            disabled={!pending && answeredCount === 0}
          >
            Log progress
          </Button>
        </>
      }
    >
      <ul className="grid gap-2.5">
        {checkin.questions.map((question) => {
          const value = answers[question.taskId];
          return (
            <li
              key={question.taskId}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border px-4 py-3"
            >
              <span className="min-w-0 flex-1 text-sm text-starlight">
                {question.question}
              </span>
              <div
                role="group"
                aria-label={question.question}
                className="flex shrink-0 gap-2"
              >
                <YesNoButton
                  pressed={value === true}
                  onClick={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [question.taskId]: true,
                    }))
                  }
                  selectedClassName="border-transparent bg-gold text-night"
                >
                  Yes
                </YesNoButton>
                <YesNoButton
                  pressed={value === false}
                  onClick={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [question.taskId]: false,
                    }))
                  }
                  selectedClassName="border-transparent bg-veil text-starlight"
                >
                  No
                </YesNoButton>
              </div>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

function YesNoButton({
  pressed,
  onClick,
  selectedClassName,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  selectedClassName: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 min-w-14 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors duration-150",
        pressed
          ? selectedClassName
          : "text-moonlight hover:bg-veil/30 hover:text-starlight",
      )}
    >
      {children}
    </button>
  );
}
