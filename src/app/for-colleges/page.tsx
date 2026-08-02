import type { Metadata } from "next";
import Link from "next/link";
import { DeclinationArc, Wordmark } from "@/components/brand";
import { COMPANIES } from "@/lib/data/companies";

export const metadata: Metadata = {
  title: "For placement cells",
  description:
    "A cohort diagnostic: how many of your students are ineligible for your top recruiters, and which are closest to the threshold.",
};

/**
 * `/for-colleges` — TPO landing. One CTA: request the cohort diagnostic.
 *
 * `docs/product.md` §7 is precise about what may be sold here. We have no
 * efficacy evidence and will not have any for a full placement cycle, so the
 * pitch is the **diagnostic**, not the outcome: "42% of your final-year
 * students are ineligible for your top three recruiters — 18 on CGPA, 31 on
 * active backlogs, here are the 30 closest to threshold." That requires zero
 * efficacy evidence. It is simply true, actionable this semester, and no TPO
 * currently has it.
 *
 * This is also the surface where §12 permits atmosphere to do the most work.
 */
export default function ForCollegesPage() {
  return (
    <div className="shell graticule horizon">
      <DeclinationArc />

      <header className="top" style={{ background: "transparent", borderBottom: 0 }}>
        <Wordmark href="/" eyebrow="For placement cells" />
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 24, paddingBottom: 40 }}>
        <h1 className="verdict v-xl">Fixed points. Honest arithmetic.</h1>
        <p className="lede" style={{ marginTop: 12, maxWidth: "58ch" }}>
          We can tell you, this semester, how much of your cohort is already
          ineligible for the recruiters you count on — and which students are
          closest to the threshold.
        </p>

        <hr className="hr" />

        <div className="sect">
          <h3>The cohort diagnostic</h3>
          <span className="ln" />
        </div>

        <div className="rows">
          <div className="row">
            <div className="row-t">
              <b>Eligibility, company by company</b>
            </div>
            <div className="arith">
              Every student checked against {COMPANIES.length} published
              criteria. Fixable separated from settled.
            </div>
          </div>
          <div className="row">
            <div className="row-t">
              <b>The students nearest the line</b>
            </div>
            <div className="arith">
              Ranked by how little movement opens a door. This is where a
              semester of intervention pays.
            </div>
          </div>
          <div className="row">
            <div className="row-t">
              <b>Readiness by recruiter</b>
            </div>
            <div className="arith">
              Where the cohort sits against what each recruiter actually asks
              for.
            </div>
          </div>
        </div>

        <div className="card card--accent" style={{ marginTop: 22 }}>
          <span className="eyebrow" style={{ color: "var(--p-accent)" }}>
            What we are not claiming
          </span>
          <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
            We have not run a cohort through a full placement season, so we have
            no placement-rate claim to make and will not make one. The diagnostic
            does not depend on having one: it is arithmetic over published
            criteria and your students&rsquo; own records.
          </p>
        </div>

        <div className="card card--open" style={{ marginTop: 14 }}>
          <span className="eyebrow" style={{ color: "var(--p-open)" }}>
            Where it helps most
          </span>
          <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
            Pre-final years. Eligibility repair only works while semesters
            remain — a CGPA floor and an active backlog are both fixable in the
            third year and effectively locked by the October of the fourth. We
            can move next year&rsquo;s number, and the work starts now.
          </p>
        </div>

        <hr className="hr" />

        <p className="lede">
          Email <b>colleges@polaris.in</b> with your college and cohort size.
        </p>

        <Link href="/check" className="btn btn--g btn--full" style={{ marginTop: 16 }}>
          See what a student sees
        </Link>
      </main>
    </div>
  );
}
