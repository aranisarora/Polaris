import Link from "next/link";
import { LedgerMark, Mark, Wordmark } from "@/components/brand";

/**
 * The four-tab model — `docs/brand.md` §11.2.
 *
 * Left to right the tabs read as a sentence: **what now → where I stand →
 * where I'm going → what I'm worth.** Swipe order and narrative order are the
 * same thing, which is why nobody needs to learn it.
 *
 * Two rules enforced structurally rather than by convention:
 *
 * - §11.4: every tab is a real `<a href>` to a real URL. The gesture layer is
 *   progressive enhancement over working links. If JS fails, has not loaded, or
 *   is disabled, tapping a tab does a normal navigation and the product still
 *   works — which matters on campus wifi, and the acquisition path depends on
 *   URLs anyway.
 * - §11.2: Settings is a header affordance, not a tab. It is visited twice a
 *   year and does not deserve a quarter of the thumb zone.
 *
 * §15 #6: the gesture layer ships only once the six Phase 0 routes are live.
 * Tabs are plain links first. This is that first version.
 */

export type TabKey = "today" | "ledger" | "roadmap" | "signal";

const TABS: {
  key: TabKey;
  href: string;
  label: string;
  icon: "today" | "ledger" | "roadmap" | "signal";
}[] = [
  { key: "today", href: "/today", label: "Today", icon: "today" },
  { key: "ledger", href: "/ledger", label: "Ledger", icon: "ledger" },
  { key: "roadmap", href: "/roadmap", label: "Roadmap", icon: "roadmap" },
  { key: "signal", href: "/signal", label: "Signal", icon: "signal" },
];

function TabIcon({ name }: { name: string }) {
  switch (name) {
    case "ledger":
      return <LedgerMark size={20} />;
    case "roadmap":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h10M4 18h13" />
        </svg>
      );
    case "signal":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <path d="M4 19V9M10 19V5M16 19v-6M22 19v-9" />
        </svg>
      );
    default:
      return <Mark size={20} />;
  }
}

/** The rail, on desktop. §11.8 — not the phone layout stretched. */
const RAIL_LINKS = [
  { href: "/today", label: "This week", route: "/today" },
  { href: "/ledger", label: "Ledger", route: "/ledger" },
  { href: "/roadmap", label: "Roadmap", route: "/roadmap" },
  { href: "/signal", label: "Signal", route: "/signal" },
  { href: "/audit", label: "Audit", route: "/audit" },
  { href: "/reach", label: "In reach", route: "/reach" },
  { href: "/connections", label: "Connections", route: "/connections" },
  { href: "/settings", label: "Settings", route: "/settings" },
];

export function AppShell({
  active,
  title,
  children,
  aside,
}: {
  active: TabKey;
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="shell">
      <div className="app-shell">
        <div className="rail">
          <Wordmark href="/today" />
          <nav aria-label="Sections">
            {RAIL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={l.route === `/${active}` ? "page" : undefined}
              >
                {l.label}
                <span className="rt">{l.route}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="app-main">
          {/* §11.6 — a fixed hairline bar. No collapsing header: collapsing
              headers reflow content, and nothing may reflow. */}
          <header className="top" data-mobile-only>
            <Wordmark href="/today" />
            <span className="sp" />
            <Link href="/settings" className="tr">
              {title}
            </Link>
          </header>

          <main className="wrap pane" style={{ paddingTop: 20, paddingBottom: 32 }}>
            {aside ? (
              <div className="two-pane">
                <div>{children}</div>
                <div className="aside">{aside}</div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      <nav className="tabs" aria-label="Main">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.key === active ? "page" : undefined}
          >
            <TabIcon name={t.icon} />
            <span className="lb">{t.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
