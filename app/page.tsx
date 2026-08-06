import { Wordmark } from "@/components/ui";
import { HeroChart } from "@/components/landing/HeroChart";
import { SignInButton } from "@/components/landing/SignInButton";
import { AuthErrorNotice } from "@/components/landing/AuthErrorNotice";
import { MiniBearing } from "@/components/landing/MiniBearing";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navigators } from "@/components/landing/Navigators";
import { ClosingCTA } from "@/components/landing/ClosingCTA";

/**
 * Landing `/` — Persuade. Single scroll, no nav, one action.
 *
 * Statically prerendered: no Supabase, no cookies, no `searchParams` on the
 * first-paint path (docs/SPEC.md). This page takes cold social traffic and
 * has to be green on Core Web Vitals, so nothing here may reach for a
 * request-scoped API — that would push the whole route to render on demand.
 *
 * Signed-in visitors never see it: `proxy.ts` matches `/` and sends them to
 * their resume point before this HTML is ever served. Visitors carrying no
 * Supabase auth cookie short-circuit there with zero auth calls.
 */

/**
 * The first viewport has one non-negotiable: chart, claim, and the single gold
 * CTA all above the fold. On a tall phone (390×844) the default rhythm already
 * clears it; at 360×640 the CTA landed 93px past the fold, at 1024×768 it
 * landed 71px past, and at 1440×900 the button was clipped by 11px.
 *
 * Two bands fix it, and neither touches the 844px phone:
 * — under 820px tall, the whole stack tightens in step with the chart band and
 *   the wider chart cut in HeroChart (`.hero-band`, `.hero-c-*`);
 * — a wide short laptop (≥1024 × ≤920) only tightens the copy, because there
 *   the chart is already the right height and only the type rhythm is long.
 *
 * Written as real CSS rather than stacked arbitrary variants so the cascade
 * against `sm:pt-12` is decided by source order, not by utility sorting.
 */
const HERO_RHYTHM_CSS = `
@media (max-height: 820px), (min-width: 1024px) and (max-height: 920px) {
  .hero-mast { padding-block: 0.75rem; }
  .hero-copy { padding-top: 1.5rem; }
  .hero-lede { margin-top: 0.75rem; font-size: 1rem; line-height: 1.55rem; }
  .hero-action { margin-top: 1.5rem; }
}
`;

export default function LandingPage() {
  return (
    <>
      <style>{HERO_RHYTHM_CSS}</style>
      <header className="hero-mast flex justify-center px-6 py-5">
        <Wordmark size="md" />
      </header>

      <main className="flex-1">
        {/* The first viewport: the chart, the claim, the one action. */}
        <section aria-labelledby="hero-heading">
          <HeroChart />
          <div className="hero-copy mx-auto max-w-2xl px-6 pb-16 pt-9 text-center sm:pt-12 md:max-w-3xl md:pb-24">
            <AuthErrorNotice />
            <h1 id="hero-heading" className="text-display">
              Every dream job has coordinates.
            </h1>
            <p className="hero-lede mx-auto mt-5 max-w-[42ch] text-lg text-moonlight">
              We&apos;ll tell you what&apos;s actually achievable — and chart
              the route to the rest.
            </p>
            <SignInButton className="hero-action mt-8" />
          </div>
        </section>

        <MiniBearing />
        <HowItWorks />
        <Navigators />
        <ClosingCTA />
      </main>

      <footer className="border-t px-6 py-9">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center">
          <Wordmark size="sm" />
          <p className="text-sm text-moonlight/80">
            Every dream job has coordinates.
          </p>
        </div>
      </footer>
    </>
  );
}
