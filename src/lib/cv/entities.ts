import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * CV text → structured entities (`docs/product.md` §12.3).
 *
 * ── Why a model reads this, and why that is not a breach of Hard Rule 2 ──────
 *
 * Rule 2 is *"the LLM is never the source of a fact."* Facts — cutoffs, dates,
 * eligibility criteria, what a company requires — come from the database, and
 * the model reasons over retrieved rows. That rule is intact here, because the
 * model is not being asked for a fact about the world. It is reading the
 * student's own document and structuring what the student already wrote. The
 * same category as the audit's prose, not the registry's numbers.
 *
 * The rule is held structurally rather than by instruction, in three places:
 *
 *   1. **No number this produces can reach the ledger.** The schema below has
 *      no field for CGPA, for 10th or 12th percentage, for backlogs, for any
 *      figure the eligibility engine consumes. A hallucinated grade has
 *      nowhere to land. Those seven numbers enter the system exactly once —
 *      typed by the student in `/check` — and `StudentRecord` is their only
 *      home. A parser that could overwrite them would make every arithmetic
 *      guarantee in `docs/product.md` §9.2 a lie.
 *
 *   2. **`proctored` is decided here, not by the model.** Whether a
 *      certificate carries weight is a criterion (§11.4: AWS, Azure, GCP,
 *      NPTEL, and nothing else), and criteria are ours. The model transcribes
 *      the certificate's *name*; the list below classifies it.
 *
 *   3. **The original outlives the parse.** §12.4 — the file and its extracted
 *      text are written to `raw_inputs` before this function is called, so a
 *      bad extraction is always re-runnable and never destroys anything.
 *
 * Which prompt and which model read a given student's CV is recorded per
 * §12.5, because "did the new prompt parse better?" cannot be answered
 * retroactively.
 *
 * ── Why not heuristics ──────────────────────────────────────────────────────
 *
 * Section-header matching is the obvious cheap approach and it fails on
 * exactly this population. An Indian fresher CV might head its projects
 * "PROJECTS", "Academic Projects", "Mini Project", "Work Samples", or nothing
 * at all; two-column templates interleave when flattened to text; the modal
 * document is a Canva template with the headings set as images. A heuristic
 * parser is not merely less accurate here, it is confidently wrong in ways
 * that are invisible — and the audit's credibility rests on naming the
 * student's actual projects back to them.
 *
 * The heuristic path at the bottom of this file exists anyway, for when no API
 * key is configured. It is deliberately timid, and it says so.
 */

export const CV_PROMPT_VERSION = "cv-extract-2026.08.02";

/** Overridable so a model change is config, not a deploy. */
export const CV_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

/**
 * Optional on purpose, exactly as `lib/supabase/env.ts` treats the database.
 * A missing key must degrade to a worse parse with an honest message, never a
 * 500 — the student is four minutes into knowing we exist.
 */
export const hasAnthropic = Boolean(ANTHROPIC_API_KEY);

// ─── What comes out ─────────────────────────────────────────────────────────

export type CvProject = {
  title: string;
  blurb?: string;
  deployedUrl?: string;
  repoUrl?: string;
  technologies?: string[];
};

export type CvEducation = {
  institution?: string;
  qualification?: string;
  field?: string;
  /** A year, as printed. Never a grade — see the header. */
  years?: string;
};

export type CvExperience = {
  organisation?: string;
  role?: string;
  summary?: string;
  period?: string;
};

export type CvCertification = {
  name: string;
  issuer?: string;
  /** Ours, not the model's. */
  proctored: boolean;
};

export type ExtractedCv = {
  projects: CvProject[];
  skills: string[];
  certifications: CvCertification[];
  education: CvEducation[];
  experience: CvExperience[];
  /** Links found anywhere in the document — GitHub, LeetCode, a portfolio. */
  links: string[];
};

export type ExtractionMethod = "model" | "heuristic";

export type ExtractionResult = {
  entities: ExtractedCv;
  method: ExtractionMethod;
  /** Goes into `analyses.engine_version` (§12.5). */
  version: string;
  /** True when the model was unavailable or failed and we fell back. */
  degraded: boolean;
  /** Rendered to the student when degraded, so the screen is not silent. */
  note?: string;
};

const EMPTY: ExtractedCv = {
  projects: [],
  skills: [],
  certifications: [],
  education: [],
  experience: [],
  links: [],
};

// ─── Caps ───────────────────────────────────────────────────────────────────

// A CV with more than this is padded, and padding is itself an audit finding —
// but the finding is the audit's to make, so we simply stop reading rather
// than letting an unbounded array through to the database.
const MAX = {
  projects: 12,
  skills: 40,
  certifications: 12,
  education: 6,
  experience: 8,
  links: 20,
  title: 160,
  blurb: 1200,
  short: 200,
  url: 500,
} as const;

