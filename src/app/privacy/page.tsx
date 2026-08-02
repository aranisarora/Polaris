import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark, formatDate } from "@/components/brand";
import { REGISTRY_UPDATED_ON } from "@/lib/data/companies";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Polaris holds, why, and how to take it out or delete it. Written to be read.",
};

/**
 * `/privacy` — Phase 0, and `docs/platform.md` §4.1 calls it not optional:
 * the DPDP Act 2023 applies from the first student record and a college
 * contract is ahead.
 *
 * Written in the product's own voice rather than in legalese. The flow board
 * settled the framing: "Written to be read."
 */
export default function PrivacyPage() {
  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Privacy</span>
      </header>

      <main
        className="wrap legal"
        style={{ flex: 1, paddingTop: 20, paddingBottom: 32 }}
      >
        <h1 className="verdict v-lg">What we hold, and why.</h1>
        <p className="lede" style={{ marginTop: 10 }}>
          Written to be read. This is the operative version, not a summary of
          one held elsewhere.
        </p>

        <h4>What we collect</h4>
        <p>
          College, branch, graduation year, CGPA, active backlogs, and your 10th
          and 12th percentages. Eligibility is arithmetic and it needs all seven.
          Then whatever you give us for the audit — projects, a CV, a GitHub
          handle — and your check-ins as you go.
        </p>

        <h4>Before you have an account</h4>
        <p>
          The seven fields live in a cookie on your device. If you never sign in,
          that cookie is the only place they exist, and clearing it removes them.
          If you share your ledger, the counts are stored so the link resolves —
          see below for exactly what a shared link shows.
        </p>

        <h4>What a shared link shows</h4>
        <p>
          Branch, graduation year, university, city, and the counts. Never your
          name, never your CGPA, never your percentages, and never which
          companies. The redaction is enforced in the database rather than in the
          page, so a mistake in our code cannot widen it.
        </p>

        <h4>Why we keep your original files</h4>
        <p>
          If we stored only our parsed version and the parser had a bug, your
          data would be gone. Keeping the original means we can always re-read
          it. It is deleted when you delete your account, like everything else.
        </p>

        <h4>What we never do</h4>
        <p>
          We do not sell your data, share it with employers, or take affiliate
          money from course platforms. That last one is a product decision before
          it is a privacy one: the moment the roadmap recommends a course we are
          paid to recommend, the recommendation engine is corrupted — and the
          recommendation engine is the product.
        </p>

        <h4>Your college</h4>
        <p>
          Partner colleges see cohort patterns — how many students sit near a
          CGPA threshold, for instance. Not your individual record, unless you
          turn that on.
        </p>

        <h4>Your rights under the DPDP Act 2023</h4>
        <p>
          See everything we hold, correct it, download it, delete it. Deletion
          completes within 30 days including backups. All of it is in{" "}
          <Link href="/settings" style={{ color: "var(--p-accent)" }}>
            Settings
          </Link>{" "}
          — no email to write, no retention offer in the way.
        </p>

        <h4>Contact</h4>
        <p>privacy@polaris.in · we reply within 7 days.</p>

        <hr className="hr" />
        <p className="tiny mono">
          Updated {formatDate(REGISTRY_UPDATED_ON)} ·{" "}
          <Link href="/terms" style={{ color: "var(--p-accent)" }}>
            Terms
          </Link>
        </p>
      </main>
    </div>
  );
}
