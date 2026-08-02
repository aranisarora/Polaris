import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Record added" };

export default function ThanksPage() {
  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Added</span>
      </header>
      <main
        className="wrap"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 20,
          paddingBottom: 40,
        }}
      >
        <h1 className="verdict v-lg">That one counts.</h1>
        <p className="lede">
          It goes through a review before it can appear as proof to anyone else —
          this is the data where being wrong does the most damage, so nothing
          reaches another student unchecked.
        </p>
        <Link href="/ledger" className="btn btn--o btn--full">
          Back to your ledger
        </Link>
      </main>
    </div>
  );
}