// ─── §11.4 — the only certifications that carry weight ──────────────────────

/**
 * Proctored, verifiable by credential ID or badge URL, and worth real standing
 * in this market. Everything else is a completion certificate. This list is
 * the criterion, so it lives in our code and not in a prompt.
 */
const PROCTORED_PATTERNS: RegExp[] = [
  /\baws\b|\bamazon web services\b/i,
  /\bazure\b|\bmicrosoft certified\b/i,
  /\bgcp\b|\bgoogle cloud\b/i,
  /\bnptel\b/i,
];

function isProctored(name: string, issuer?: string): boolean {
  const haystack = `${name} ${issuer ?? ""}`;
  // "AWS course on Udemy" is a completion certificate wearing a good name.
  if (/\budemy\b|\bcoursera\b|\bgreat learning\b|\bsimplilearn\b/i.test(haystack)) {
    return false;
  }
  return PROCTORED_PATTERNS.some((p) => p.test(haystack));
}

// ─── The prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a document parser. You convert the text of a CV into structured data.

You are reading CVs written by third-year engineering students in India, mostly from tier-2 and tier-3 colleges. Their layouts vary enormously. Headings may be missing, unconventional ("Mini Project", "Work Samples", "Academic Exposure"), or lost entirely because the original was a two-column template or an image-based design. Sections may appear in any order. Do not expect a standard structure and do not require one.

Your single rule: TRANSCRIBE, NEVER INFER.

- If something is not in the document, it does not go in the output. Leave the field out and leave the array empty.
- Never invent a project, a skill, a date, a company or a technology.
- Never improve, rewrite or professionalise the student's wording. Copy their phrasing for descriptions, trimmed of bullet characters and fixed only for extraction artefacts like a word split across a line break. If they wrote "made a website for food ordering using html css js", that is what you return. A polished rewrite destroys the only honest read of this document that anyone will ever get.
- Never merge two projects into one, and never split one into two.
- Never guess a URL. Only return a URL that appears in the text.
- If the document is not a CV at all, return empty arrays.

Notes on specific fields:

- projects: anything the student presents as something they built — coursework, clones, half-finished things, hackathon entries. Include all of them. The "blurb" is their own description.
- skills: individual named skills as listed. Split comma-separated and bullet lists into separate entries. Do not add skills implied by a project.
- certifications: the certificate name as printed, and the issuing body if stated. Do not assess the certificate's value; that is decided elsewhere.
- education: institution, qualification and field as printed. Do NOT return grades, percentages, CGPA or marks of any kind — those are collected separately and are not your concern.
- experience: internships, part-time work, freelance, campus roles.
- links: every URL in the document, exactly as printed.`;

const TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    projects: {
      type: "array",
      description: "Everything the student presents as something they built.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "The project's name as printed." },
          blurb: {
            type: "string",
            description: "The student's own description, verbatim.",
          },
          deployedUrl: {
            type: "string",
            description: "A live URL, only if one appears in the document.",
          },
          repoUrl: {
            type: "string",
            description: "A source repository URL, only if one appears.",
          },
          technologies: {
            type: "array",
            items: { type: "string" },
            description: "Technologies named for this specific project.",
          },
        },
        required: ["title"],
      },
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description: "Named skills as listed, one per entry.",
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
        },
        required: ["name"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          qualification: { type: "string" },
          field: { type: "string" },
          years: { type: "string", description: "Years as printed. Never grades." },
        },
      },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          organisation: { type: "string" },
          role: { type: "string" },
          summary: { type: "string" },
          period: { type: "string" },
        },
      },
    },
    links: {
      type: "array",
      items: { type: "string" },
      description: "Every URL in the document, as printed.",
    },
  },
  required: ["projects", "skills", "certifications", "education", "experience", "links"],
};

// ─── Entry point ────────────────────────────────────────────────────────────

export async function extractEntities(text: string): Promise<ExtractionResult> {
  if (!hasAnthropic) {
    return {
      entities: heuristicExtract(text),
      method: "heuristic",
      version: `${CV_PROMPT_VERSION}+heuristic`,
      degraded: true,
      note: "We read your file with a simple parser, so it may have missed things. Check what we found below.",
    };
  }

  try {
    const entities = await modelExtract(text);
    return {
      entities,
      method: "model",
      version: `${CV_PROMPT_VERSION}+${CV_MODEL}`,
      degraded: false,
    };
  } catch {
    // A parse is not worth losing the student over. The file and its text are
    // already in `raw_inputs`, so this is recoverable by re-running later.
    return {
      entities: heuristicExtract(text),
      method: "heuristic",
      version: `${CV_PROMPT_VERSION}+heuristic`,
      degraded: true,
      note: "Our reader was unavailable, so we fell back to a simpler parse. Your file is saved — we can re-read it properly later.",
    };
  }
}

async function modelExtract(text: string): Promise<ExtractedCv> {
  const client = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
    maxRetries: 2,
    // The student is watching a spinner. Past this, the fallback is kinder.
    timeout: 60_000,
  });

  const message = await client.messages.create({
    model: CV_MODEL,
    max_tokens: 8192,
    // Transcription, not composition. Nothing here should vary between runs.
    temperature: 0,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "record_cv",
        description: "Record the structured contents of the CV.",
        input_schema: TOOL_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "record_cv" },
    messages: [
      {
        role: "user",
        content: `Here is the text extracted from a student's CV. Transcribe it into the record_cv tool.\n\n<cv>\n${text}\n</cv>`,
      },
    ],
  });

  const block = message.content.find((c) => c.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Model returned no tool_use block");
  }

  return coerce(block.input);
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Everything the model returns is treated as untrusted input, because a schema
 * declared to a model is a request rather than a guarantee. Anything malformed
 * is dropped rather than repaired — a half-understood project is worse than a
 * missing one, since the audit quotes these back to the student by name.
 */
