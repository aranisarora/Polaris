import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SourceTag, formatDate, formatDay } from "@/components/brand";
import { ACTION_CATEGORY_LABEL } from "@/lib/data/types";
import { loadViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Your whole plan" };

/**
 * `/roadmap` — the whole plan, always visible, always free.
 *
 * `docs/platform.md` §4.2 is emphatic about why: showing the whole mountain
 * costs nothing, is the most persuasive artefact we own, and is
 * screenshot-shareable. What converts is losing the *mechanism* that makes the
 * plan happen — not being denied sight of it. Gate the mechanism, never the
 * content.
 *
 * Desktop is first-class here (§1.5): deep work is not a phone task, so the
 * full two-semester plan gets a two-pane layout with this week alongside.
 */
export default async function RoadmapPage() {
  const v = await loadViewer();
  if (!v) redirect("/check");

  const { roadmap } = v;
  const firstOpen = roadmap.tasks.find((t) => t.status === "todo");

  return (
    <AppShell
      active="roadmap"
      title="Roadmap"
      aside={
        <>
          <span className="eyebrow">This week</span>
          <div className="rows" style={{ marginTop: 10 }}>
            {roadmap.tasks.slice(0, 3).map((t) => (
              <Link key={t.id} href={`/roadmap/${t.id}`} className="task">
                <span className={`bx${t.status === "done" ? " done" : ""}`} />
                <span className="task-b">
                  <b style={{ fontSize: 13.5 }}>{t.action.title}</b>
                  <span className="task-m">
                    <span>Due {formatDay(t.dueOn)}</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <hr className="hr" />

          <div className="card card--open" style={{ padding: 13 }}>
            <span className="eyebrow" style={{ color: "var(--p-open)" }}>
              Ledger
            </span>
            <div className="arith" style={{ marginTop: 7 }}>
              <b>{v.ledger.counts.open}</b> of {v.ledger.counts.total} open ·{" "}
              {v.ledger.counts.reach} within reach
            </div>
          </div>
        </>
      }
    >
      <span className="eyebrow">
        {roadmap.totalWeeks} weeks · ~{roadmap.usableHours} usable hours ·{" "}
        {roadmap.constraints.hoursPerWeek} hrs/week
      </span>
      <h1 className="verdict v-xl" style={{ marginTop: 11 }}>
        Your whole plan.
      </h1>
      <p className="lede" style={{ marginTop: 10, marginBottom: 20 }}>
        Every task, every deadline, sequenced around your exam calendar. None of
        it behind payment.
      </p>

      <div className="tl">
        {roadmap.phases.map((phase, i) => {
          if (phase.protectedWindow) {
            const w = phase.protectedWindow;
            return (
              <div className="tl-g block" key={phase.key}>
                <div className="tl-h">
                  <b>{phase.range}</b> · Protected
                </div>
                <div className="exam">
                  {w.label} · nothing scheduled
                  {w.projected ? " · projected window" : ""}
                </div>
                {w.sources[0] ? (
                  <div style={{ marginTop: 8 }}>
                    <SourceTag source={w.sources[0]} />
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <div className={`tl-g${i === 0 ? " now" : ""}`} key={phase.key}>
              <div className="tl-h">
                <b>{phase.range}</b> · {phase.weekRange}
              </div>
              <p className="tl-i">
                <b>{phase.headline}</b> {phase.body}
              </p>
              <div className="rows" style={{ marginTop: 10 }}>
                {phase.tasks.map((t) => (
                  <Link key={t.id} href={`/roadmap/${t.id}`} className="task">
                    <span
                      className={`bx${t.status === "done" ? " done" : ""}`}
                    />
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
            </div>
          );
        })}
      </div>

      <hr className="hr" />

      <p className="tiny">
        <b>{roadmap.tasks.length} items.</b> You&rsquo;ll see three at a time.
        The rest stays here.
      </p>

      {firstOpen ? (
        <Link
          href={`/roadmap/${firstOpen.id}`}
          className="btn btn--g btn--full"
          style={{ marginTop: 16 }}
        >
          Open the next one
        </Link>
      ) : null}

      <p className="tiny mono" style={{ marginTop: 16 }}>
        Generated {formatDate(roadmap.generatedAt)} · {roadmap.version}
      </p>
    </AppShell>
  );
}
