"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Wordmark } from "@/components/brand";
import { BRANCHES, TARGET_SECTORS, type BranchCode } from "@/lib/data/types";
import { GRAD_YEARS } from "@/lib/data/colleges";
import type { Countdown } from "@/lib/engine/countdown";
import { submitCheck, type CheckState } from "./actions";

type CollegeOption = {
  slug: string;
  name: string;
  area?: string;
  universityCode: string;
  autonomous: boolean;
};

/**
 * The ungated path — `docs/platform.md` §3.1. Three steps, seven fields, and
 * the countdown as the resolve state.
 *
 * Two rules from `docs/brand.md` §11.7 shape the whole component:
 *
 * - The four numeric fields sit **together on one step**, so a single numeric
 *   keypad presents once and stays up. A keyboard that flaps between fields is
 *   the difference between 45 seconds and 90.
 * - `type="text"` with `inputMode`, never `type="number"` — a scroll wheel over
 *   a focused number input silently changes a student's CGPA.
 *
 * Steps are local state rather than routes, so nothing unmounts between them
 * and the keyboard never dismisses.
 */
export function CheckForm({
  colleges,
  initialCollege,
  countdowns,
}: {
  colleges: CollegeOption[];
  initialCollege: string;
  countdowns: Record<number, Countdown>;
}) {
  const [state, action] = useActionState<CheckState, FormData>(submitCheck, {});
  const [step, setStep] = useState(initialCollege ? 2 : 1);

  const [college, setCollege] = useState(initialCollege);
  const [branch, setBranch] = useState<BranchCode>("CSE");
  const [gradYear, setGradYear] = useState(GRAD_YEARS[1]);
  const [target, setTarget] = useState("");
  const [query, setQuery] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.errors ?? {};

  const selected = colleges.find((c) => c.slug === college);
  const notListed = college === "other";
  const countdown = countdowns[gradYear];

  const shown = query
    ? colleges.filter((c) =>
        `${c.name} ${c.area ?? ""}`.toLowerCase().includes(query.toLowerCase()),
      )
    : colleges;

  return (
    <form ref={formRef} action={action} className="shell">
      <input type="hidden" name="college" value={college} />
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="gradYear" value={gradYear} />
      <input type="hidden" name="target" value={target} />
      {notListed ? <input type="hidden" name="university" value="OTHER" /> : null}

      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">{step} of 3</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <div className="steps" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <i key={n} className={n <= step ? "on" : ""} />
          ))}
        </div>

        {/* ── Step 1 · identity. Three taps, no keyboard except search. ─── */}
        {step === 1 && (
          <>
            <h1 className="verdict v-lg">Where are you studying?</h1>
            <p className="lede" style={{ marginBottom: 22 }}>
              Picking from the list pulls in your exam calendar.
            </p>

            <div className="stack g18">
              <div className="field">
                <span className="field-label">College</span>
                <input
                  type="text"
                  className="inp"
                  placeholder="Search VTU colleges…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search colleges"
                  autoComplete="off"
                />
                <div
                  style={{
                    marginTop: 8,
                    maxHeight: 232,
                    overflowY: "auto",
                    border: "1px solid var(--p-line)",
                    borderRadius: 8,
                    background: "var(--p-surface)",
                  }}
                >
                  {shown.slice(0, 60).map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => setCollege(c.slug)}
                      aria-pressed={college === c.slug}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 14px",
                        minHeight: 48,
                        borderBottom: "1px solid var(--p-line)",
                        background:
                          college === c.slug ? "var(--p-accent-w)" : undefined,
                        color: college === c.slug ? "var(--p-accent)" : undefined,
                        fontWeight: college === c.slug ? 500 : 400,
                        fontSize: 14,
                      }}
                    >
                      {c.name}
                      {c.area ? (
                        <span
                          className="tiny"
                          style={{ display: "block", marginTop: 2 }}
                        >
                          {c.area}
                          {c.autonomous ? " · autonomous" : ""}
                        </span>
                      ) : null}
                    </button>
                  ))}
                  {shown.length === 0 && (
                    <p className="tiny" style={{ padding: 14 }}>
                      Nothing matched. Use &ldquo;not listed&rdquo; below — the
                      ledger works either way.
                    </p>
                  )}
                </div>
                <p className="tiny mono" style={{ marginTop: 8 }}>
                  Not listed?{" "}
                  <button
                    type="button"
                    onClick={() => setCollege("other")}
                    style={{ color: "var(--p-accent)", textDecoration: "underline" }}
                  >
                    That&rsquo;s fine →
                  </button>
                </p>
              </div>

              {notListed && (
                <div className="card card--open">
                  <span className="eyebrow" style={{ color: "var(--p-open)" }}>
                    Works unchanged
                  </span>
                  <p
                    className="tiny"
                    style={{ marginTop: 8, color: "var(--p-ink-2)" }}
                  >
                    The ledger, the audit, the reach set and the full roadmap are
                    identical for you. The only thing we cannot do is schedule
                    around your exam windows automatically — so we ask for two
                    dates, once a semester.
                  </p>
                  <div className="grid2" style={{ marginTop: 12 }}>
                    <label className="field">
                      <span>Next exam starts</span>
                      <input
                        type="date"
                        name="examStart"
                        className="inp num"
                      />
                    </label>
                    <label className="field">
                      <span>Ends</span>
                      <input type="date" name="examEnd" className="inp num" />
                    </label>
                  </div>
                </div>
              )}

              <div className="field">
                <span className="field-label">Branch</span>
                <div className="chips">
                  {BRANCHES.map((b) => (
                    <button
                      key={b.code}
                      type="button"
                      className="chip"
                      aria-pressed={branch === b.code}
                      onClick={() => setBranch(b.code)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="field-label">Graduating in</span>
                <div className="chips">
                  {GRAD_YEARS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      className="chip"
                      aria-pressed={gradYear === y}
                      onClick={() => setGradYear(y)}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card card--open" style={{ marginTop: 22 }}>
              <p className="tiny" style={{ margin: 0, color: "var(--p-ink-2)" }}>
                On ECE, EEE or Mech and aiming at software? Same scoring, no
                penalty.
              </p>
            </div>
          </>
        )}

        {/* ── Step 2 · the four numbers, together, one keypad. ─────────── */}
        {step === 2 && (
          <>
            <h1 className="verdict v-lg">Four numbers you know by heart.</h1>
            <p className="lede" style={{ marginBottom: 22 }}>
              Rough is fine. Correct them any time.
            </p>

            <div className="stack g18">
              <div className="grid2">
                <label className="field">
                  <span>Current CGPA</span>
                  <input
                    name="cgpa"
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="next"
                    className="inp num"
                    placeholder="6.4"
                    aria-invalid={Boolean(errors.cgpa)}
                    autoComplete="off"
                  />
                  {errors.cgpa && <p className="field-error">{errors.cgpa}</p>}
                </label>
                <label className="field">
                  <span>Active backlogs</span>
                  <input
                    name="activeBacklogs"
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="next"
                    className="inp num"
                    placeholder="0"
                    aria-invalid={Boolean(errors.activeBacklogs)}
                    autoComplete="off"
                  />
                  {errors.activeBacklogs && (
                    <p className="field-error">{errors.activeBacklogs}</p>
                  )}
                </label>
              </div>
              <div className="grid2">
                <label className="field">
                  <span>10th %</span>
                  <input
                    name="tenthPct"
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="next"
                    className="inp num"
                    placeholder="72.0"
                    aria-invalid={Boolean(errors.tenthPct)}
                    autoComplete="off"
                  />
                  {errors.tenthPct && (
                    <p className="field-error">{errors.tenthPct}</p>
                  )}
                </label>
                <label className="field">
                  <span>12th %</span>
                  <input
                    name="twelfthPct"
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    className="inp num"
                    placeholder="63.8"
                    aria-invalid={Boolean(errors.twelfthPct)}
                    autoComplete="off"
                  />
                  {errors.twelfthPct && (
                    <p className="field-error">{errors.twelfthPct}</p>
                  )}
                </label>
              </div>
            </div>

            <hr className="hr" />

            <span className="eyebrow">Why school marks</span>
            <p className="tiny" style={{ marginTop: 8 }}>
              Several companies still gate on them. Infosys publishes{" "}
              <b className="mono">65%</b> across all three levels and TCS{" "}
              <b className="mono">60%</b>. Better to know now than in final year.
            </p>

            <div className="card card--open" style={{ marginTop: 16 }}>
              <p className="tiny" style={{ margin: 0, color: "var(--p-ink-2)" }}>
                Only <b>active</b> backlogs count. Cleared ones barely matter.
              </p>
            </div>
          </>
        )}

        {/* ── Step 3 · target. One tap. ─────────────────────────────────── */}
        {step === 3 && (
          <>
            <h1 className="verdict v-lg">What are you aiming at?</h1>
            <p className="lede" style={{ marginBottom: 22 }}>
              A rough direction is plenty.
            </p>

            <div className="stack g10">
              {TARGET_SECTORS.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  className="route"
                  aria-pressed={target === s.code}
                  onClick={() => setTarget(s.code)}
                >
                  <span className="ic">{s.initials}</span>
                  <span className="tx">
                    <b>{s.label}</b>
                    <span>{s.detail}</span>
                  </span>
                </button>
              ))}
            </div>
            {errors.target && <p className="field-error">{errors.target}</p>}

            {countdown && (
              <div className="card" style={{ marginTop: 20 }}>
                <span className="eyebrow">What you have left</span>
                <div className="arith" style={{ marginTop: 8 }}>
                  <b>{countdown.weeks}</b> weeks to {countdown.deadlineLabel}
                  <br />
                  <b>{countdown.examWindows}</b> exam{" "}
                  {countdown.examWindows === 1 ? "window" : "windows"} in between
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer
        step={step}
        setStep={setStep}
        canAdvance={
          step === 1 ? Boolean(college) : step === 3 ? Boolean(target) : true
        }
        countdown={countdown}
      />
    </form>
  );
}

/**
 * The countdown is the resolve state, not a page (`docs/platform.md` §3.5).
 * It only appears while the server action is in flight, which is the one place
 * `docs/brand.md` §10.3 permits figures to move.
 */
function Footer({
  step,
  setStep,
  canAdvance,
  countdown,
}: {
  step: number;
  setStep: (n: number) => void;
  canAdvance: boolean;
  countdown?: Countdown;
}) {
  const { pending } = useFormStatus();

  if (pending) {
    return (
      <div
        className="wrap"
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--p-paper)",
          zIndex: 80,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 26,
        }}
        role="status"
        aria-live="polite"
      >
        <span className="eyebrow">Checking every recruiter on the list</span>
        {countdown && (
          <>
            <CountItem n={countdown.weeks} label={`weeks to ${countdown.deadlineLabel.toLowerCase()}`} />
            <CountItem
              n={countdown.examWindows}
              label={`exam ${countdown.examWindows === 1 ? "window" : "windows"}, already mapped`}
            />
            <CountItem
              n={countdown.usableHours}
              label="usable hours. More than it sounds."
              live
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="foot">
      {step > 1 && (
        <button
          type="button"
          className="btn btn--g btn--sm"
          onClick={() => setStep(step - 1)}
        >
          Back
        </button>
      )}
      {step < 3 ? (
        <button
          type="button"
          className="btn btn--p"
          onClick={() => setStep(step + 1)}
          aria-disabled={!canAdvance}
        >
          Next
        </button>
      ) : (
        <button type="submit" className="btn btn--o" aria-disabled={!canAdvance}>
          Show my companies
        </button>
      )}
    </div>
  );
}

function CountItem({
  n,
  label,
  live,
}: {
  n: number;
  label: string;
  live?: boolean;
}) {
  return (
    <div
      style={{
        borderLeft: `2px solid ${live ? "var(--p-open)" : "var(--p-line-2)"}`,
        paddingLeft: 15,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 40,
          fontWeight: 600,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          display: "block",
        }}
      >
        {n}
      </span>
      <span
        className="tiny"
        style={{ marginTop: 6, display: "block", fontSize: 13 }}
      >
        {label}
      </span>
    </div>
  );
}
