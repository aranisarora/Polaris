import Link from "next/link";
import { DeclinationArc, Wordmark } from "@/components/brand";

/**
 * Approach surface, so atmosphere is permitted (`docs/brand.md` §12.1).
 * Still no consolation — §3.1 rule 8: we are reading an instrument.
 */
export default function NotFound() {
  return (
    <div className="shell graticule horizon">
      <DeclinationArc />
      <header className="top" style={{ background: "transparent", borderBottom: 0 }}>
        <Wordmark href="/" />
      </header>
      <main
        className="wrap"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 20,
          paddingBottom: 60,
        }}
      >
        <h1 className="verdict v-xl">Nothing at this address.</h1>
        <p className="lede">
          The link may have expired, or it was never here.
        </p>
        <Link href="/check" className="btn btn--o btn--full">
          Check your eligibility
        </Link>
      </main>
    </div>
  );
}
