import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Count, TickCounter, Wordmark, formatDate } from "@/components/brand";
import { COMPANIES } from "@/lib/data/companies";
import { cardContext, getSharedCard } from "@/lib/share";

/**
 * `/r/[slug]` — the referral engine.
 *
 * `docs/platform.md` §5: "looks optional and is not. It is the only thing that
 * makes the product spread without someone standing in a lecture hall."
 *
 * Budget (§1.5): static or edge-cached, and it must survive a group chat
 * opening it 200 times. Hence `revalidate` rather than a per-request render —
 * a card's counts do not change once written.
 *
 * Record zone: no atmosphere, no gesture layer, flat fills only.
 */

export const revalidate = 3600;

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const card = await getSharedCard(slug);
  if (!card) return { title: "Ledger not found" };

  const title = `${card.openCount} companies open now. ${card.reachCount} more within reach.`;

  return {
    title,
    description: "Check yours in 45 seconds. No signup.",
    openGraph: {
      title,
      description: "Check yours in 45 seconds. No signup.",
      type: "article",
    },
    twitter: { card: "summary_large_image", title },
  };
}

export default async function SharePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const card = await getSharedCard(slug);
  if (!card) notFound();

  return (
    <div className="shell">
      <main
        className="wrap"
        style={{
          flex: 1,
          paddingTop: 28,
          paddingBottom: 28,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* §8.4 — the count as the hero, the tick counter, the context line,
            the wordmark always in frame, and a stated date. */}
        <div className="sharecard">
          <Count value={card.openCount} total={card.totalCount} />
          <p className="tiny mono" style={{ margin: "9px 0 0" }}>
            {cardContext(card)}
          </p>
          <TickCounter
            open={card.openCount}
            reach={card.reachCount}
            settled={card.settledCount}
          />
          <p
            className="mono"
            style={{
              fontSize: 12,
              margin: "12px 0 0",
              color: "var(--p-open)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {card.openCount} open · {card.reachCount} within reach
          </p>

          <hr className="hr" />

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Wordmark href="/" />
            <span className="tiny mono">{formatDate(card.createdAt)}</span>
          </div>
        </div>

        <div>
          <h1 className="verdict v-lg">Know where you stand.</h1>
          <p className="lede" style={{ marginTop: 10 }}>
            Checked against the published cutoffs of {COMPANIES.length} companies
            that recruit at colleges like this one. Every number traces to a
            source.
          </p>
        </div>

        <Link href="/check" className="btn btn--o btn--full">
          Check your own
        </Link>

        <div className="card">
          <span className="eyebrow">On this public page</span>
          <div className="arith" style={{ lineHeight: 1.9 }}>
            <b>Shown</b>&nbsp;&nbsp; branch, year, university, counts
            <br />
            <b>Hidden</b>&nbsp; name, CGPA, percentages, company names
          </div>
          <p className="tiny" style={{ marginTop: 10 }}>
            <Link href="/privacy" style={{ color: "var(--p-accent)" }}>
              What we hold, and why
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
