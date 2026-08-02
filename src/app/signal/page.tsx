import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AuditView } from "@/components/signal-views";
import { loadViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Signal" };

/**
 * `/signal` — `docs/brand.md` §11.2 chooses this name over "Profile"
 * deliberately: Profile is what every app calls it, Signal is already the
 * product's own word ("your differentiating signal is: none"), and §13.5 wants
 * insider vocabulary. This is free insider vocabulary.
 *
 * §15 #7: the tab is a container, not a replacement for the routes. /audit and
 * /reach stay independently linkable and screenshottable.
 */
export default async function SignalPage() {
  const v = await loadViewer();
  if (!v) redirect("/check");

  return (
    <AppShell active="signal" title="Signal">
      <AuditView audit={v.audit} />

      <hr className="hr" />

      <div className="stack g10">
        <Link href="/reach" className="route">
          <span className="ic">IR</span>
          <span className="tx">
            <b>What&rsquo;s in reach</b>
            <span>
              {v.reach.bands.map((b) => `${b.label} ${b.verdicts.length}`).join(" · ")}
            </span>
          </span>
        </Link>
        <Link href="/audit" className="route">
          <span className="ic">SA</span>
          <span className="tx">
            <b>The audit on its own</b>
            <span>Its own URL, for sharing</span>
          </span>
        </Link>
        <Link href="/connections" className="route">
          <span className="ic">GH</span>
          <span className="tx">
            <b>Connections</b>
            <span>GitHub, LeetCode, marksheet</span>
          </span>
        </Link>
        <Link href="/settings" className="route">
          <span className="ic">ST</span>
          <span className="tx">
            <b>Settings</b>
            <span>Account, your data, deletion</span>
          </span>
        </Link>
      </div>
    </AppShell>
  );
}
