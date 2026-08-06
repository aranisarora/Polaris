"use client";

import * as React from "react";
import { Button, type ButtonSize } from "@/components/ui";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export interface SignInButtonProps {
  size?: ButtonSize;
  className?: string;
  /** Button label — defaults to the one action this page offers. */
  children?: React.ReactNode;
}

/** Names the problem without leaking internals; the button is the retry. */
function messageFor(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  if (raw.includes("not configured")) {
    return "Sign-in isn't switched on here yet — that's on our end, not yours. Try again a little later.";
  }
  return "Google didn't answer just now. Check your connection and try again.";
}

/**
 * The landing page's single action: Google OAuth via Supabase. Pending state
 * while the redirect is arranged; a quiet inline error line if it can't
 * start, with the same button standing as the retry.
 */
export function SignInButton({ size = "lg", className, children }: SignInButtonProps) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function signIn() {
    setError(null);
    setPending(true);
    try {
      const supabase = createSupabaseBrowser();
      const site =
        process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
        window.location.origin;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${site}/auth/callback` },
      });
      if (oauthError) throw oauthError;
      // Success: the browser is navigating to Google — stay pending.
    } catch (err) {
      setPending(false);
      setError(messageFor(err));
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Button size={size} loading={pending} onClick={signIn}>
        {children ?? "Chart your course"}
      </Button>
      {error && (
        <p role="alert" className="max-w-[38ch] text-center text-sm text-ember">
          {error}
        </p>
      )}
    </div>
  );
}
