import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { formatDay } from "@/components/brand";
import { ACTION_CATEGORY_LABEL } from "@/lib/data/types";
import { activeTasks } from "@/lib/engine/roadmap";
import { loadViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "This week" };

/**
 * `/today` — home. `docs/product.md` §11.3: **max 3 items.**
 *
 * "Plan is long, view is short. A 40-item roadmap is demotivating and gets
 * abandoned — keep the full plan visible, surface only this week."
 */
export default async function TodayPage() {
  const v = await loadViewer();
  if (!v) redirect("/check");

  const tasks = activeTasks(v.roadmap, 3);
  const pct = Math.round((v.altitude.value / 90) * 100);
  const benchmarkPct = Math.round((v.altitude.benchmark / 90) * 100);

  return (
    <AppShell active="today" title="This week">
      <span className="eyebrow">Altitude · the angle to your target</span>

      <div className="alt" style={{ marginTop: 12 }}>
        <b>{v.altitude.value}</b>
        <span className="deg">°</span>
        {v.altitudeAfterRepair > v.altitude.value ? (
          <span className="d">
            → {v.altitudeAfterRepair}° with the fixable gates closed
          </span>
        ) : null}
      </div>

      <div className="scale">
        <i style={{ width: `${pct}%` }} />
        <u style={{ left: `${benchmarkPct}%` }} />
      </div>
      <div className="scale-l">
        <span>You · {v.altitude.value}°</span>
        <span>
          {v.altitude.benchmarkLabel} · {v.altitude.benchmark}°
        </span>
      </div>

      {/* The honesty note. §6 says calibration is the moat and only exists
          after a cohort completes a cycle. None has. So the benchmark is a
          derived statement about this student's own ledger, not an observed
          conversion rate, and the screen says so rather than implying we
          measured something we have not. */}
      <p className="tiny" style={{ marginTop: 10 }}>
        Modelled from your ledger and your evidence, not from observed
        conversion — we have not run a cohort through a full placement season
        yet, and will not pretend otherwise.
      </p>

      <hr className="hr" />

      <div className="sect">
        <h3>This week</h3>
        <span className="ln" />
        <span className="n">
          {tasks.length} of {v.roadmap.tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="tiny">Nothing scheduled. Open the plan to pick something up.</p>
      ) : (
        <div className="rows">
          {tasks.map((t) => (
            <Link key={t.id} href={`/roadmap/${t.id}`} className="task">
              <span className={`bx${t.status === "done" ? " done" : ""}`} />
              <span className="task-b">
                <b>{t.action.title}</b>
                <span className="task-m">
                  <span className="cat">
                    {ACTION_CATEGORY_LABEL[t.action.category]}
                  </span>
                  <span>{t.action.effortHours} hrs</span>
                  <span>Due {formatDay(t.dueOn)}</span>
                  {t.opens ? <span>Opens {t.opens}</span> : null}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <hr className="hr" />

      <div className="card card--open">
        <div className="arith" style={{ marginTop: 0 }}>
          <b>{v.countdown.weeks} weeks</b> to {v.countdown.deadlineLabel}
          <br />
          <b>{v.countdown.usableHours} hours</b> usable, at{" "}
          {v.countdown.hoursPerWeek} a week
        </div>
        {v.countdown.deadlineProjected ? (
          <p className="tiny" style={{ marginTop: 8 }}>
            That date is derived from VTU&rsquo;s term pattern — the calendar for
            that session is not published yet.
          </p>
        ) : null}
      </div>

      <Link
        href="/check-in"
        className="btn btn--o btn--full"
        style={{ marginTop: 18 }}
      >
        Weekly check-in
      </Link>

      {v.userId && v.plan === "free" && v.freeDaysLeft !== null ? (
        <p className="tiny mono" style={{ marginTop: 14 }}>
          {v.mechanismLocked
            ? "Free window closed. Your plan stays visible."
            : `Free access: ${v.freeDaysLeft} days left. Your plan stays either way.`}
        </p>
      ) : null}
    </AppShell>
  );
}
