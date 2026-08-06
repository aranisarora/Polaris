"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button, Dialog, Panel, useToast } from "@/components/ui";
import type { CVData, CVVersion } from "@/lib/types";
import { buildDiffLines, DIFF_SECTION_ORDER, DIFF_SECTION_TITLE } from "@/lib/cvdiff";
import { restoreVersion } from "@/app/(app)/cv/actions";
import { formatChartDate } from "./format";

/**
 * Chart revisions — every cv_versions snapshot (date, reason, score in
 * mono). Tapping a row opens the snapshot read-only; "Restore this version"
 * writes it as a NEW revision and makes it current. Nothing is lost and the
 * score never falls (max rule, enforced server-side).
 */
export function VersionHistory({ versions }: { versions: CVVersion[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [restoring, setRestoring] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const selected = versions.find((v) => v.id === openId) ?? null;

  async function handleRestore() {
    if (!selected) return;
    setRestoring(true);
    const result = await restoreVersion({ versionId: selected.id });
    setRestoring(false);

    if (!result.ok) {
      toast(result.error ?? "The restore didn't complete. Try again.", {
        tone: "error",
      });
      return;
    }

    toast(`Chart restored from ${formatChartDate(selected.createdAt)}.`, {
      tone: "success",
    });
    setOpenId(null);
    router.refresh();
  }

  return (
    // minmax(0,1fr) column: a ch-based max-width or an unbreakable token
    // must never size this track wider than the page (docs/DIRECTION.md —
    // the body never scrolls horizontally).
    <section
      aria-label="Chart revisions"
      className="grid grid-cols-[minmax(0,1fr)] gap-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-h2 text-starlight">
          Chart revisions
        </h2>
        {versions.length > 0 && (
          <span className="mono-label shrink-0 text-moonlight">
            {versions.length}{" "}
            {versions.length === 1 ? "revision" : "revisions"}
          </span>
        )}
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-moonlight">
          No revisions yet. Your chart takes a snapshot each time a waypoint
          completes.
        </p>
      ) : (
        <>
          {/* Plain reading beside the metaphor: a revision is a saved version. */}
          <p className="max-w-prose text-sm text-moonlight">
            Every saved version of your CV — the date, what changed it, and
            your score at the time. Open one to read it or restore it.
          </p>
          <Panel padding="none">
            <ul className="divide-y">
              {versions.map((version) => (
                <li key={version.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(version.id)}
                    className="flex min-h-12 w-full items-center gap-4 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-veil/30"
                  >
                    <span className="mono-label w-24 shrink-0 text-moonlight">
                      {formatChartDate(version.createdAt)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-starlight">
                      {version.reason || "Profile charted"}
                    </span>
                    <span className="mono-label shrink-0 text-gold">
                      {version.score}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}

      <Dialog
        open={selected != null}
        onClose={() => {
          if (!restoring) setOpenId(null);
        }}
        title={
          selected
            ? `Revision — ${formatChartDate(selected.createdAt)}`
            : "Revision"
        }
        description={selected?.reason || undefined}
        className="max-w-lg"
        footer={
          selected && (
            <>
              <Button
                variant="ghost"
                onClick={() => setOpenId(null)}
                disabled={restoring}
              >
                Close
              </Button>
              <Button loading={restoring} onClick={handleRestore}>
                Restore this version
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <p className="mono-label flex flex-wrap gap-x-5 gap-y-1">
              <span className="text-moonlight">
                {formatChartDate(selected.createdAt)}
              </span>
              <span className="text-gold">score {selected.score} / 100</span>
            </p>
            <SnapshotView cv={selected.snapshot} />
            <p className="text-sm text-moonlight">
              Restoring writes this snapshot as a new revision. Nothing is
              lost, and your score never falls.
            </p>
          </div>
        )}
      </Dialog>
    </section>
  );
}

/** Read-only render of a snapshot's CVData, compact, inside the dialog. */
function SnapshotView({ cv }: { cv: CVData }) {
  const lines = buildDiffLines(cv, []);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-lg border p-4">
      {(cv.basics?.name?.trim() || cv.basics?.headline?.trim()) && (
        <div>
          {cv.basics.name?.trim() && (
            <p className="font-display text-h3 text-starlight">
              {cv.basics.name}
            </p>
          )}
          {cv.basics.headline?.trim() && (
            <p className="mt-0.5 text-sm text-moonlight">
              {cv.basics.headline}
            </p>
          )}
        </div>
      )}

      {DIFF_SECTION_ORDER.map((section) => {
        const sectionLines = lines.filter((line) => line.section === section);
        if (sectionLines.length === 0) return null;
        return (
          <div key={section}>
            <p className="mono-label text-moonlight">
              {DIFF_SECTION_TITLE[section]}
            </p>
            <ul className="mt-1.5 grid gap-1">
              {sectionLines.map((line, index) => (
                <li
                  key={`${line.text}:${index}`}
                  className={cn(
                    "text-sm text-starlight",
                    line.kind === "entry" && "font-medium",
                  )}
                >
                  {line.text}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
