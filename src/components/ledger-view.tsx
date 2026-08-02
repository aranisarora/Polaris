import Link from "next/link";
import {
  Count,
  SourceTag,
  StateStamp,
  TickCounter,
  formatDate,
  lpaRange,
} from "@/components/brand";
import type { CompanyVerdict, Ledger, ReachGroup } from "@/lib/engine/eligibility";

/**
 * The ledger — `docs/product.md` §9.2 rendered under `docs/brand.md` §8.1.
 *
 * The ruled row is the atom of the product and the thing that gets
 * screenshotted. State glyph and label at the left, entity in Body, **the
 * arithmetic in Figures**, source tag at the right. Hairline between rows, no
 * card, no shadow. Repeated twenty-three times this *is* the brand — and no
 * wrapper can produce it, because it needs a registry.
 *
 * Record zone (§10.4): no gesture layer, no atmosphere, nothing behind a
 * figure. It must not behave like software. We need to be believed before we
 * need to be enjoyed.
 */

const WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

export function spell(n: number): string {
  return n < WORDS.length ? WORDS[n] : String(n);
}

/**
 * §3.1 rule 3: lead with what is open. Never "eligible for 9 of 23"; always
 * "Nine doors are open." No number changes; the framing does — and despair
 * produces churn.
 *
 * The four shapes exist because three real records break the standard shock
 * and all three turn up in any 300-person room (flow board, stage 05).
 */
export function verdictFor(ledger: Ledger): string {
  const { open } = ledger.counts;

  switch (ledger.shape) {
    case "all-open":
      return "Every door is already open.";
    case "mostly-settled":
      return open === 0
        ? "One fix opens this."
        : `${spell(open)} ${open === 1 ? "door is" : "doors are"} open. They're real.`;
    default:
      return open === 0
        ? "One fix opens this."
        : `${spell(open)} ${open === 1 ? "door is" : "doors are"} open.`;
  }
}

export function subheadFor(ledger: Ledger): string {
  const { reach, settled } = ledger.counts;
  if (ledger.shape === "all-open") {
    return "Eligibility isn't your constraint. So here's the real question.";
  }
  if (reach > 0 && settled > 0) {
    return `${reach} more within reach. ${settled} settled.`;
  }
  if (reach > 0) return `${reach} more within reach.`;
  if (settled > 0) return `${settled} settled — nothing to fix there.`;
  return "";
}

/** A single company row. §8.1. */
export function LedgerRow({
  verdict,
  showState = true,
}: {
  verdict: CompanyVerdict;
  showState?: boolean;
}) {
  const { company, binding, state } = verdict;

  return (
    <div className="row">
      <div className="row-t">
        <b>
          <Link
            href={`/companies/${company.slug}`}
            style={{ textDecoration: "none" }}
          >
            {company.name}
          </Link>
          {company.programme ? (
            <span className="row-sub"> · {company.programme}</span>
          ) : null}
        </b>
        {showState ? <StateStamp state={state} /> : null}
      </div>

      {binding ? (
        <div className="arith">
          {binding.label} · requires <b>{binding.requiredText}</b> · you have{" "}
          <span
            className={binding.fixability === "settled" ? "bad" : "warn"}
          >
            {binding.actualText}
          </span>
        </div>
      ) : (
        <div className="arith">
          Clear on every published gate.{" "}
          <span className="ok">{lpaRange(company.packageMinLpa, company.packageMaxLpa)}</span>
        </div>
      )}

      {/* §3.1 rule 5: every finding carries its fix, sized in hours. A
          settled row carries no instruction — that is the point. */}
      {binding?.fixability === "fixable" && binding.fix ? (
        <p className="fixline">
          <b>Fix:</b> {binding.fix}
        </p>
      ) : binding?.fixability === "settled" ? (
        <p className="fixline fixline--settled">
          Nothing to fix. Off your list for good.
        </p>
      ) : null}

      {company.confidence === "contested" ? (
        <p className="tiny" style={{ marginTop: 8 }}>
          <Link
            href={`/companies/${company.slug}`}
            style={{ color: "var(--p-fix)" }}
          >
            Sources disagree on this one — see what and why
          </Link>
        </p>
      ) : null}

      <div style={{ marginTop: 8 }}>
        <SourceTag
          source={company.sources[0]}
          suffix={`${company.batchYear} criteria`}
        />
      </div>
    </div>
  );
}

