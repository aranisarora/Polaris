import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { COMPANIES } from "@/lib/data/companies";
import { PROFILED_RECORD_COUNT, TOTAL_RECORD_COUNT } from "@/lib/data/corpus";
import { submitRecord } from "./actions";

export const metadata: Metadata = { title: "Add an interview record" };

/**
 * `/contribute` — how the profiled half of the corpus actually gets built.
 *
 * The public corpus does not carry CGPA, college tier or backlogs: the
 * GeeksforGeeks template asks for them and authors skip them. That is the exact
 * layer `docs/product.md` §9.2.1's proof record needs, so it has to come from
 * students directly.
 *
 * §8 Hard Rule 3 governs the framing: never ask for data as a favour, capture
 * it as a byproduct of something the student already wants. What a student
 * wants here is for the next person in their position to get the record they
 * did not — and §16 Q4 notes rejections are worth *more* than selections,
 * because they are the ones survivorship bias eats.
 */
export default function ContributePage() {
  return (
    <form action={submitRecord} className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Add a record</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <span className="eyebrow">
          {TOTAL_RECORD_COUNT} records held · {PROFILED_RECORD_COUNT} detailed
          enough to match
        </span>
        <h1 className="verdict v-lg" style={{ marginTop: 11 }}>
          Rejections help most.
        </h1>
        <p className="lede" style={{ marginTop: 10, marginBottom: 20 }}>
          Students who got offers write these up. Students who did not go quiet —
          which is why every corpus like this quietly teaches that everyone who
          tries succeeds. Yours is worth more than a selection.
        </p>

        <div className="stack g18">
          <label className="field">
            <span>Company</span>
            <select name="company" className="inp" defaultValue="">
              <option value="">Pick one</option>
              {COMPANIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                  {c.programme ? ` — ${c.programme}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="grid2">
            <label className="field">
              <span>Your CGPA then</span>
              <input
                name="cgpa"
                className="inp num"
                inputMode="decimal"
                placeholder="6.2"
              />
            </label>
            <label className="field">
              <span>Active backlogs then</span>
              <input
                name="backlogs"
                className="inp num"
                inputMode="numeric"
                placeholder="0"
              />
            </label>
          </div>

          <label className="field">
            <span>Outcome</span>
            <select name="outcome" className="inp" defaultValue="rejected">
              <option value="rejected">Rejected</option>
              <option value="selected">Selected</option>
            </select>
          </label>

          <label className="field">
            <span>Which round did it end at?</span>
            <input
              name="endedAt"
              className="inp"
              placeholder="Technical interview"
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>What actually happened</span>
            <textarea
              name="rounds"
              className="inp"
              style={{ minHeight: 140 }}
              placeholder="Round by round. What was asked, how long, what you got wrong."
            />
          </label>
        </div>

        <div className="card card--open" style={{ marginTop: 20 }}>
          <p className="tiny" style={{ margin: 0, color: "var(--p-ink-2)" }}>
            Nothing here is published with your name on it. Records are matched
            on college tier, CGPA band and branch — never on you.
          </p>
        </div>
      </main>

      <div className="foot">
        <Link href="/ledger" className="btn btn--g btn--sm">
          Back
        </Link>
        <button type="submit" className="btn btn--o">
          Add it
        </button>
      </div>
    </form>
  );
}
