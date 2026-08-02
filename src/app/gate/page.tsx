import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthButtons } from "@/components/auth-buttons";
import { Count, TickCounter, Wordmark } from "@/components/brand";
import { verdictFor } from "@/components/ledger-view";
import { buildLedger } from "@/lib/engine/eligibility";
import { readAnonRecord } from "@/lib/session";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Save your ledger" };

/**
 * The gate — `docs/platform.md` §3.2.
 *
 * Placed at maximum emotional charge, not at zero. Everything before this point
 * is anonymous; the account is created here and nowhere earlier. The ledger
 * stays visible behind the sheet, because the thing being saved has to be in
 * view while we ask.
 */
export default async function GatePage() {
  const record = await readAnonRecord();
  if (!record) redirect("/check");

  const user = await getUser();
  if (user) redirect("/intake");

  const ledger = buildLedger(record);

  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Your ledger</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 24 }}>
        <span className="eyebrow">Recruiting at colleges like yours</span>
        <h1 className="verdict v-lg" style={{ marginTop: 11 }}>
          {verdictFor(ledger)}
        </h1>
        <div style={{ marginTop: 16 }}>
          <Count value={ledger.counts.open} total={ledger.counts.total} />
          <TickCounter
            open={ledger.counts.open}
            reach={ledger.counts.reach}
            settled={ledger.counts.settled}
          />
        </div>

        <hr className="hr" />

        <h2 className="verdict v-lg">
          {ledger.counts.open > 0
            ? `${ledger.counts.open === 1 ? "One is" : "They're"} open. Let's convert one.`
            : "Let's fix the first gate."}
        </h2>
        <p className="lede" style={{ marginTop: 10, marginBottom: 20 }}>
          Show me your profile and I&rsquo;ll tell you what stands between you and
          an offer.
        </p>

        <AuthButtons next="/intake" />

        <p className="btn-note">
          Ledger saved to this account. Free forever.
        </p>
      </main>
    </div>
  );
}
