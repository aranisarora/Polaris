import type { Metadata, Viewport } from "next";
import { Fragment_Mono, Hanken_Grotesk, Marcellus } from "next/font/google";
import { StarField } from "@/components/ui/StarField";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import "./globals.css";

const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marcellus",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const fragmentMono = Fragment_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-fragment",
  display: "swap",
});

const TITLE = "Polaris — Every dream job has coordinates";
const DESCRIPTION =
  "Name where you dream of ending up. Polaris shows what's actually achievable right now — and charts the route to the rest.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: TITLE,
    template: "%s — Polaris",
  },
  description: DESCRIPTION,
  applicationName: "Polaris",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Polaris",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Polaris",
    type: "website",
    url: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1226",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/* The committed visual world — docs/DIRECTION.md. This exact text must
   survive into the emitted markup as an HTML comment (seed key a472ca18). */
const DIRECTION_CONTRACT = `POLARIS DIRECTION CONTRACT
THESIS: A voyage track chart for a career: the dream job is a fixed star, the
user's position is honestly plotted, and the product's one idea - "we tell you
what's actually achievable" - is drawn as a navigable route. Refuses the
job-board card grid and the hype-gradient hero.
OWN-WORLD: Nautical-twilight indigo (#0A1226) deepening to #05080F at the
zenith; hairline graticules with degree ticks; star field of magnitude-varied
points; one brass-gold (#D9A648) dotted route with four-point star waypoints;
engraved-roman display (Marcellus); Hanken Grotesk text; Fragment Mono bearing
labels; aurora green / route gold / ember coral as chart classifications.
STORY: A visitor names their dream, sees their true position without flattery,
locks a destination, and watches a route drawn for them alone.
FIRST VIEWPORT: Landing, mobile: wordmark; full-bleed star chart ~55vh with a
YOU ARE HERE cross low in frame and a dotted gold route rising through
waypoints to a labeled north star; display headline "Every dream job has
coordinates."; one gold CTA "Chart your course". Nothing else competes.
FORM: Voyage track chart - candidate 6 of 7 grounded night-sky renditions;
seed key a472ca18.
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md.`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${marcellus.variable} ${hanken.variable} ${fragmentMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--\n${DIRECTION_CONTRACT}\n-->`,
          }}
        />
        <StarField />
        <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
        <RegisterSW />
      </body>
    </html>
  );
}
