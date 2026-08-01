import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SourceTag, Wordmark } from "@/components/brand";
import { LedgerBody } from "@/components/ledger-view";
import { COLLEGE_BY_SLUG } from "@/lib/data/colleges";
import { buildLedger } from "@/lib/engine/eligibility";
import { matchProof } from "@/lib/engine/proof";
import { readAnonRecord, readRunSlug } from "@/lib/session";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your ledger",
  description:
    "Which companies are open to you today, which are within reach, and which are settled.",
};

/**
 * `/ledger` — the credibility artefact.
 *
 * Works for an anonymous student (record in a cookie) and for a signed-in one.
 * `docs/platform.md` §5.1 constraint 1: this route has no resume dependency and
 * no auth dependency. Nothing blocks it but the registry.
 */
export default async function LedgerPage() {
  const record = await readAnonRecord();
  if (!record) redirect("/check");

  const user = await getUser();
  const slug = await readRunSlug();

  const ledger = buildLedger(record);
  const proof = matchProof(record, ledger);

  const college = record.collegeSlug
    ? COLLEGE_BY_SLUG.get(record.collegeSlug)
    : undefined;
  const collegeLabel = college
    ? `${college.name} · ${record.branch} · ${record.gradYear}`
    : `${record.branch} · ${record.gradYear}`;

  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Your ledger</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <LedgerBody ledger={ledger} collegeLabel={collegeLabel} />

        <hr className="hr" />

        {/* ── The proof component · §9.2.1. Do not ship the ledger without
            it: every other surface says what is wrong, and belief is a
            multiplier. Three outcomes, because the match has to be real. ── */}
        <ProofCard proof={proof} />

        {!user && (
          <>
            <hr className="hr" />
            <div className="card card--accent">
              <span className="eyebrow" style={{ color: "var(--p-accent)" }}>
                Next
              </span>
              <p className="verdict v-md" style={{ margin: "8px 0 0" }}>
                {ledger.counts.open > 0
                  ? "Eligible isn't hired."
                  : "Eligibility is one half of it."}
              </p>
              <p
                className="tiny"
                style={{ margin: "8px 0 0", color: "var(--p-ink-2)" }}
              >
                Show me your profile and I&rsquo;ll tell you what stands between
                you and an offer.
              </p>
            </div>
          </>
        )}
      </main>

      <div className="foot">
        <Link
          href={slug ? `/r/${slug}` : "/ledger"}
          className="btn btn--g btn--sm"
        >
          Share
        </Link>
        <Link href={user ? "/intake" : "/gate"} className="btn btn--o">
          {user ? "Continue" : "Save my ledger"}
        </Link>
      </div>
    </div>
  );
}

function ProofCard({
  proof,
}: {
  proof: ReturnType<typeof matchProof>;
}) {
  if (proof.kind === "none") {
    // The flow board's screen E3. We only show these when the record really
    // resembles you — a story from a different tier would be worse than none.
    return (
      <div className="card">
        <span className="eyebrow">Someone like you</span>
        <p className="verdict v-md" style={{ margin: "8px 0 0" }}>
          No match yet.
        </p>
        <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
          We only show a record when it genuinely resembles yours — same college
          tier, same CGPA band, same branch family. A story from a different tier
          would be worse than none, because you would know.
        </p>
        <div className="arith" style={{ marginTop: 10 }}>
          <b>{proof.totalRecords}</b> interview records held ·{" "}
          <b>{proof.profiledRecords}</b> carry the detail needed to match
        </div>
        <p className="tiny" style={{ marginTop: 10 }}>
          <Link href="/contribute" style={{ color: "var(--p-accent)" }}>
            Sat an interview? Twenty minutes makes the next person&rsquo;s ledger
            better →
          </Link>
        </p>
      </div>
    );
  }

  if (proof.kind === "process-only") {
    return (
      <div className="card card--open">
        <span className="eyebrow" style={{ color: "var(--p-open)" }}>
          What the process looks like
        </span>
        <p className="verdict v-md" style={{ margin: "8px 0 0" }}>
          {proof.company.name}, round by round.
        </p>
        <div className="arith" style={{ marginTop: 10, lineHeight: 1.9 }}>
          {proof.record.rounds.map((r, i) => (
            <span key={i} style={{ display: "block" }}>
              <b>{i + 1}</b> {r.name}
              {r.minutes ? ` · ${r.minutes} min` : ""}
            </span>
          ))}
        </div>
        <p className="tiny" style={{ marginTop: 10, color: "var(--p-ink-2)" }}>
          {proof.record.takeaway}
        </p>
        <div style={{ marginTop: 10 }}>
          <SourceTag source={proof.record.source} />
        </div>
      </div>
    );
  }

  const near = proof.kind === "near";

  return (
    <Link
      href="/ledger/proof"
      className="card card--open"
      style={{ display: "block", textDecoration: "none" }}
    >
      <span className="eyebrow" style={{ color: "var(--p-open)" }}>
        {near ? "Closest we have" : `Matched on ${proof.matchedOn.join(" · ")}`}
      </span>
      <p className="verdict v-md" style={{ margin: "8px 0 0" }}>
        {proof.record.cgpaBand} CGPA
        {proof.record.backlogNote ? `, ${proof.record.backlogNote}` : ""}. Got
        into {proof.company.name}.
      </p>
      <p
        className="tiny mono"
        style={{ margin: "9px 0 0", color: "var(--p-open)" }}
      >
        Round-by-round →
      </p>
    </Link>
  );
}
