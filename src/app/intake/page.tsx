import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { readAnonRecord } from "@/lib/session";

export const metadata: Metadata = { title: "How should I read your profile?" };

/**
 * `/intake` — four routes, all first-class (`docs/platform.md` §3.4).
 *
 * §10.4 calls the no-CV path mandatory: most of a workshop room has no resume
 * to hand, and that is the single largest drop-off in the funnel. So GitHub and
 * the six questions are not fallbacks, they are peers — and GitHub is marked
 * best because repos, languages, commit history and README text are better
 * audit input than any third-year's LinkedIn.
 */
export default async function IntakePage() {
  const record = await readAnonRecord();
  if (!record) redirect("/check");

  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Signal audit</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <h1 className="verdict v-lg">How should I read your profile?</h1>
        <p className="lede" style={{ marginTop: 10, marginBottom: 20 }}>
          Whichever is easiest. Same quality of audit either way.
        </p>

        <div className="stack g10">
          <Link href="/connections" className="route">
            <span className="ic">GH</span>
            <span className="tx">
              <b>Connect GitHub</b>
              <span>Repos, languages, commits, READMEs</span>
            </span>
            <span className="stamp stamp--open">Best</span>
          </Link>
          <Link href="/intake/six" className="route">
            <span className="ic">6</span>
            <span className="tx">
              <b>Answer 6 questions</b>
              <span>No file · about two minutes</span>
            </span>
          </Link>
          <Link href="/intake/upload" className="route">
            <span className="ic">PDF</span>
            <span className="tx">
              <b>Upload your CV</b>
              <span>PDF or DOCX · the original is kept</span>
            </span>
          </Link>
          <Link href="/intake/linkedin" className="route">
            <span className="ic">in</span>
            <span className="tx">
              <b>Import from LinkedIn</b>
              <span>Three taps in the app</span>
            </span>
          </Link>
        </div>

        <div className="card card--open" style={{ marginTop: 20 }}>
          <p className="tiny" style={{ margin: 0, color: "var(--p-ink-2)" }}>
            <b>No resume on your phone?</b> Take the six questions. Often sharper,
            because we ask what a CV leaves out.
          </p>
        </div>
      </main>
    </div>
  );
}