/**
 * Rows sharing a blocking reason group into one line. This is what turns a
 * list into an argument: it puts a number on what one fix is worth.
 */
export function ReachGroupBlock({ group }: { group: ReachGroup }) {
  const names = group.verdicts.map((v) => v.company.name);
  const lead = names[0];
  const rest = names.length - 1;

  return (
    <div className="row">
      <div className="row-t">
        <b>
          {lead}
          {rest > 0 ? (
            <span className="row-sub"> +{rest}</span>
          ) : null}
        </b>
        <StateStamp state="reach" />
      </div>

      <div className="arith">{group.headline}</div>

      {rest > 0 ? (
        <div className="arith" style={{ color: "var(--p-ink-2)" }}>
          {names.slice(1).join(" · ")}
        </div>
      ) : null}

      {group.binding.fix ? (
        <p className="fixline">
          <b>Fix:</b> {group.binding.fix}{" "}
          {group.opens > 1
            ? `Opens ${group.opens} companies at once.`
            : "Opens this one."}
        </p>
      ) : null}

      <div style={{ marginTop: 8 }}>
        <SourceTag
          source={group.verdicts[0].company.sources[0]}
          suffix={`${group.verdicts[0].company.batchYear} criteria`}
        />
      </div>
    </div>
  );
}

export function LedgerBody({
  ledger,
  collegeLabel,
}: {
  ledger: Ledger;
  collegeLabel: string;
}) {
  const { counts } = ledger;

  return (
    <>
      <span className="eyebrow">
        Recruiting at colleges like yours · {collegeLabel}
      </span>
      <h1 className="verdict v-xl" style={{ marginTop: 11 }}>
        {verdictFor(ledger)}
      </h1>

      <div style={{ marginTop: 16 }}>
        <Count value={counts.open} total={counts.total} />
        <TickCounter
          open={counts.open}
          reach={counts.reach}
          settled={counts.settled}
        />
        <p className="tiny" style={{ marginTop: 12 }}>
          {subheadFor(ledger)}
        </p>
      </div>

      {/* ── Open now ─────────────────────────────────────────────────── */}
      {ledger.open.length > 0 && (
        <>
          <hr className="hr" />
          <div className="sect sect--open">
            <h3>● Open now</h3>
            <span className="ln" />
            <span className="n">{counts.open}</span>
          </div>
          <div className="rows">
            {ledger.open.map((v) => (
              <LedgerRow key={v.company.slug} verdict={v} showState={false} />
            ))}
          </div>
        </>
      )}

      {/* ── Within reach, grouped by the fix that opens them ─────────── */}
      {ledger.groups.length > 0 && (
        <>
          <hr className="hr" />
          <div className="sect sect--fix">
            <h3>◐ Within reach</h3>
            <span className="ln" />
            <span className="n">{counts.reach}</span>
          </div>
          <div className="rows">
            {ledger.groups.map((g) => (
              <ReachGroupBlock key={g.key} group={g} />
            ))}
          </div>
        </>
      )}

      {/* ── Settled. Grey, so the eye lands on amber and green first. ── */}
      {ledger.settled.length > 0 && (
        <>
          <hr className="hr" />
          <div className="sect sect--settled">
            <h3>○ Settled</h3>
            <span className="ln" />
            <span className="n">{counts.settled}</span>
          </div>
          <div className="rows">
            {ledger.settled.map((v) => (
              <LedgerRow key={v.company.slug} verdict={v} showState={false} />
            ))}
          </div>
        </>
      )}

      {/* §9 rule 7: a date on every artefact. It is what makes a forwarded
          screenshot credible in November. */}
      <p className="tiny mono" style={{ marginTop: 20 }}>
        Checked {formatDate(ledger.asOf)} · registry {ledger.registryVersion}
      </p>
    </>
  );
}
