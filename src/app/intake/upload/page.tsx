import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Upload your CV" };

/**
 * CV upload.
 *
 * The parser is not built. `docs/product.md` §13.3 puts intake in weeks 2–3,
 * *after* the ledger, and building a PDF parser before a student has seen the
 * ledger is exactly the ordering §13.1 warns against.
 *
 * What matters is that the screen says so and routes to a path that works
 * today, rather than accepting a file into a void.
 */
export default function UploadIntake() {
  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Upload</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <h1 className="verdict v-lg">Not reading files yet.</h1>
        <p className="lede" style={{ marginTop: 10 }}>
          CV parsing is the next thing being built. Until it lands the six
          questions produce a better audit anyway — they ask what a CV leaves
          out, and nothing is lost in a parse.
        </p>

        <div className="card card--open" style={{ marginTop: 20 }}>
          <span className="eyebrow" style={{ color: "var(--p-open)" }}>
            Why we will keep the file
          </span>
          <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
            When it does land, the original is stored permanently alongside
            whatever we parse out of it. If the parser has a bug, your data is
            still there to re-read.
          </p>
        </div>
      </main>

      <div className="foot">
        <Link href="/intake" className="btn btn--g btn--sm">
          Back
        </Link>
        <Link href="/intake/six" className="btn btn--o">
          Answer six questions
        </Link>
      </div>
    </div>
  );
}
