import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceTag, Wordmark, formatDate, lpaRange } from "@/components/brand";
import { COMPANIES, getCompany } from "@/lib/data/companies";
import { recordsForCompany } from "@/lib/data/corpus";
import type { Confidence } from "@/lib/data/types";

/**
 * `/companies/[slug]` — "TCS NQT eligibility 2027".
 *
 * `docs/platform.md` §4.1: close to free. The registry is being curated
 * regardless, these are the queries free eligibility checkers already rank for,
 * and each page ends in "check your own eligibility". It converts search intent
 * directly into the funnel.
 *
 * It is also where the registry's honesty is on display. Where sources
 * disagree, the disagreement is printed in full rather than resolved silently —
 * a student who catches us hiding a contradiction stops trusting the other
 * twenty-two rows.
 */

export const revalidate = 86400;

export function generateStaticParams() {
  return COMPANIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const company = getCompany(slug);
  if (!company) return { title: "Not found" };

  const title = `${company.name} eligibility criteria ${company.batchYear}`;
  return {
    title,
    description: `Published cutoffs for ${company.name}${company.programme ? ` ${company.programme}` : ""}: 10th, 12th, graduation, backlogs and gap. Sourced and dated.`,
    openGraph: { title },
  };
}

const CONFIDENCE_COPY: Record<Confidence, { label: string; body: string }> = {
  verified: {
    label: "Verified",
    body: "Stated on the company's own careers page or an official drive notice.",
  },
  reported: {
    label: "Reported",
    body: "Consistent across independent placement-prep sources. Not published by the company directly.",
  },
  contested: {
    label: "Sources disagree",
    body: "Different sources publish different numbers. What follows is the disagreement, and which reading we apply.",
  },
};

export default async function CompanyPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const company = getCompany(slug);
  if (!company) notFound();

  const c = company.criteria;
  const records = recordsForCompany(company.slug);
  const conf = CONFIDENCE_COPY[company.confidence];

  const gates: { label: string; value: string }[] = [];
  if (c.tenthPct !== undefined)
    gates.push({ label: "10th", value: `${c.tenthPct.toFixed(1)}%` });
  if (c.twelfthPct !== undefined)
    gates.push({ label: "12th", value: `${c.twelfthPct.toFixed(1)}%` });
  if (c.ugPct !== undefined)
    gates.push({ label: "Graduation", value: `${c.ugPct.toFixed(1)}%` });
  if (c.ugCgpa !== undefined)
    gates.push({ label: "CGPA", value: c.ugCgpa.toFixed(2) });
  if (c.maxActiveBacklogs !== undefined)
    gates.push({
      label: "Active backlogs",
      value:
        c.maxActiveBacklogs === 0 ? "None permitted" : `Max ${c.maxActiveBacklogs}`,
    });
  if (c.backlogsClearedByJoining)
    gates.push({ label: "By joining", value: "All cleared" });
  if (c.maxGapYears !== undefined)
    gates.push({
      label: "Education gap",
      value: `Max ${c.maxGapYears} ${c.maxGapYears === 1 ? "year" : "years"}`,
    });

  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Registry</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 32 }}>
        <span className="eyebrow">
          {company.tier === "gcc"
            ? "Global capability centre"
            : company.tier === "services"
              ? "IT services"
              : company.tier === "core"
                ? "Core / embedded"
                : "Product"}{" "}
          · {lpaRange(company.packageMinLpa, company.packageMaxLpa)}
        </span>
        <h1 className="verdict v-xl" style={{ marginTop: 11 }}>
          {company.name}
          {company.programme ? ` ${company.programme}` : ""}
        </h1>
        <p className="lede" style={{ marginTop: 10 }}>
          Published eligibility for the {company.batchYear} batch.
        </p>

        <hr className="hr" />

        <div className="sect">
          <h3>The gates</h3>
          <span className="ln" />
          <span className="n">{gates.length}</span>
        </div>

        {gates.length ? (
          <div className="rows">
            {gates.map((g) => (
              <div className="row" key={g.label}>
                <div className="row-t">
                  <b>{g.label}</b>
                  <span className="mono" style={{ fontSize: 15, fontWeight: 500 }}>
                    {g.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="tiny">
            No academic gate is published for this company. That is a fact about
            the criteria, not an omission in our data — see the note below.
          </p>
        )}

        {/* Provenance. §8.3 made into a whole section, because this is the
            page where a doubtful student comes to check us. */}
        <div
          className={
            company.confidence === "contested" ? "card card--fix" : "card"
          }
          style={{ marginTop: 20 }}
        >
          <span
            className="eyebrow"
            style={{
              color:
                company.confidence === "contested"
                  ? "var(--p-fix)"
                  : "var(--p-muted)",
            }}
          >
            {conf.label}
          </span>
          <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
            {conf.body}
          </p>
          {company.contestedNote ? (
            <p
              className="tiny"
              style={{ marginTop: 10, color: "var(--p-ink-2)" }}
            >
              {company.contestedNote}
            </p>
          ) : null}
          {company.notes ? (
            <p
              className="tiny"
              style={{ marginTop: 10, color: "var(--p-ink-2)" }}
            >
              {company.notes}
            </p>
          ) : null}

          <div
            className="stack g6"
            style={{ marginTop: 12, alignItems: "flex-start" }}
          >
            {company.sources.map((s) => (
              <SourceTag key={s.url} source={s} suffix={formatDate(s.checkedOn)} />
            ))}
          </div>
        </div>

        <hr className="hr" />

        <div className="sect">
          <h3>The process</h3>
          <span className="ln" />
          <span className="n">{company.process.length}</span>
        </div>
        <ol className="numlist">
          {company.process.map((stage) => (
            <li key={stage.name}>
              <p style={{ margin: 0 }}>
                <b>{stage.name}</b>
                {stage.minutes ? (
                  <span className="mono" style={{ color: "var(--p-muted)" }}>
                    {" "}
                    · {stage.minutes} min
                  </span>
                ) : null}
                {stage.topics?.length ? (
                  <span
                    className="tiny"
                    style={{ display: "block", marginTop: 3 }}
                  >
                    {stage.topics.join(" · ")}
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ol>

        {records.length > 0 && (
          <>
            <hr className="hr" />
            <div className="sect">
              <h3>What people reported</h3>
              <span className="ln" />
              <span className="n">{records.length}</span>
            </div>
            <div className="rows">
              {records.map((r) => (
                <div className="row" key={r.id}>
                  <div className="row-t">
                    <b>
                      {r.role}
                      {r.year ? (
                        <span className="row-sub"> · {r.year}</span>
                      ) : null}
                    </b>
                    <span
                      className={`stamp ${r.outcome === "selected" ? "stamp--open" : "stamp--settled"}`}
                    >
                      {r.outcome === "selected" ? "Selected" : "Rejected"}
                    </span>
                  </div>
                  <p className="hit-d">{r.takeaway}</p>
                  <div style={{ marginTop: 8 }}>
                    <SourceTag source={r.source} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <hr className="hr" />

        <div className="card card--accent">
          <p className="verdict v-md" style={{ margin: 0 }}>
            Are you eligible for this one?
          </p>
          <p className="tiny" style={{ margin: "8px 0 14px", color: "var(--p-ink-2)" }}>
            Seven questions, forty-five seconds, and you get every company at
            once rather than this one.
          </p>
          <Link href="/check" className="btn btn--o btn--full">
            Check my eligibility
          </Link>
        </div>

        <p className="tiny mono" style={{ marginTop: 18 }}>
          Criteria change per drive and per batch. Verify against the notice for
          your batch before you rely on it.
        </p>
      </main>
    </div>
  );
}
