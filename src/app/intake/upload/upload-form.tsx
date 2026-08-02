"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Wordmark } from "@/components/brand";
import { uploadCv, type UploadState } from "./actions";

/**
 * The upload screen.
 *
 * `docs/platform.md` §3.4 makes this one of four first-class intake routes,
 * and §1.5 keeps desktop first-class for deep work — but the modal case is
 * still a student on a phone picking a file out of WhatsApp, so the control is
 * a plain `<input type="file">` with a large hit area rather than anything
 * clever. Drag-and-drop would be decoration here.
 *
 * The parse is shown back before the audit runs. `docs/brand.md` requires the
 * audit to name a student's actual projects, so a silent wrong parse is worse
 * than a visible thin one — this screen is where that gets caught.
 */
export function UploadForm({ source }: { source: string | null }) {
  const [state, action] = useActionState<UploadState, FormData>(uploadCv, {});
  const [filename, setFilename] = useState("");

  if (state.found) return <Found found={state.found} />;

  return (
    <form action={action} className="shell">
      {source ? <input type="hidden" name="source" value={source} /> : null}

      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">{source === "linkedin" ? "LinkedIn" : "Upload"}</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <h1 className="verdict v-lg">
          {source === "linkedin" ? "Send us the PDF." : "Send us your CV."}
        </h1>
        <p className="lede" style={{ marginTop: 10, marginBottom: 20 }}>
          PDF or Word. Whatever version you have — an old one is fine, and we
          would rather see it unedited.
        </p>

        <label
          className="route"
          style={{
            cursor: "pointer",
            minHeight: 76,
            alignItems: "center",
            // Anchors the visually-hidden input below.
            position: "relative",
          }}
        >
          <span className="ic">{filename ? "✓" : "+"}</span>
          <span className="tx">
            <b
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {filename || "Choose a file"}
            </b>
            <span>{filename ? "Tap to pick a different one" : "PDF or DOCX · up to 5 MB"}</span>
          </span>
          <input
            type="file"
            name="cv"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFilename(e.target.files?.[0]?.name ?? "")}
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        </label>

        {state.error && (
          <p className="field-error" style={{ marginTop: 12 }} role="alert">
            {state.error}
          </p>
        )}

        <div className="card card--open" style={{ marginTop: 20 }}>
          <span className="eyebrow" style={{ color: "var(--p-open)" }}>
            Why we keep the file
          </span>
          <p className="tiny" style={{ marginTop: 8, color: "var(--p-ink-2)" }}>
            The original is stored permanently alongside whatever we read out of
            it. If our reader has a bug, your data is still there to re-read —
            and only you can open it.
          </p>
        </div>

        <p className="tiny" style={{ marginTop: 16 }}>
          Your marks are not taken from this file. Those are the numbers you
          typed, and nothing here changes them.
        </p>
      </main>

      <Footer hasFile={Boolean(filename)} />
    </form>
  );
}

/**
 * Reading a CV takes a few seconds, so the wait gets a resolve state rather
 * than a spinner — the same move `docs/platform.md` §3.5 makes with the
 * countdown, for the same reason.
 */
function Footer({ hasFile }: { hasFile: boolean }) {
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
          gap: 18,
        }}
        role="status"
        aria-live="polite"
      >
        <span className="eyebrow">Reading your CV</span>
        <p className="verdict v-md">
          Pulling out your projects, skills and certificates.
        </p>
        <p className="tiny" style={{ maxWidth: 380 }}>
          We are reading what you wrote, not rewriting it. You will see exactly
          what we found before anything else happens.
        </p>
      </div>
    );
  }

  return (
    <div className="foot">
      <Link href="/intake" className="btn btn--g btn--sm">
        Back
      </Link>
      <button type="submit" className="btn btn--o" aria-disabled={!hasFile}>
        Read my CV
      </button>
    </div>
  );
}

/** What the parse found, shown before it is allowed to shape the audit. */
function Found({ found }: { found: NonNullable<UploadState["found"]> }) {
  const empty =
    found.projects.length === 0 &&
    found.skills.length === 0 &&
    found.certifications.length === 0;

  return (
    <div className="shell">
      <header className="top">
        <Wordmark href="/" />
        <span className="sp" />
        <span className="tr">Upload</span>
      </header>

      <main className="wrap" style={{ flex: 1, paddingTop: 20, paddingBottom: 28 }}>
        <h1 className="verdict v-lg">
          {empty ? "We read it, and found very little." : "Here is what we read."}
        </h1>

        {found.note && (
          <div
            className={found.degraded ? "card card--fix" : "card card--open"}
            style={{ marginTop: 16 }}
          >
            <p className="tiny" style={{ margin: 0, color: "var(--p-ink-2)" }}>
              {found.note}
            </p>
          </div>
        )}

        {found.projects.length > 0 && (
          <section style={{ marginTop: 22 }}>
            <span className="eyebrow">
              {found.projects.length} project
              {found.projects.length === 1 ? "" : "s"}
            </span>
            <div className="rows" style={{ marginTop: 8 }}>
              {found.projects.map((title, i) => (
                <div key={`${title}-${i}`} className="row">
                  <span className="row-t">{title}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {found.skills.length > 0 && (
          <section style={{ marginTop: 22 }}>
            <span className="eyebrow">
              {found.skills.length} skill{found.skills.length === 1 ? "" : "s"}
            </span>
            <div className="chips" style={{ marginTop: 8 }}>
              {found.skills.map((s, i) => (
                <span key={`${s}-${i}`} className="chip">
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {found.certifications.length > 0 && (
          <section style={{ marginTop: 22 }}>
            <span className="eyebrow">
              {found.certifications.length} certificate
              {found.certifications.length === 1 ? "" : "s"}
            </span>
            <div className="rows" style={{ marginTop: 8 }}>
              {found.certifications.map((name, i) => (
                <div key={`${name}-${i}`} className="row">
                  <span className="row-t">{name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(found.education > 0 || found.experience > 0) && (
          <p className="tiny" style={{ marginTop: 20 }}>
            Also saved: {found.education} education{" "}
            {found.education === 1 ? "entry" : "entries"} and {found.experience}{" "}
            {found.experience === 1 ? "role" : "roles"}.
          </p>
        )}

        <hr className="hr" />

        <p className="tiny">
          Missing something, or read wrong? The six questions ask directly, and
          take about two minutes. Nothing you add there overwrites this.
        </p>
      </main>

      <div className="foot">
        <Link href="/intake/six" className="btn btn--g btn--sm">
          Six questions
        </Link>
        <Link href="/signal" className="btn btn--o">
          {empty ? "Audit me anyway" : "See my audit"}
        </Link>
      </div>
    </div>
  );
}
