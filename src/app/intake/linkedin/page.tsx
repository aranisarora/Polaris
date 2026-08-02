import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Import from LinkedIn" };

/**
 * `docs/product.md` §10.5, recorded so it is not re-proposed: LinkedIn has no
 * usable API for this. Sign In with LinkedIn grants only the lite profile;
 * Member Data Portability is EEA-only; scraping is litigated. And it would not
 * help anyway — a third-year's LinkedIn is a headline and three endorsed
 * skills, while the audit needs projects and commit history.
 *
 * So the student experiences a LinkedIn import, nothing is built, and nothing
 * can be switched off underneath us: LinkedIn's own Save to PDF export, read by
 * the same parser as any other CV.
 */
export default function LinkedInIntake() {
  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">LinkedIn</span>
      </header>
      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <h1 className="verdict v-lg">Three taps in the LinkedIn app.</h1>
        <p className="lede" style={{ marginTop: 10, marginBottom: 22 }}>
          LinkedIn exports your profile as a PDF. Our parser reads it.
        </p>

        <ol className="numlist">
          <li><p>Open your <b>profile</b> in the app.</p></li>
          <li><p>Tap <b>More</b> under your headline.</p></li>
          <li><p>Tap <b>Save to PDF</b>.</p></li>
        </ol>

        <hr className="hr" />

        <div className="card card--open">
          <span className="eyebrow" style={{ color: "var(--p-open)" }}>Quicker</span>
          <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
            Got GitHub? One tap, and far more to work with — most third-year
            LinkedIn profiles are a headline and a few endorsed skills.
          </p>
        </div>
      </main>
      <div className="foot">
        <Link href="/intake" className="btn btn--g btn--sm">Back</Link>
        <Link href="/intake/upload" className="btn btn--p">Upload the PDF</Link>
      </div>
    </div>
  );
}
