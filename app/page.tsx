import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolvePhase } from "@/lib/flow";
import { FLOW_ROUTE } from "@/lib/types";
import { Wordmark } from "@/components/ui";
import { HeroChart } from "@/components/landing/HeroChart";
import { SignInButton } from "@/components/landing/SignInButton";
import { MiniBearing } from "@/components/landing/MiniBearing";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navigators } from "@/components/landing/Navigators";
import { ClosingCTA } from "@/components/landing/ClosingCTA";

interface LandingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Landing `/` — Persuade. Single scroll, no nav, one action.
 * Signed-in visitors never see it: they are sent to their resume point.
 */
export default async function LandingPage({ searchParams }: LandingPageProps) {
  // Resume-point redirect for authenticated visitors. If Supabase isn't
  // configured (e.g. a fresh clone), the public page still renders.
  let destination: string | null = null;
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      destination = FLOW_ROUTE[await resolvePhase(supabase, user.id)];
    }
  } catch {
    // Unconfigured or unreachable Supabase — the landing page is public.
  }
  if (destination) redirect(destination);

  const params = await searchParams;
  const authErrorParam = params.auth_error;
  const authError = Array.isArray(authErrorParam)
    ? authErrorParam.includes("1")
    : authErrorParam === "1";

  return (
    <>
      <header className="flex justify-center px-6 py-5">
        <Wordmark size="md" />
      </header>

      <main className="flex-1">
        {/* The first viewport: the chart, the claim, the one action. */}
        <section aria-labelledby="hero-heading">
          <HeroChart />
          <div className="mx-auto max-w-2xl px-6 pb-16 pt-9 text-center sm:pt-12 md:pb-24">
            {authError && (
              <p role="alert" className="mb-6 text-sm text-ember">
                Google sign-in didn&apos;t complete. Nothing was lost — try
                again when you&apos;re ready.
              </p>
            )}
            <h1 id="hero-heading" className="text-display">
              Every dream job has coordinates.
            </h1>
            <p className="mx-auto mt-5 max-w-[42ch] text-lg text-moonlight">
              We&apos;ll tell you what&apos;s actually achievable — and chart
              the route to the rest.
            </p>
            <SignInButton className="mt-8" />
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
