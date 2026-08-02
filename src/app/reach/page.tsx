import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { ReachView } from "@/components/signal-views";
import { loadViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "What's in reach" };

export default async function ReachPage() {
  const v = await loadViewer();
  if (!v) redirect("/check");

  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">In reach</span>
      </header>
      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <ReachView reach={v.reach} ledger={v.ledger} />
      </main>
      <div className="foot">
        <Link href="/signal" className="btn btn--g btn--sm">Back</Link>
        <Link href="/roadmap" className="btn btn--o">See the plan</Link>
      </div>
    </div>
  );
}
