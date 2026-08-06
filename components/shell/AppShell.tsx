"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, FileText, LogOut, Map } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FlowPhase } from "@/lib/types";
import { IconButton } from "@/components/ui/IconButton";
import { StarGlyph } from "@/components/ui/glyphs";
import { ToastProvider } from "@/components/ui/Toast";
import { Wordmark } from "@/components/ui/Wordmark";

export interface AppShellUser {
  name: string | null;
  email: string | null;
}

export interface AppShellProps {
  user: AppShellUser;
  /**
   * The user's resume phase (lib/flow.ts). While it is still onboarding or
   * profile, every TABS destination sits ahead of the resume point and would
   * only bounce back (docs/CONTRACTS.md flow rule) — so the tabs render as
   * visibly disabled, non-navigating elements instead of dead taps.
   */
  phase: FlowPhase;
  children: React.ReactNode;
}

/**
 * Nav labels are the one place the metaphor yields to comprehension: the
 * /bearing tab reads "Matches" so low-intent arrivals know where the real
 * postings live. The route, the compass glyph and every word on the surface
 * itself stay bearing language (PRODUCT.md brand commitments).
 */
const TABS = [
  { href: "/bearing", label: "Matches", icon: Compass },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/cv", label: "CV", icon: FileText },
] as const;

/** Plain reading, not a metaphor: say exactly what unlocks these. */
const LOCKED_TITLE = "Opens once your profile is saved";

/**
 * Authenticated chrome. Mobile: top bar (wordmark + sign-out) and a fixed
 * three-tab bottom bar with safe-area padding. Desktop (md+): one top bar
 * with inline nav. Provides ToastProvider to everything inside.
 */
export function AppShell({ user, phase, children }: AppShellProps) {
  const pathname = usePathname();
  const navLocked = phase === "onboarding" || phase === "profile";

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-depth focus:px-4 focus:py-2 focus:text-sm focus:text-starlight"
        >
          Skip to content
        </a>

        <header className="border-b">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:h-16 md:px-8">
            <Link
              href="/"
              aria-label="Polaris"
              className="rounded-md py-1"
            >
              <span className="md:hidden">
                <Wordmark size="sm" />
              </span>
              <span className="hidden md:inline-block">
                <Wordmark size="md" />
              </span>
            </Link>

            {/* desktop nav */}
            <nav
              aria-label="Primary"
              className="hidden items-center gap-1 md:flex"
            >
              {TABS.map((tab) => {
                if (navLocked) {
                  return (
                    <span
                      key={tab.href}
                      aria-disabled="true"
                      title={LOCKED_TITLE}
                      className="inline-flex min-h-11 cursor-default select-none items-center gap-2 rounded-lg px-4 text-sm font-medium text-moonlight opacity-40"
                    >
                      {tab.label}
                    </span>
                  );
                }
                const active = pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors duration-150",
                      active
                        ? "text-gold"
                        : "text-moonlight hover:bg-veil/30 hover:text-starlight",
                    )}
                  >
                    {active && <StarGlyph size={9} />}
                    {tab.label}
                  </Link>
                );
              })}
            </nav>

            <form action="/auth/signout" method="post">
              <IconButton
                aria-label="Sign out"
                type="submit"
                title={user.email ? `Sign out ${user.email}` : "Sign out"}
              >
                <LogOut size={18} strokeWidth={1.5} aria-hidden />
              </IconButton>
            </form>
          </div>
        </header>

        <main
          id="main"
          className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 md:px-8 md:pb-16 md:pt-10"
        >
          {children}
        </main>

        {/* mobile tab bar */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-night pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <div className="flex h-16">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              if (navLocked) {
                return (
                  <span
                    key={tab.href}
                    aria-disabled="true"
                    title={LOCKED_TITLE}
                    className="relative flex flex-1 select-none flex-col items-center justify-center gap-1 text-moonlight opacity-40"
                  >
                    <Icon size={20} strokeWidth={1.5} aria-hidden />
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em]">
                      {tab.label}
                    </span>
                  </span>
                );
              }
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex flex-1 flex-col items-center justify-center gap-1",
                    active ? "text-gold" : "text-moonlight",
                  )}
                >
                  {active && (
                    <StarGlyph size={7} className="absolute top-1.5" />
                  )}
                  <Icon size={20} strokeWidth={1.5} aria-hidden />
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em]">
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
}
