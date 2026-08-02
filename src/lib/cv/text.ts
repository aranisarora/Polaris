import "server-only";

/**
 * Getting text out of a CV file.
 *
 * Two formats cover essentially every file a third-year sends: a PDF exported
 * from Word, Canva or Overleaf, and LinkedIn's own *Save to PDF* — which
 * `docs/platform.md` §3.4 makes the entire LinkedIn intake route. DOCX is here
 * because a meaningful share of students hand over the .docx itself.
 *
 * Both libraries are pure JavaScript. That is a deployment constraint, not a
 * preference: a native binding (`pdf-parse` pulling in canvas, LibreOffice
 * shelling out) does not survive a serverless target, and the whole app is
 * built to run there.
 *
 * This module does not interpret anything. It returns the document's text and
 * an honest verdict on whether there was any. Meaning is `entities.ts`'s job.
 */

/** What the parser will accept, and what the bucket's MIME allowlist mirrors. */
export const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx"] as const;

/** 5 MB, matching the bucket's `file_size_limit`. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Below this, there is no CV in the file. A one-page fresher CV that has a
 * text layer runs to 250–600 words; a scan of one runs to zero. Forty is well
 * clear of both, so the message we show can be specific about which happened.
 */
const MIN_USABLE_WORDS = 40;

/**
 * The extraction is passed to a model, so it is bounded. Twelve thousand words
 * is far past any real CV — a student who hits this has pasted their whole
 * dissertation in, and the first pages are the ones that matter anyway.
 */
const MAX_WORDS = 12_000;

export type DocumentKind = "pdf" | "docx";

export type TextExtraction =
  | {
      ok: true;
      kind: DocumentKind;
      text: string;
      wordCount: number;
      pages: number | null;
      truncated: boolean;
    }
  | {
      ok: false;
      kind: DocumentKind | null;
      /** Shown to the student verbatim, so it says what to do next. */
      reason: string;
      /** For the analyses row — why a parse produced nothing. */
      code: "unsupported" | "empty" | "no-text-layer" | "corrupt";
    };

/**
 * Identify the format from the file's leading bytes rather than its extension
 * or its `Content-Type`, both of which are supplied by the client and neither
 * of which is reliable — Android file pickers routinely send
 * `application/octet-stream` for a perfectly good PDF.
 */
export function sniff(bytes: Uint8Array): DocumentKind | null {
  // "%PDF"
  if (
    bytes.length > 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "pdf";
  }

  // "PK\x03\x04" — a zip, which is what a DOCX is. Anything else zip-shaped
  // fails later in mammoth, which is the correct place for it to fail.
  if (
    bytes.length > 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    return "docx";
  }

  return null;
}

export async function extractDocumentText(
  buffer: ArrayBuffer,
): Promise<TextExtraction> {
  const bytes = new Uint8Array(buffer);
  const kind = sniff(bytes);

  if (!kind) {
    return {
      ok: false,
      kind: null,
      code: "unsupported",
      reason:
        "That file is not a PDF or a Word document. Export it as a PDF and try again.",
    };
  }

  let raw: string;
  let pages: number | null = null;

  try {
    if (kind === "pdf") {
      // Imported here rather than at module scope: unpdf carries a build of
      // PDF.js, and nothing else in the app should pay for it.
      const { extractText } = await import("unpdf");
      const result = await extractText(bytes, { mergePages: true });
      raw = result.text;
      pages = result.totalPages;
    } else {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(bytes),
      });
      raw = result.value;
    }
  } catch {
    return {
      ok: false,
      kind,
      code: "corrupt",
      reason:
        "We could not open that file. If it opens on your phone, try re-exporting it as a PDF.",
    };
  }

  const { text, wordCount, truncated } = normalise(raw);

  if (wordCount === 0) {
    return {
      ok: false,
      kind,
      code: "empty",
      reason: "There is no text in that file.",
    };
  }

  if (wordCount < MIN_USABLE_WORDS) {
    return {
      ok: false,
      kind,
      code: "no-text-layer",
      reason:
        kind === "pdf"
          ? "That PDF is a scan — an image of a page, with no text behind it. Nothing can read it, including the CV screeners companies use. Re-export it from the app you wrote it in."
          : "There is almost nothing in that document.",
    };
  }

  return { ok: true, kind, text, wordCount, pages, truncated };
}

/**
 * PDF text extraction produces ragged output: two-column layouts interleave,
 * ligatures arrive as private-use code points, and bullet glyphs come through
 * as whatever the font had at that slot. This tidies the whitespace and drops
 * characters that carry no information, and does nothing else — the line
 * structure is left alone, because on a CV it is a genuine signal about which
 * lines belong to which section.
 */
function normalise(raw: string): {
  text: string;
  wordCount: number;
  truncated: boolean;
} {
  const cleaned = raw
    .replace(/\r\n?/g, "\n")
    // Control characters, zero-width joiners, BOMs. Not soft hyphens, which
    // are meaningful mid-word.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200F\uFEFF]/g, "")
    // Collapse runs of spaces and tabs, but never across a newline.
    .replace(/[^\S\n]+/g, " ")
    // Three or more blank lines become one blank line.
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  const words = cleaned.length ? cleaned.split(/\s+/) : [];

  if (words.length <= MAX_WORDS) {
    return { text: cleaned, wordCount: words.length, truncated: false };
  }

  return {
    text: words.slice(0, MAX_WORDS).join(" "),
    wordCount: MAX_WORDS,
    truncated: true,
  };
}
