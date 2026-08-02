import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SourceTag, Wordmark } from "@/components/brand";
import { buildLedger } from "@/lib/engine/eligibility";
import { matchProof } from "@/lib/engine/proof";
import { readAnonRecord } from "@/lib/session";

export const metadata: Metadata = { title: "Someone like you" };

/**
 * The proof record in full — `docs/product.md` §9.2.1.
 *
 * The question this screen answers is the one the student is actually asking:
 * *can someone like me get in, and how did they do it?*
 */
export default async function ProofPage() {
  const record = await readAnonRecord();
  if (!record) redirect("/check");

  const ledger = buildLedger(record);
  const proof = matchProof(record, ledger);

  if (proof.kind === "none") redirect("/ledger");

  const rec = proof.record;

  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Proof record</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <span
          className="eyebrow"
          style={{
            color: proof.kind === "exact" ? "var(--p-open)" : "var(--p-muted)",
          }}
        >
          {proof.kind === "exact"
            ? `Matched on ${proof.matchedOn.join(" · ")}`
            : proof.kind === "near"
              ? "Closest we have"
              : "What the process looks like"}
        </span>

        <h1 className="verdict v-lg" style={{ marginTop: 11 }}>
          {proof.kind === "process-only"
            ? `${proof.company.name}, round by round.`
            : "They started behind where you are."}
        </h1>

        {proof.kind === "near" ? (
          <p className="lede" style={{ marginTop: 10 }}>
            Not an exact match, and we would rather say so than pretend. Here is
            what lines up and what does not.
          </p>
        ) : null}

        <div className="card card--open" style={{ marginTop: 18 }}>
          <div className="arith" style={{ marginTop: 0, lineHeight: 1.9 }}>
            <b>Company</b>&nbsp;&nbsp;{proof.company.name}
            <br />
            <b>Role</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{rec.role}
            {rec.year ? ` · ${rec.year}` : ""}
            <br />
            <b>Route</b>&nbsp;&nbsp;&nbsp;&nbsp;{rec.campusType}
            {rec.cgpaBand ? (
              <>
                <br />
                <b>CGPA</b>&nbsp;&nbsp;&nbsp;&nbsp;
                <span className="ok">{rec.cgpaBand}</span> at application
              </>
            ) : null}
            {rec.backlogNote ? (
              <>
                <br />
                <b>Backlogs</b>&nbsp;{rec.backlogNote}
              </>
            ) : null}
            <br />
            <b>Outcome</b>&nbsp;
            <span className={rec.outcome === "selected" ? "ok" : "bad"}>
              {rec.outcome === "selected" ? "Selected" : "Rejected"}
            </span>
          </div>
        </div>

        {proof.kind === "near" && proof.differsOn.length ? (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="arith" style={{ marginTop: 0, lineHeight: 1.8 }}>
              <b>Matches</b>&nbsp;&nbsp;{proof.matchedOn.join(", ") || "—"}
              <br />
              <b>Differs</b>&nbsp;&nbsp;&nbsp;{proof.differsOn.join(", ")}
            </div>
          </div>
        ) : null}

        <hr className="hr" />

        <div className="sect">
          <h3>Round by round</h3>
          <span className="ln" />
          <span className="n">{rec.rounds.length}</span>
        </div>
        <ol className="numlist">
          {rec.rounds.map((r, i) => (
            <li key={i}>
              <p style={{ margin: 0 }}>
                <b>{r.name}</b>
                {r.minutes ? (
                  <span className="mono" style={{ color: "var(--p-muted)" }}>
                    {" "}
                    · {r.minutes} min
                  </span>
                ) : null}
                {r.topics?.length ? (
                  <span className="tiny" style={{ display: "block", marginTop: 3 }}>
                    {r.topics.join(" · ")}
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ol>

        <div className="card card--accent" style={{ marginTop: 20 }}>
          <span className="eyebrow" style={{ color: "var(--p-accent)" }}>
            What they credited
          </span>
          <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
            {rec.takeaway}
          </p>
        </div>

        <div style={{ marginTop: 16 }}>
          <SourceTag source={rec.source} />
        </div>

        {!rec.hasProfile ? (
          <p className="tiny" style={{ marginTop: 14 }}>
            This record gives the process but not the person&rsquo;s marks — the
            author did not state them, which is true of most of the public
            corpus.{" "}
            <Link href="/contribute" style={{ color: "var(--p-accent)" }}>
              Adding yours fixes that for the next student →
            </Link>
          </p>
        ) : null}
      </main>

      <div className="foot">
        <Link href="/ledger" className="btn btn--g btn--sm">
          Back
        </Link>
        <Link href="/gate" className="btn btn--o">
          Save my ledger
        </Link>
      </div>
    </div>
  );
}
