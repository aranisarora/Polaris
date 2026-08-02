import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { AuditView } from "@/components/signal-views";
import { loadViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Signal audit" };

/**
 * `/audit` — Record zone. This is the shareable artefact (`docs/product.md`
 * §13.5: does Meera screenshot it without being asked), so it renders as a
 * standalone document with the wordmark in frame rather than inside the app
 * chrome.
 */
export default async function AuditPage() {
  const v = await loadViewer();
  if (!v) redirect("/check");

  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Signal audit</span>
      </header>
      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <AuditView audit={v.audit} />
      </main>
      <div className="foot">
        <Link href="/signal" className="btn btn--g btn--sm">Back</Link>
        <Link href="/reach" className="btn btn--o">What&rsquo;s in reach?</Link>
      </div>
    </div>
  );
}
