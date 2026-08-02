import Link from "next/link";
import { StateStamp, lpaRange } from "@/components/brand";
import type { Audit } from "@/lib/engine/audit";
import type { ReachSet } from "@/lib/engine/reach";
import type { Ledger } from "@/lib/engine/eligibility";

/**
 * The audit and the reach set.
 *
 * `docs/brand.md` §15 #7: these merge into one tab but keep two URLs, because
 * `/audit` is the shareable artefact and both must stay independently linkable
 * and screenshottable.
 */

const SECTION_TITLE = {
  projects: "Projects",
  evidence: "Evidence",
  document: "The document",
} as const;

export function AuditView({ audit }: { audit: Audit }) {
  if (audit.findings.length === 0) {
    return (
      <>
        <span className="eyebrow">Signal audit</span>
        <h1 className="verdict v-xl" style={{ marginTop: 12 }}>
          Nothing to read yet.
        </h1>
        <p className="lede" style={{ marginTop: 10 }}>
          The audit needs something to look at. Connect GitHub, upload a CV, or
          answer six questions — all three produce the same quality of audit.
        </p>
        <Link
          href="/intake"
          className="btn btn--o btn--full"
          style={{ marginTop: 20 }}
        >
          Show me your profile
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="eyebrow">What a recruiter sees in eleven seconds</span>
      <h1 className="verdict v-xl" style={{ marginTop: 12 }}>
        {audit.verdict}
      </h1>
      <p className="lede" style={{ marginTop: 10 }}>
        Every line has a fix, sized in hours.
      </p>

      {(["projects", "evidence", "document"] as const).map((section) => {
        const findings = audit.bySection[section];
        if (!findings.length) return null;

        return (
          <section key={section}>
            <hr className="hr" />
            <div className="sect">
              <h3>{SECTION_TITLE[section]}</h3>
              <span className="ln" />
              <span className="n">{findings.length}</span>
            </div>
            {findings.map((f) => (
              <div className="hit" key={`${f.slug}-${f.subject}`}>
                <div className="hit-t">
                  <b>{f.subject}</b>
                  <span className="stamp stamp--fix">{f.verdict}</span>
                </div>
                <p className="hit-d">{f.detail}</p>
                {f.fix ? (
                  <p className="fixline">
                    <b>Fix:</b> {f.fix}
                    {f.fixHours > 0 ? (
                      <span className="mono">
                        {" "}
                        · {f.fixHours} {f.fixHours === 1 ? "hour" : "hours"}
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            ))}
          </section>
        );
      })}

      <hr className="hr" />

      <div className="card card--open">
        <span className="eyebrow" style={{ color: "var(--p-open)" }}>
          Where this lands
        </span>
        <p className="verdict v-md" style={{ margin: "8px 0 0" }}>
          {audit.destination}
        </p>
        <p className="tiny" style={{ margin: "9px 0 0", color: "var(--p-ink-2)" }}>
          Roughly{" "}
          <b className="mono">{audit.hoursToDifferentiate} hours</b>, and every
          one of them is a task on your plan.
        </p>
      </div>
    </>
  );
}

const BAND_CLASS = {
  safe: "band--safe",
  stretch: "band--stretch",
  reach: "band--reach",
} as const;

const BAND_COLOUR = {
  safe: "var(--p-open)",
  stretch: "var(--p-fix)",
  reach: "var(--p-accent)",
} as const;

export function ReachView({
  reach,
  ledger,
}: {
  reach: ReachSet;
  ledger: Ledger;
}) {
  const gcc = [...ledger.open, ...ledger.reach].filter(
    (v) => v.company.tier === "gcc" || v.company.tier === "product",
  ).length;

  return (
    <>
      <span className="eyebrow">With the fixable gates closed</span>
      <h1 className="verdict v-xl" style={{ marginTop: 12 }}>
        Your actual range.
      </h1>
      {reach.eligibilityIsNotTheConstraint ? (
        <p className="lede" style={{ marginTop: 10 }}>
          Eligibility isn&rsquo;t your constraint. What you can show is.
        </p>
      ) : null}

      <div className="stack g24" style={{ marginTop: 22 }}>
        {reach.bands.map((band) => (
          <div className={`band ${BAND_CLASS[band.key]}`} key={band.key}>
            <div className="band-h">
              <b style={{ color: BAND_COLOUR[band.key] }}>{band.label}</b>
              <span className="n">{band.verdicts.length}</span>
            </div>
            <p className="band-l">
              {band.verdicts
                .slice(0, 6)
                .map((v) => v.company.name)
                .join(", ")}
              {band.verdicts.length > 6
                ? ` +${band.verdicts.length - 6}`
                : ""}
              .
            </p>
            <p className="band-r">{band.requirement}</p>
          </div>
        ))}
      </div>

      {gcc > 0 ? (
        <>
          <hr className="hr" />
          <div className="card card--accent">
            <span className="eyebrow" style={{ color: "var(--p-accent)" }}>
              Aim higher than feels natural
            </span>
            <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
              Bengaluru hosts <b className="mono">880+</b> global capability
              centres — around a third of India&rsquo;s GCC talent — and they are
              growing fresher hiring while bulk services intake shrinks. They hire
              on what you have built rather than where you studied.{" "}
              <b>
                {gcc} of the companies on your list{" "}
                {gcc === 1 ? "is" : "are"} in that tier.
              </b>
            </p>
            <p className="tiny" style={{ marginTop: 8 }}>
              The catch worth knowing: most of them do not come to campus. The
              route in is the internship programme, which is why it sits on your
              roadmap.
            </p>
          </div>
        </>
      ) : null}

      <hr className="hr" />

      <div className="sect">
        <h3>Every row</h3>
        <span className="ln" />
        <span className="n">{ledger.counts.total}</span>
      </div>
      <div className="rows">
        {[...ledger.open, ...ledger.reach, ...ledger.settled].map((v) => (
          <div className="row" key={v.company.slug}>
            <div className="row-t">
              <b>
                <Link
                  href={`/companies/${v.company.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  {v.company.name}
                </Link>
              </b>
              <StateStamp state={v.state} />
            </div>
            <div className="arith">
              {lpaRange(v.company.packageMinLpa, v.company.packageMaxLpa)} ·{" "}
              {v.company.tier === "gcc"
                ? "GCC"
                : v.company.tier === "services"
                  ? "IT services"
                  : v.company.tier === "core"
                    ? "Core"
                    : "Product"}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