function coerce(input: unknown): ExtractedCv {
  if (!input || typeof input !== "object") return EMPTY;
  const o = input as Record<string, unknown>;

  const projects = arr(o.projects)
    .map((raw): CvProject | null => {
      if (!raw || typeof raw !== "object") return null;
      const p = raw as Record<string, unknown>;
      const title = str(p.title, MAX.title);
      if (!title) return null;
      return {
        title,
        blurb: str(p.blurb, MAX.blurb) || undefined,
        deployedUrl: url(p.deployedUrl),
        repoUrl: url(p.repoUrl),
        technologies: arr(p.technologies)
          .map((t) => str(t, MAX.short))
          .filter(Boolean)
          .slice(0, MAX.skills),
      };
    })
    .filter((p): p is CvProject => p !== null)
    .slice(0, MAX.projects);

  const skills = dedupe(
    arr(o.skills)
      .map((s) => str(s, MAX.short))
      .filter(Boolean),
  ).slice(0, MAX.skills);

  const certifications = arr(o.certifications)
    .map((raw): CvCertification | null => {
      if (!raw || typeof raw !== "object") return null;
      const c = raw as Record<string, unknown>;
      const name = str(c.name, MAX.short);
      if (!name) return null;
      const issuer = str(c.issuer, MAX.short) || undefined;
      // Decided here, never by the model. See the header.
      return { name, issuer, proctored: isProctored(name, issuer) };
    })
    .filter((c): c is CvCertification => c !== null)
    .slice(0, MAX.certifications);

  const education = arr(o.education)
    .map((raw): CvEducation | null => {
      if (!raw || typeof raw !== "object") return null;
      const e = raw as Record<string, unknown>;
      const row: CvEducation = {
        institution: str(e.institution, MAX.short) || undefined,
        qualification: str(e.qualification, MAX.short) || undefined,
        field: str(e.field, MAX.short) || undefined,
        years: str(e.years, 40) || undefined,
      };
      // Any grade the model returned despite instruction is dropped on the
      // floor here, not stored and ignored. The seven numbers have one source.
      return Object.values(row).some(Boolean) ? row : null;
    })
    .filter((e): e is CvEducation => e !== null)
    .slice(0, MAX.education);

  const experience = arr(o.experience)
    .map((raw): CvExperience | null => {
      if (!raw || typeof raw !== "object") return null;
      const x = raw as Record<string, unknown>;
      const row: CvExperience = {
        organisation: str(x.organisation, MAX.short) || undefined,
        role: str(x.role, MAX.short) || undefined,
        summary: str(x.summary, MAX.blurb) || undefined,
        period: str(x.period, 60) || undefined,
      };
      return Object.values(row).some(Boolean) ? row : null;
    })
    .filter((x): x is CvExperience => x !== null)
    .slice(0, MAX.experience);

  const links = dedupe(
    arr(o.links)
      .map((l) => url(l))
      .filter((l): l is string => Boolean(l)),
  ).slice(0, MAX.links);

  return { projects, skills, certifications, education, experience, links };
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().replace(/\s+/g, " ").slice(0, max);
}

/**
 * Only http(s), and only if it parses. A `javascript:` or `data:` URL reaching
 * an `href` on the audit screen is the obvious way this becomes a security
 * problem rather than a parsing one.
 */
