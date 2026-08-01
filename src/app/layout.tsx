import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * `docs/brand.md` §6.2: Phase 0 ships zero webfonts. The `/check → /ledger`
 * route is the most valuable and most fragile moment in the funnel — under 3s
 * on a mid-range Android on 4G — and a font swap there is a visible flash for
 * no gain. The system's character lives in the rationing, the rules and the
 * figures, not in owning a typeface.
 */

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Polaris — Know where you stand",
    template: "%s · Polaris",
  },
  description:
    "See which companies you can walk into today. Checked against the published cutoffs of the recruiters that visit colleges like yours. Every number traces to a source.",
  applicationName: "Polaris",
  openGraph: {
    type: "website",
    siteName: "Polaris",
    title: "Know where you stand",
    description:
      "Which doors are open, which are settled, and what to do this week.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // §11.7 — the keyboard resizes the layout rather than covering it.
  interactiveWidget: "resizes-content",
  themeColor: "#FBFBFC",
  width: "device-width",
  initialScale: 1,
  // Never block zoom. Pinch-to-zoom is an accessibility feature, and this
  // audience reads on small, cheap screens.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
