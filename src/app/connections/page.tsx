import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { loadViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Connections" };

/**
 * `/connections` — verification (`docs/product.md` §11.2).
 *
 * GitHub OAuth is the single best mechanism available: free API, students have
 * accounts, it verifies the highest-value task type automatically, and it powers
 * the audit with real evidence. Zero ongoing student effort.
 *
 * §11.4 is the reason there is no Udemy or Coursera row here, and the reason
 * that absence is stated rather than hidden: courses are the lowest-signal
 * action in the catalogue, completion is trivially gameable, and a readiness
 * score that rises on course completion manufactures exactly the undifferentiated
 * candidate the market is rejecting.
 */
export default async function ConnectionsPage() {
  const v = await loadViewer();
  if (!v) redirect("/check");

  const gh = v.signals.github;
  const lc = v.signals.leetcode;

  return (
    <AppShell active="signal" title="Connections">
      <h1 className="verdict v-lg">Let your work speak.</h1>
      <p className="lede" style={{ marginTop: 10, marginBottom: 20 }}>
        Connected accounts mean no boxes to tick.
      </p>

      <div className="stack g10">
        <div className="route">
          <span
            className="ic"
            style={
              gh
                ? { background: "var(--p-open-w)", color: "var(--p-open)" }
                : undefined
            }
          >
            GH
          </span>
          <span className="tx">
            <b>GitHub</b>
            <span className="mono">
              {gh
                ? `${gh.username} · ${gh.totalCommits} commits across ${gh.distinctCommitDays} days`
                : "Repos, languages, commit history, README text"}
            </span>
          </span>
          <span className={`stamp ${gh ? "stamp--open" : "stamp--settled"}`}>
            {gh ? "Live" : "Not connected"}
          </span>
        </div>

        <div className="route">
          <span className="ic">LC</span>
          <span className="tx">
            <b>LeetCode</b>
            <span className="mono">
              {lc
                ? `${lc.solved} solved · ${lc.medium} medium`
                : "Solved counts, and the mix"}
            </span>
          </span>
          <span className={`stamp ${lc ? "stamp--open" : "stamp--settled"}`}>
            {lc ? "Live" : "Not connected"}
          </span>
        </div>

        <div className="route">
          <span className="ic">MS</span>
          <span className="tx">
            <b>Semester marksheet</b>
            <span>Updates CGPA and backlogs, and re-runs the ledger</span>
          </span>
          <span className="stamp stamp--fix">When results land</span>
        </div>

        <div className="route">
          <span className="ic">CR</span>
          <span className="tx">
            <b>Certifications</b>
            <span>AWS / Azure / GCP / NPTEL · credential ID</span>
          </span>
        </div>
      </div>

      <div className="card card--fix" style={{ marginTop: 20 }}>
        <span className="eyebrow" style={{ color: "var(--p-fix)" }}>
          Not wired up yet
        </span>
        <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
          GitHub OAuth and the LeetCode reader arrive with the loop. Until then
          the six questions carry the same information, and the audit reads the
          same either way.
        </p>
      </div>

      <hr className="hr" />

      <div className="card">
        <span className="eyebrow">Deliberately not tracked</span>
        <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
          Udemy and Coursera progress. We score what you build, never the
          percentage watched — a score that rises on course completion produces
          exactly the profile the market is currently rejecting. The two
          exceptions are proctored and carry real weight: cloud certifications,
          and NPTEL.
        </p>
      </div>
    </AppShell>
  );
}
