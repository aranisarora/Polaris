import type { CgpaBand, InterviewRecord } from "./types";

/**
 * The interview process corpus — asset 2 of `docs/product.md` §13.1.
 *
 * ## What this asset actually is, after looking
 *
 * `docs/research.md` §3.3 treats this as the underexploited layer: GfG asks
 * contributors for their college, the criteria that applied, how many were
 * selected, and whether they got in, so the company × college-tier layer should
 * fall out of a scrape. Reading the published articles, it does not. The
 * template asks; authors answer the parts that are fun to write — the rounds —
 * and skip the parts that identify them. Sampled TCS NQT experiences give a
 * precise round-by-round and state neither CGPA, nor college, nor backlogs.
 *
 * That splits the asset:
 *
 * - **Process records** scrape cleanly and are seeded here. They power the
 *   company pages and the "here is the round-by-round" half of §9.2.1.
 * - **Profile records** — tier, CGPA band, backlogs — do not scrape. They are
 *   the half that answers *can someone like me get in*, and they have to come
 *   from students, which is what `/contribute` exists for.
 *
 * The consequence for the product is deliberate and already designed: when no
 * profiled record matches, the ledger shows the "No exact match yet" state
 * rather than a record from a different tier. A story from a student two tiers
 * up is worse than no story, because the student can tell.
 */

export const INTERVIEW_RECORDS: InterviewRecord[] = [
  {
    id: "gfg-tcs-nqt-2025-digital",
    companySlug: "tcs-nqt",
    role: "Digital",
    year: 2025,
    campusType: "on-campus",
    outcome: "selected",
    hasProfile: false,
    provenance: "public-corpus",
    rounds: [
      {
        name: "Foundation round",
        topics: [
          "Verbal ability — 20–25 questions",
          "Numerical ability — 20 MCQs",
          "Logical ability — 20 MCQs",
        ],
      },
      {
        name: "Advanced round",
        minutes: 90,
        topics: ["Advanced aptitude — 15 questions", "Two DSA problems"],
      },
      {
        name: "Technical interview",
        topics: [
          "Internship discussed in depth",
          "Dataset analysis",
          "String compression, written live",
        ],
      },
      {
        name: "HR and managerial",
        topics: ["Relocation", "Why hire you", "Prior interviews"],
      },
    ],
    takeaway:
      "800 sat the drive at their college, 217 cleared to interview, 50 were put forward for the higher Digital profile. The technical round ran almost entirely on their own internship work rather than on textbook questions.",
    source: {
      label: "GeeksforGeeks — TCS Interview Experience, TCS NQT 2025",
      url: "https://www.geeksforgeeks.org/interview-experiences/tcs-interview-experience-tcs-nqt-2025/",
      checkedOn: "2026-08-02",
    },
  },
  {
    id: "gfg-tcs-nqt-oncampus-prime",
    companySlug: "tcs-nqt",
    role: "Prime",
    campusType: "on-campus",
    outcome: "selected",
    hasProfile: false,
    provenance: "public-corpus",
    rounds: [
      { name: "Document verification" },
      {
        name: "Technical interview",
        minutes: 20,
        topics: [
          "String vs StringBuilder",
          "Project walkthrough",
          "DBMS — first normal form",
          "Coding on paper",
        ],
      },
      {
        name: "Managerial round",
        topics: ["Project in detail", "Your specific role", "Questions off the CV"],
      },
      {
        name: "HR round",
        topics: [
          "Willingness to take Ninja instead of Digital",
          "10th, 12th and CGPA read back",
        ],
      },
    ],
    takeaway:
      "The technical round was twenty minutes and mostly about their own project — including being asked which part they personally wrote. HR read the 10th, 12th and CGPA back to them, which is the document check the registry's percentage gates exist to predict.",
    source: {
      label: "GeeksforGeeks — TCS NQT Interview Experience, on-campus drive",
      url: "https://www.geeksforgeeks.org/interview-experiences/tcs-nqt-interview-experience-on-campus-drive/",
      checkedOn: "2026-08-02",
    },
  },
];

export const CORPUS_VERSION = "corpus-2026.08.02";

export function cgpaBandOf(cgpa: number): CgpaBand {
  if (cgpa < 6.0) return "<6.0";
  if (cgpa < 6.5) return "6.0-6.5";
  if (cgpa < 7.0) return "6.5-7.0";
  if (cgpa < 7.5) return "7.0-7.5";
  if (cgpa < 8.0) return "7.5-8.0";
  return "8.0+";
}

const BAND_ORDER: CgpaBand[] = [
  "<6.0",
  "6.0-6.5",
  "6.5-7.0",
  "7.0-7.5",
  "7.5-8.0",
  "8.0+",
];

export function bandDistance(a: CgpaBand, b: CgpaBand): number {
  return Math.abs(BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b));
}

export function recordsForCompany(slug: string): InterviewRecord[] {
  return INTERVIEW_RECORDS.filter((r) => r.companySlug === slug);
}

/** How many records could answer "someone like me" if they matched. */
export const PROFILED_RECORD_COUNT = INTERVIEW_RECORDS.filter(
  (r) => r.hasProfile,
).length;

export const TOTAL_RECORD_COUNT = INTERVIEW_RECORDS.length;
