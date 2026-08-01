import Link from "next/link";
import { DeclinationArc, Wordmark, formatDate } from "@/components/brand";
import { COLLEGES } from "@/lib/data/colleges";
import { COMPANIES, REGISTRY_UPDATED_ON } from "@/lib/data/companies";

/**
 * `/` — `docs/platform.md` §4.1: **it is the tool.** Field one above the fold.
 * Not a hero carousel.
 *
 * Approach zone (`docs/brand.md` §10.4, §12.1), so atmosphere is permitted:
 * the graticule and the declination arc. Nothing sits behind a figure.
 *
 * Zero client JS. The form is a plain GET to /check, so the landing works
 * before hydration and on a dead connection — which matters because the
 * acquisition path is a link forwarded into a WhatsApp group on campus wifi.
 */

export default function Landing() {
  const colleges = [...COLLEGES].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="shell graticule horizon">
      <DeclinationArc />

      <header className="wrap" style={{ paddingTop: 20, paddingBottom: 8 }}>
        <Wordmark href={null} eyebrow="For VTU 3rd-years · Bengaluru" />
      </header>

      <main
        className="wrap"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 22,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <div>
          <h1 className="verdict v-xl">
            See which companies you can walk into today.
          </h1>
          <p className="lede" style={{ marginTop: 12 }}>
            Seven questions. Forty-five seconds. No signup.
          </p>
        </div>

        <form action="/check" method="get" className="stack g14">
          <label className="field">
            <span>Your college</span>
            <select name="college" className="inp" defaultValue="">
              <option value="">Search VTU colleges…</option>
              {colleges.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                  {c.area ? ` — ${c.area}` : ""}
                </option>
              ))}
              <option value="other">My college isn&rsquo;t listed</option>
            </select>
          </label>

          <button type="submit" className="btn btn--o btn--full">
            Start
          </button>
        </form>

        <hr className="hr" style={{ margin: "4px 0" }} />

        <div className="stack g10">
          <p className="tiny" style={{ margin: 0 }}>
            Checked against the published cutoffs of {COMPANIES.length} companies
            that recruit at colleges like yours. Every number traces to a source.
          </p>
          <div
            className="mono"
            style={{ fontSize: 12, color: "var(--p-muted)" }}
          >
            {COMPANIES.length} companies · {COLLEGES.length} colleges · updated{" "}
            {formatDate(REGISTRY_UPDATED_ON)}
          </div>
          <p className="tiny mono" style={{ margin: 0 }}>
            Been here before?{" "}
            <Link href="/login" style={{ color: "var(--p-accent)" }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>

      <footer className="wrap" style={{ paddingBottom: 28, paddingTop: 8 }}>
        <p
          className="tiny mono"
          style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
        >
          <Link href="/pricing" style={{ color: "var(--p-accent)" }}>
            Pricing
          </Link>
          <Link href="/for-colleges" style={{ color: "var(--p-accent)" }}>
            For colleges
          </Link>
          <Link href="/privacy" style={{ color: "var(--p-accent)" }}>
            Privacy
          </Link>
          <Link href="/terms" style={{ color: "var(--p-accent)" }}>
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
