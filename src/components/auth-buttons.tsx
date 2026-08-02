import { signInGoogle, signInLinkedIn } from "@/app/auth/actions";
import { hasSupabase } from "@/lib/supabase/env";

/**
 * The two auth methods. LinkedIn appears as a *sign-in* only — never as an
 * import, never phrased as one. `docs/product.md` §10.5 investigated the data
 * route and closed it: the scopes do not exist for us, and a design that
 * implies otherwise would be promising something we cannot deliver.
 */
export function AuthButtons({ next = "/intake" }: { next?: string }) {
  if (!hasSupabase) {
    return (
      <div className="card card--fix">
        <span className="eyebrow" style={{ color: "var(--p-fix)" }}>
          Not configured
        </span>
        <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
          Accounts need Supabase credentials in the environment. Everything
          before the account — the ledger, the audit, the reach set and the full
          roadmap — works without them.
        </p>
      </div>
    );
  }

  return (
    <div className="stack g10">
      <form action={signInGoogle}>
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="btn btn--g btn--full">
          Continue with Google
        </button>
      </form>
      <form action={signInLinkedIn}>
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="btn btn--g btn--full">
          Continue with LinkedIn
        </button>
      </form>
    </div>
  );
}
