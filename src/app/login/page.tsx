import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthButtons } from "@/components/auth-buttons";
import { Wordmark } from "@/components/brand";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in" };

const REASONS: Record<string, string> = {
  missing_code: "That sign-in link was incomplete. Try again.",
  not_configured: "Sign-in is not configured on this deployment yet.",
  exchange_failed: "That sign-in link has expired. Try again.",
};

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await props.searchParams;
  const user = await getUser();
  if (user) redirect("/today");

  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Sign in</span>
      </header>

      <main
        className="wrap"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 22,
          paddingBottom: 40,
        }}
      >
        <div>
          <h1 className="verdict v-lg">Welcome back.</h1>
          <p className="lede" style={{ marginTop: 10 }}>
            Everything&rsquo;s where you left it.
          </p>
        </div>

        {error ? (
          <div className="card card--fix">
            <p className="tiny" style={{ margin: 0, color: "var(--p-ink-2)" }}>
              {REASONS[error] ?? "Something went wrong. Try again."}
            </p>
          </div>
        ) : null}

        <AuthButtons next={next ?? "/today"} />

        <p className="tiny mono" style={{ margin: 0, textAlign: "center" }}>
          New?{" "}
          <Link href="/check" style={{ color: "var(--p-accent)" }}>
            Check your eligibility first
          </Link>
        </p>
      </main>
    </div>
  );
}
