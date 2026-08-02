import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { AppShell } from "@/components/app-shell";
import { formatDate } from "@/components/brand";
import { COLLEGE_BY_SLUG } from "@/lib/data/colleges";
import { loadViewer } from "@/lib/viewer";
import { deleteEverything, exportEverything } from "./actions";

export const metadata: Metadata = { title: "Settings" };

/**
 * `/settings` — account, data export, deletion.
 *
 * `docs/platform.md` §4.1 puts this in Phase 0 and calls it not optional: the
 * DPDP Act 2023 applies from the first student record, and a college contract
 * is ahead. Export and deletion live here, in Settings, with no email to write
 * and no retention offer in the way.
 */
export default async function SettingsPage() {
  const v = await loadViewer();
  if (!v) redirect("/check");

  const college = v.record.collegeSlug
    ? COLLEGE_BY_SLUG.get(v.record.collegeSlug)
    : undefined;

  return (
    <AppShell active="signal" title="Settings">
      <h1 className="verdict v-lg">Your account</h1>

      <hr className="hr" />

      <div className="sect">
        <h3>Your record</h3>
        <span className="ln" />
      </div>
      <div className="rows">
        <div className="row">
          <div className="row-t">
            <b>{college?.name ?? "College not listed"}</b>
            <Link href="/check" className="stamp stamp--accent">
              Edit
            </Link>
          </div>
          <div className="arith">
            {v.record.branch} · graduating {v.record.gradYear}
          </div>
        </div>
        <div className="row">
          <div className="row-t">
            <b>
              CGPA {v.record.cgpa.toFixed(2)} · {v.record.activeBacklogs} active
              backlogs
            </b>
            <Link href="/check" className="stamp stamp--accent">
              Edit
            </Link>
          </div>
        </div>
        <div className="row">
          <div className="row-t">
            <b>
              10th {v.record.tenthPct.toFixed(1)}% · 12th{" "}
              {v.record.twelfthPct.toFixed(1)}%
            </b>
            <Link href="/check" className="stamp stamp--accent">
              Edit
            </Link>
          </div>
          <div className="arith">Used for eligibility</div>
        </div>
      </div>

      <hr className="hr" />

      <div className="sect">
        <h3>Your data</h3>
        <span className="ln" />
      </div>

      {v.userId ? (
        <>
          <p className="tiny" style={{ color: "var(--p-ink-2)" }}>
            Take it out or delete it whenever. Deletion completes in 30 days,
            backups included. No email, no retention offer.
          </p>
          {v.freeUntil ? (
            <div className="arith" style={{ marginTop: 10 }}>
              <b>Plan</b>&nbsp;&nbsp;{v.plan === "paid" ? "Paid" : "Free"}
              <br />
              <b>Free until</b>&nbsp;{formatDate(v.freeUntil)}
            </div>
          ) : null}

          <div className="stack g10" style={{ marginTop: 18 }}>
            <form action={exportEverything}>
              <button type="submit" className="btn btn--g btn--full">
                Download everything
              </button>
            </form>
            <form action={signOut}>
              <button type="submit" className="btn btn--g btn--full">
                Sign out
              </button>
            </form>
            <form action={deleteEverything}>
              <button type="submit" className="btn btn--danger btn--full">
                Delete my account
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="card">
          <p className="tiny" style={{ margin: 0, color: "var(--p-ink-2)" }}>
            You have no account. Your record lives in a cookie on this device and
            nowhere else — clearing it removes everything we hold about you.
          </p>
        </div>
      )}

      <p className="tiny mono" style={{ marginTop: 18 }}>
        <Link href="/privacy" style={{ color: "var(--p-accent)" }}>
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" style={{ color: "var(--p-accent)" }}>
          Terms
        </Link>{" "}
        · DPDP Act 2023
      </p>
    </AppShell>
  );
}
