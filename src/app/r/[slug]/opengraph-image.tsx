import { ImageResponse } from "next/og";
import { cardContext, getSharedCard } from "@/lib/share";

/**
 * The OG image — the most-seen brand surface we will ever have, and the one an
 * art director never sees (`docs/brand.md` §8.4).
 *
 * §13.1 is explicit that this is not one of the four permitted photographs: it
 * is generated from the student's own data — the count, the tick counter, the
 * context, the date. Type and rules, rendered at the edge. Never an
 * illustration, never a template with a photo behind it. That artefact's
 * persuasive power *is* that it is obviously their own record.
 *
 * Constraints applied here, all from §8.4 and §9:
 *   · readable at 240px wide, legible cropped to the top half
 *   · no text under 12px (scaled: nothing below ~22px at 1200×630)
 *   · nothing essential in the outer 8%
 *   · flat colour only — gradients band badly under WhatsApp's re-encode
 *   · the wordmark is in frame, and there is a date
 */

export const alt = "Your Polaris eligibility ledger";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#10141C";
const MUTED = "#626A80";
const FAINT = "#949CAD";
const PAPER = "#FBFBFC";
const LINE = "#C9CFDA";
const OPEN = "#14654A";
const FIX = "#A05A00";
const SETTLED = "#5A6273";

export default async function Image(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const card = await getSharedCard(slug);

  // 8% inset on every edge — people crop badly and thumbnails clip.
  const pad = 64;

  if (!card) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: PAPER,
            color: INK,
            fontSize: 56,
            fontFamily: "Georgia, serif",
          }}
        >
          Know where you stand.
        </div>
      ),
      size,
    );
  }

  const ticks = [
    ...Array.from({ length: card.openCount }, () => OPEN),
    ...Array.from({ length: card.reachCount }, () => FIX),
    ...Array.from({ length: card.settledCount }, () => SETTLED),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: pad,
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* The count as the hero. */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
            <span
              style={{
                fontSize: 190,
                fontWeight: 700,
                color: OPEN,
                lineHeight: 0.9,
                letterSpacing: "-0.04em",
              }}
            >
              {card.openCount}
            </span>
            <span style={{ fontSize: 84, color: FAINT, letterSpacing: "-0.02em" }}>
              / {card.totalCount}
            </span>
            <span
              style={{
                fontSize: 30,
                color: MUTED,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              open now
            </span>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 34 }}>
            {ticks.map((colour, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 56,
                  background: colour,
                  opacity: colour === OPEN ? 1 : colour === FIX ? 0.55 : 0.35,
                  borderRadius: 2,
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: MUTED,
              marginTop: 30,
            }}
          >
            {cardContext(card)}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 34,
              color: INK,
              marginTop: 18,
            }}
          >
            {card.openCount} open · {card.reachCount} within reach ·{" "}
            {card.settledCount} settled
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: `2px solid ${LINE}`,
            paddingTop: 22,
          }}
        >
          {/* §9 rule 3 — the wordmark is in frame on every shareable surface. */}
          <span style={{ fontSize: 40, fontWeight: 700, color: INK }}>
            Polaris
          </span>
          <span style={{ fontSize: 26, color: MUTED }}>
            Every number traces to a source ·{" "}
            {new Date(card.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
        </div>
      </div>
    ),
    size,
  );
}
