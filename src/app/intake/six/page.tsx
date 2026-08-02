import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { getUser } from "@/lib/supabase/server";
import { submitSix } from "./actions";

export const metadata: Metadata = { title: "Six questions" };

/**
 * The no-CV path, which `docs/product.md` §10.4 calls mandatory: most of a
 * workshop room has no resume to hand, and that is the single largest drop-off
 * in the funnel.
 */
export default async function SixQuestions() {
  const user = await getUser();
  if (!user) redirect("/gate");

  return (
    <form action={submitSix} className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Six questions</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <h1 className="verdict v-lg">What have you built?</h1>
        <p className="lede" style={{ marginTop: 10, marginBottom: 20 }}>
          Coursework counts. Half-finished counts. Rough notes are fine.
        </p>

        <div className="stack g24">
          {[1, 2, 3].map((n) => (
            <div key={n} className="stack g10">
              <label className="field">
                <span>Project {n}</span>
                <input
                  name={`project${n}Title`}
                  className="inp"
                  placeholder={n === 1 ? "Food delivery app" : "Name it"}
                  autoComplete="off"
                />
              </label>
              <textarea
                name={`project${n}Blurb`}
                className="inp"
                placeholder="Say what it does, and how you built it"
              />
              <input
                name={`project${n}Url`}
                className="inp"
                inputMode="url"
                placeholder="Live URL, if there is one"
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        <div className="card card--open" style={{ marginTop: 20 }}>
          <p className="tiny" style={{ margin: 0, color: "var(--p-ink-2)" }}>
            Do not polish these. Unedited gives us a truer read than a rewritten
            CV.
          </p>
        </div>

        <hr className="hr" />

        <h2 className="verdict v-md">Where does your practice time go?</h2>
        <p className="lede" style={{ marginTop: 8, marginBottom: 18 }}>
          Honest answers make the plan fit. Nobody else sees this.
        </p>

        <div className="stack g18">
          <label className="field">
            <span>LeetCode username (optional)</span>
            <input
              name="leetcode"
              className="inp"
              autoComplete="off"
              placeholder="your-handle"
            />
          </label>
          <div className="grid2">
            <label className="field">
              <span>Solved</span>
              <input
                name="leetcodeSolved"
                className="inp num"
                inputMode="numeric"
                placeholder="0"
              />
            </label>
            <label className="field">
              <span>Of those, easy</span>
              <input
                name="leetcodeEasy"
                className="inp num"
                inputMode="numeric"
                placeholder="0"
              />
            </label>
          </div>
          <label className="field">
            <span>Of those, medium</span>
            <input
              name="leetcodeMedium"
              className="inp num"
              inputMode="numeric"
              placeholder="0"
            />
          </label>
        </div>
      </main>

      <div className="foot">
        <Link href="/intake" className="btn btn--g btn--sm">
          Back
        </Link>
        <button type="submit" className="btn btn--o">
          Finish
        </button>
      </div>
    </form>
  );
}
