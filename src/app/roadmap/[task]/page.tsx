import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { formatDay } from "@/components/brand";
import { ACTION_CATEGORY_LABEL, type VerifyVia } from "@/lib/data/types";
import { loadViewer } from "@/lib/viewer";
import { completeTask } from "./actions";

export const metadata: Metadata = { title: "Task" };

const VERIFY_COPY: Record<VerifyVia, string> = {
  github: "Verifies from GitHub",
  leetcode: "Verifies from LeetCode",
  marksheet: "Verifies from your marksheet",
  credential: "Verifies from the credential ID",
  self: "You tick this one",
};

/**
 * `/roadmap/[task]` — task detail, evidence requirement, verification.
 *
 * §11.2's rule that this page exists to honour: **track outputs, not inputs.**
 * Every "done means" line names an artefact, never an hour count. And where
 * GitHub or LeetCode can see the artefact, there is nothing to tick at all —
 * §11.3 wants zero ongoing student effort wherever the evidence already exists
 * somewhere a machine can read.
 */
export default async function TaskPage(props: {
  params: Promise<{ task: string }>;
}) {
  const { task: slug } = await props.params;
  const v = await loadViewer();
  if (!v) redirect("/check");

  const task = v.roadmap.tasks.find((t) => t.id === slug);
  if (!task) notFound();

  const index = v.roadmap.tasks.indexOf(task);
  const auto = task.action.verifyVia !== "self";

  return (
    <AppShell active="roadmap" title={`Task ${index + 1}`}>
      <span className="cat">
        {ACTION_CATEGORY_LABEL[task.action.category]}
      </span>
      <h1 className="verdict v-lg" style={{ marginTop: 12 }}>
        {task.action.title}
      </h1>

      <div className="arith" style={{ lineHeight: 1.9, marginTop: 14 }}>
        <b>Effort</b>&nbsp;&nbsp;&nbsp;&nbsp;{task.action.effortHours} hours
        <br />
        <b>Due</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{formatDay(task.dueOn)}
        <br />
        <b>Evidence</b>&nbsp;{VERIFY_COPY[task.action.verifyVia]}
        {task.opens ? (
          <>
            <br />
            <b>Opens</b>&nbsp;&nbsp;&nbsp;&nbsp;
            <span className="ok">
              {task.opens} {task.opens === 1 ? "company" : "companies"}
            </span>
          </>
        ) : null}
      </div>

      <hr className="hr" />

      <div className="sect">
        <h3>Why this one</h3>
        <span className="ln" />
      </div>
      <p className="tiny" style={{ color: "var(--p-ink-2)" }}>
        {task.action.whyNow}
      </p>
      {task.because ? (
        <p className="fixline" style={{ marginTop: 12 }}>
          <b>For you:</b> {task.because}
        </p>
      ) : null}

      <hr className="hr" />

      <div className="sect">
        <h3>Done means</h3>
        <span className="ln" />
        <span className="n">{task.action.doneMeans.length}</span>
      </div>
      <div className="rows">
        {task.action.doneMeans.map((d) => (
          <div className="task" key={d.label}>
            <span className="bx" />
            <span className="task-b">
              <b>{d.label}</b>
              <span className="task-m">
                <span>{VERIFY_COPY[d.via]}</span>
                {d.detail ? <span>{d.detail}</span> : null}
              </span>
            </span>
          </div>
        ))}
      </div>

      {auto ? (
        <div className="card card--open" style={{ marginTop: 20 }}>
          <p className="tiny" style={{ margin: 0, color: "var(--p-ink-2)" }}>
            Nothing to tick — this verifies from{" "}
            {task.action.verifyVia === "github" ? "GitHub" : "your connected account"},
            and your CV updates itself when it passes.
          </p>
        </div>
      ) : null}

      {v.mechanismLocked ? (
        <div className="card card--fix" style={{ marginTop: 20 }}>
          <span className="eyebrow" style={{ color: "var(--p-fix)" }}>
            Free window closed
          </span>
          <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
            The plan stays yours and stays visible. What locked is the loop —
            check-in, verification and re-planning.
          </p>
          <Link
            href="/pricing"
            className="btn btn--a btn--full"
            style={{ marginTop: 12 }}
          >
            See what that costs
          </Link>
        </div>
      ) : (
        <form action={completeTask} style={{ marginTop: 20 }}>
          <input type="hidden" name="task" value={task.id} />
          <button type="submit" className="btn btn--o btn--full">
            {auto ? "Mark done anyway" : "Mark done"}
          </button>
        </form>
      )}

      <p className="tiny mono" style={{ marginTop: 16 }}>
        <Link href="/roadmap" style={{ color: "var(--p-accent)" }}>
          ← The whole plan
        </Link>
      </p>
    </AppShell>
  );
}
