import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "The ledger, the audit and the whole roadmap are free. What you pay for is the loop that keeps it happening.",
};

/**
 * `/pricing` — the freemium line, stated plainly (`docs/product.md` §7).
 *
 * The load-bearing decision this page has to carry: **gate the mechanism, not
 * the content.** Showing the whole plan costs nothing, is the most persuasive
 * artefact we own, and is screenshot-shareable. What students will pay for is
 * the thing that stops them abandoning it, because every one of them has
 * abandoned a plan before.
 */

const FREE = [
  "The eligibility ledger, every company",
  "Fixable separated from settled, with the arithmetic",
  "The signal audit",
  "Safe / stretch / reach",
  "The whole roadmap — every task, every deadline",
];

const PAID = [
  "The weekly check-in, and the re-planning that follows it",
  "GitHub and LeetCode verification",
  "The auto-updating CV, and export",
  "Records from people like you, per company",
  "The placement season tracker",
];

export default function PricingPage() {
  return (
    <div className="shell graticule horizon">
      <header className="top" style={{ background: "transparent", borderBottom: 0 }}>
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Pricing</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 32 }}>
        <span className="eyebrow">One payment · no subscription</span>
        <h1 className="verdict v-xl" style={{ marginTop: 11 }}>
          ₹1,499 for twelve months.
        </h1>
        <p className="lede" style={{ marginTop: 10 }}>
          This year&rsquo;s internships and next year&rsquo;s placement season.
          Charged once, and we ask again next August rather than every month.
        </p>

        <hr className="hr" />

        <div className="sect sect--open">
          <h3>Free forever</h3>
          <span className="ln" />
          <span className="n">{FREE.length}</span>
        </div>
        <div className="rows">
          {FREE.map((item) => (
            <div className="task" key={item}>
              <span className="bx done" />
              <span className="task-b">
                <b>{item}</b>
              </span>
            </div>
          ))}
        </div>

        <hr className="hr" />

        <div className="sect sect--fix">
          <h3>What ₹1,499 keeps</h3>
          <span className="ln" />
          <span className="n">{PAID.length}</span>
        </div>
        <div className="rows">
          {PAID.map((item) => (
            <div className="task" key={item}>
              <span className="bx" />
              <span className="task-b">
                <b>{item}</b>
              </span>
            </div>
          ))}
        </div>

        <div className="card card--open" style={{ marginTop: 22 }}>
          <p className="verdict v-md" style={{ margin: 0 }}>
            Your plan stays yours.
          </p>
          <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
            The first four weeks are free and nothing is hidden in them. When
            they end, the plan does not disappear — every task and every deadline
            stays visible. What stops is the accountability, which is the part
            that is actually hard to do alone.
          </p>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <span className="eyebrow">Why you are the one paying</span>
          <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
            No affiliate links, ever. Nothing in your roadmap is there because a
            course platform paid for it — which stays true precisely because the
            money comes from you rather than from them.
          </p>
        </div>

        <p className="tiny mono" style={{ marginTop: 18 }}>
          Full refund within 14 days. Payment is not wired up yet — the loop is
          free for everyone until it is.
        </p>

        <Link href="/check" className="btn btn--o btn--full" style={{ marginTop: 20 }}>
          Start with the free part
        </Link>
      </main>
    </div>
  );
}