function url(v: unknown): string | undefined {
  const raw = str(v, MAX.url);
  if (!raw) return undefined;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

// ─── The fallback ───────────────────────────────────────────────────────────

/**
 * What a parser can do without a model, which is not much.
 *
 * It looks for a handful of section headings and takes the lines beneath them.
 * On a conventionally-laid-out CV this is decent; on the Canva template that
 * half this population uses, it finds nothing. That is the honest outcome, and
 * `degraded: true` makes the screen say so rather than presenting a thin parse
 * as a complete one.
 *
 * It deliberately does not guess project descriptions. A wrong blurb read back
 * to a student destroys trust faster than an absent one.
 */
function heuristicExtract(text: string): ExtractedCv {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[\s•▪◦*\-–—·]+/, "").trim())
    .filter(Boolean);

  const HEADINGS: Record<string, RegExp> = {
    projects: /^(academic\s+|mini\s+|major\s+|personal\s+)?projects?\b|^work\s+samples?\b/i,
    skills: /^(technical\s+|key\s+)?skills?\b|^technolog(y|ies)\b|^tech\s+stack\b/i,
    certifications: /^certificat(e|es|ions?)\b|^courses?\b|^training\b/i,
    education: /^education\b|^academics?\b|^qualifications?\b/i,
    experience: /^(work\s+)?experience\b|^internships?\b|^employment\b/i,
  };

  const OTHER_HEADING =
    /^(summary|objective|profile|achievements?|awards?|hobbies|interests|activities|languages|references|declaration|personal\s+details?|contact)\b/i;

  const sections: Record<string, string[]> = {
    projects: [],
    skills: [],
    certifications: [],
    education: [],
    experience: [],
  };

  let current: string | null = null;

  for (const line of lines) {
    // A heading is short. "Projects I built during my third year at..." is a
    // sentence that happens to start with the word.
    const isShort = line.length <= 40;
    const matched = isShort
      ? Object.keys(HEADINGS).find((k) => HEADINGS[k].test(line))
      : undefined;

    if (matched) {
      current = matched;
      continue;
    }
    if (isShort && OTHER_HEADING.test(line)) {
      current = null;
      continue;
    }
    if (current) sections[current].push(line);
  }

  const skills = dedupe(
    sections.skills
      .flatMap((l) => l.split(/[,;|•·]/))
      .map((s) => str(s.replace(/^[a-z\s]*:/i, ""), MAX.short))
      .filter((s) => s.length > 1 && s.length < 40),
  ).slice(0, MAX.skills);

  // Only lines that read like a title, because a wrong project name read back
  // to a student is worse than a missing one — the audit quotes these.
  //
  // A title starts with a capital or a digit and is a handful of words:
  // "Food Delivery Clone". A description is a sentence and usually starts
  // lower-case mid-flow: "built a food ordering website using html css js".
  // The lower-case test does most of the work, because students write their
  // descriptions as continuations rather than sentences.
  const projects = sections.projects
    .filter((l) => {
      if (l.length < 3 || l.length > 70) return false;
      if (!/^[A-Z0-9]/.test(l)) return false;
      if (/[.,;:]$|\.\s/.test(l)) return false;
      if (l.split(/\s+/).length > 7) return false;
      // A line that is mostly a URL is a link, not a title.
      return !/https?:\/\//i.test(l);
    })
    .map((l) => ({ title: str(l, MAX.title) }))
    .filter((p) => p.title.length > 0)
    .slice(0, MAX.projects);

  const certifications = sections.certifications
    .filter((l) => l.length >= 3 && l.length <= 120)
    .map((l) => {
      const name = str(l, MAX.short);
      return { name, proctored: isProctored(name) };
    })
    .slice(0, MAX.certifications);

  // Three shapes, because students write all three: a full URL, a www-prefixed
  // host, and — most commonly, and the one that matters most — a bare
  // "github.com/handle" with no scheme at all.
  const LINK_RE =
    /https?:\/\/[^\s<>()"']+|www\.[^\s<>()"']+|[a-z0-9-]+(?:\.[a-z0-9-]+)+\/[^\s<>()"']+/gi;

  const links = dedupe(
    (text.match(LINK_RE) ?? [])
      // An email address matches the bare-host branch through its domain.
      .filter((l) => !l.includes("@"))
      .map((l) => url(l))
      .filter((l): l is string => Boolean(l)),
  ).slice(0, MAX.links);

  return {
    projects,
    skills,
    certifications,
    // Left empty on purpose. Splitting an education or experience block into
    // fields without a model produces plausible nonsense, and these two feed
    // the CV surface directly.
    education: [],
    experience: [],
    links,
  };
}
