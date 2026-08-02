import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark, formatDate } from "@/components/brand";
import { COMPANIES, REGISTRY_UPDATED_ON } from "@/lib/data/companies";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  const contested = COMPANIES.filter((c) => c.confidence === "contested").length;

  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Terms</span>
      </header>

      <main
        className="wrap legal"
        style={{ flex: 1, paddingTop: 20, paddingBottom: 32 }}
      >
        <h1 className="verdict v-lg">The deal, plainly.</h1>

        <h4>What Polaris is</h4>
        <p>
          A tool that checks your record against published recruiter criteria and
          builds a plan around your academic calendar. It is not a placement
          agency, it does not apply on your behalf, and it cannot get you a job.
        </p>

        <h4>About the numbers</h4>
        <p>
          Every cutoff comes from a published source, carries the date a human
          last checked it, and is graded — verified, reported, or contested.
          Right now {contested} of the {COMPANIES.length} companies in the
          registry are contested, meaning credible sources disagree, and each of
          those says so on its own page with the disagreement spelled out.
        </p>
        <p>
          Criteria change per drive and per batch, and a company can apply a
          stricter bar than it publishes. Verify against the notice for your
          batch before you rely on it. If we are wrong about a cutoff, tell us
          and we will correct it and date the correction.
        </p>

        <h4>About the plan</h4>
        <p>
          Deadlines derive from your university calendar. Where that calendar is
          not published yet, the window is projected from the term pattern and
          labelled as projected. Do not miss a registration because we estimated
          a date — check the official notice.
        </p>

        <h4>What is free, and what is not</h4>
        <p>
          The ledger, the audit, the reachability set and the whole roadmap are
          free and stay free. What is paid is the loop: the weekly check-in,
          verification, re-planning and the auto-updating CV. Your plan stays
          visible either way.
        </p>

        <h4>No affiliate money</h4>
        <p>
          We take no commission from any course platform, bootcamp or employer,
          and never will. Nothing in your roadmap is there because someone paid
          for it — which stays true because you are the one paying.
        </p>

        <h4>Your account</h4>
        <p>
          You can export or delete everything from{" "}
          <Link href="/settings" style={{ color: "var(--p-accent)" }}>
            Settings
          </Link>{" "}
          at any time. We may suspend an account that abuses the service.
        </p>

        <hr className="hr" />
        <p className="tiny mono">
          Updated {formatDate(REGISTRY_UPDATED_ON)} ·{" "}
          <Link href="/privacy" style={{ color: "var(--p-accent)" }}>
            Privacy
          </Link>
        </p>
      </main>
    </div>
  );
}
