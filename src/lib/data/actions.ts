import type { Action } from "./types";

/**
 * The action catalogue — asset 5 of `docs/product.md` §13.1.
 *
 * Hand-authored. Each item is tagged with effort, lead time, evidence value,
 * prerequisites and deadline sensitivity, which is what lets the scheduler in
 * `src/lib/engine/roadmap.ts` sequence them under a real calendar rather than
 * printing a list.
 *
 * ## Two rules that shaped every entry
 *
 * §11.3: tasks are sized to one week. "Build a project" is not a task; "push
 * the schema and first commit" is. Anything here that looks like a milestone
 * has been split until each piece fits inside a week.
 *
 * Hard Rule 5 (§8): do not manufacture generic candidates. If this catalogue
 * outputs "300 LeetCode problems and a CRUD app" it is producing exactly the
 * profile the market is rejecting. So volume actions are capped and the
 * differentiating project carries the highest `evidenceValue` in the file.
 *
 * Hard Rule 4: track outputs, not inputs. Every `doneMeans` entry names an
 * artefact, never an hour count.
 */

export const ACTIONS: Action[] = [
  // ── Eligibility repair · gates everything else ──────────────────────────
  {
    slug: "register-supplementary",
    title: "Register for the next backlog attempt",
    category: "eligibility",
    effortHours: 0.5,
    leadTimeWeeks: 0,
    evidenceValue: 5,
    deadlineSensitive: true,
    anchor: "before-supplementary",
    prerequisites: [],
    verifyVia: "self",
    doneMeans: [
      { label: "Registered through the college exam section", via: "self" },
      { label: "Fee paid and receipt kept", via: "self" },
    ],
    whyNow:
      "Registration closes weeks before the exam does, and missing it costs a whole semester of eligibility rather than a whole exam. Half an hour, and it is the only task on this list where being late cannot be recovered.",
  },
  {
    slug: "clear-backlog-subject",
    title: "Clear one backlog subject",
    category: "eligibility",
    effortHours: 30,
    leadTimeWeeks: 8,
    evidenceValue: 5,
    deadlineSensitive: true,
    anchor: "at-supplementary",
    prerequisites: ["register-supplementary"],
    verifyVia: "marksheet",
    doneMeans: [
      { label: "Result shows the subject cleared", via: "marksheet" },
      { label: "Marksheet uploaded so the ledger recomputes", via: "marksheet" },
    ],
    whyNow:
      "An active backlog is a binary gate on more companies than any other single fact about you, and it is the only gate that a fixed number of hours reliably moves. Nothing else on this list opens as many doors per hour spent.",
  },
  {
    slug: "cgpa-semester-target",
    title: "Hit this semester's SGPA target",
    category: "eligibility",
    effortHours: 60,
    leadTimeWeeks: 16,
    evidenceValue: 4,
    deadlineSensitive: true,
    anchor: "at-exam",
    prerequisites: [],
    verifyVia: "marksheet",
    doneMeans: [
      { label: "Semester result published", via: "marksheet" },
      { label: "Marksheet uploaded", via: "marksheet" },
    ],
    whyNow:
      "CGPA is only movable while semesters remain, and each one that passes raises the average the remaining ones have to carry. The arithmetic gets harder every six months you wait, and at some point it stops being reachable at all.",
  },
  {
    slug: "upload-marksheet",
    title: "Upload the new marksheet",
    category: "eligibility",
    effortHours: 0.2,
    leadTimeWeeks: 0,
    evidenceValue: 3,
    deadlineSensitive: false,
    anchor: "after-results",
    prerequisites: [],
    verifyVia: "marksheet",
    doneMeans: [
      { label: "Marksheet file uploaded", via: "marksheet" },
      { label: "CGPA and backlog count confirmed", via: "marksheet" },
    ],
    whyNow:
      "Every company in your ledger is re-checked against the new numbers the moment this lands. This is the task that produces the re-shock.",
  },

  // ── Aptitude · underrated, highest ROI ──────────────────────────────────
  {
    slug: "aptitude-baseline",
    title: "Sit 60 aptitude questions, timed",
    category: "aptitude",
    effortHours: 3,
    leadTimeWeeks: 0,
    evidenceValue: 2,
    deadlineSensitive: false,
    prerequisites: [],
    verifyVia: "self",
    doneMeans: [
      { label: "60 questions attempted under a clock", via: "self" },
      { label: "Score recorded, by section", via: "self" },
    ],
    whyNow:
      "The aptitude round is where the 'employable but not hired' gap actually shows up, and it is pure practice. You cannot plan the practice until you know which of the three sections is costing you the marks.",
  },
  {
    slug: "aptitude-quant-drill",
    title: "Quantitative drill — one topic to accuracy",
    category: "aptitude",
    effortHours: 5,
    leadTimeWeeks: 1,
    evidenceValue: 2,
    deadlineSensitive: false,
    prerequisites: ["aptitude-baseline"],
    verifyVia: "self",
    doneMeans: [
      { label: "One topic taken to 80% accuracy under time", via: "self" },
    ],
    whyNow:
      "Quant is the section that rewards repetition most and decays least. One topic at a time beats a broad sweep, because the test is scored on accuracy under a clock rather than coverage.",
  },
  {
    slug: "aptitude-logical-drill",
    title: "Logical reasoning drill",
    category: "aptitude",
    effortHours: 5,
    leadTimeWeeks: 1,
    evidenceValue: 2,
    deadlineSensitive: false,
    prerequisites: ["aptitude-baseline"],
    verifyVia: "self",
    doneMeans: [{ label: "Two full sections under time", via: "self" }],
    whyNow:
      "Reasoning questions repeat in shape across every company on your list. The patterns are finite, and recognising one instantly is worth more than solving it well slowly.",
  },
  {
    slug: "aptitude-full-mock",
    title: "Full mock, exam conditions",
    category: "aptitude",
    effortHours: 3,
    leadTimeWeeks: 1,
    evidenceValue: 3,
    deadlineSensitive: false,
    prerequisites: ["aptitude-quant-drill", "aptitude-logical-drill"],
    verifyVia: "self",
    doneMeans: [
      { label: "Full paper, single sitting, no pauses", via: "self" },
      { label: "Section scores compared against the baseline", via: "self" },
    ],
    whyNow:
      "Sectional practice does not test the thing that actually fails on the day, which is pacing across the whole paper.",
  },

  // ── DSA · against the target company's real bar ─────────────────────────
  {
    slug: "dsa-arrays-strings",
    title: "Arrays and strings — 20 problems",
    category: "dsa",
    effortHours: 10,
    leadTimeWeeks: 2,
    evidenceValue: 3,
    deadlineSensitive: false,
    prerequisites: [],
    verifyVia: "leetcode",
    doneMeans: [
      { label: "20 problems solved", via: "leetcode" },
      { label: "At least 8 of them medium", via: "leetcode" },
    ],
    whyNow:
      "Every coding round on your list opens here. The companies in your open set set arrays-and-strings problems at medium; that is the bar to clear first.",
  },
  {
    slug: "dsa-move-to-mediums",
    title: "Shift the mix to mediums",
    category: "dsa",
    effortHours: 12,
    leadTimeWeeks: 3,
    evidenceValue: 4,
    deadlineSensitive: false,
    prerequisites: ["dsa-arrays-strings"],
    verifyVia: "leetcode",
    doneMeans: [
      { label: "25 mediums solved", via: "leetcode" },
      { label: "Medium share of the total above 40%", via: "leetcode" },
    ],
    whyNow:
      "An easy-heavy profile predicts nothing about the rounds you will actually sit. This is the same minutes per day against a different list.",
    produces: [{ kind: "skill", hint: "Data structures and algorithms" }],
  },
  {
    slug: "dsa-hashing-two-pointers",
    title: "Hashing and two pointers — 15 problems",
    category: "dsa",
    effortHours: 8,
    leadTimeWeeks: 2,
    evidenceValue: 3,
    deadlineSensitive: false,
    prerequisites: ["dsa-arrays-strings"],
    verifyVia: "leetcode",
    doneMeans: [{ label: "15 problems solved", via: "leetcode" }],
    whyNow:
      "The two patterns that convert a brute-force answer into an accepted one most often. Interviewers are watching for whether you reach for them unprompted.",
  },
  {
    slug: "dsa-trees-graphs",
    title: "Trees and graphs — 15 problems",
    category: "dsa",
    effortHours: 12,
    leadTimeWeeks: 3,
    evidenceValue: 4,
    deadlineSensitive: false,
    prerequisites: ["dsa-move-to-mediums"],
    verifyVia: "leetcode",
    doneMeans: [
      { label: "15 problems solved", via: "leetcode" },
      { label: "Traversals written from memory", via: "self" },
    ],
    whyNow:
      "Where the product and GCC rounds separate from the services rounds. If your reach set matters to you, this is the block that decides it.",
  },
  {
    slug: "dsa-timed-contest",
    title: "Sit one timed contest",
    category: "dsa",
    effortHours: 2,
    leadTimeWeeks: 1,
    evidenceValue: 3,
    deadlineSensitive: false,
    prerequisites: ["dsa-move-to-mediums"],
    verifyVia: "leetcode",
    doneMeans: [{ label: "One rated contest entered", via: "leetcode" }],
    whyNow:
      "Solving well with unlimited time is a different skill from solving under ninety minutes with a leaderboard moving. Only one of them is tested.",
  },

  // ── The one differentiated project · the signal fix ─────────────────────
  {
    slug: "project-choose-problem",
    title: "Pick a problem someone actually has",
    category: "project",
    effortHours: 2,
    leadTimeWeeks: 1,
    evidenceValue: 5,
    deadlineSensitive: false,
    prerequisites: [],
    verifyVia: "self",
    doneMeans: [
      { label: "Problem written down in three lines", via: "self" },
      { label: "The person who has it is named", via: "self" },
    ],
    whyNow:
      "Every generic project on a CV started by picking a stack instead of a problem. Two hours here is what separates the next eighty from being another clone. Pick something on your own campus — the mess menu, the lab slot allocation, the bus timings. Small and real beats large and imaginary.",
  },
  {
    slug: "project-schema-first-commit",
    title: "Push the schema and first commit",
    category: "project",
    effortHours: 0.7,
    leadTimeWeeks: 0,
    evidenceValue: 4,
    deadlineSensitive: false,
    prerequisites: ["project-choose-problem"],
    verifyVia: "github",
    doneMeans: [
      { label: "Repo created and public", via: "github" },
      {
        label: "Schema file committed",
        via: "github",
        detail: ".sql / .prisma / migrations/",
      },
      {
        label: "README states the problem in three lines",
        via: "github",
        detail: "Read by the audit",
      },
    ],
    whyNow:
      "The cheapest meaningful win available to you. Forty minutes starts a real commit history, and every week after it compounds — which is the thing an interviewer is actually reading when they open your GitHub.",
    produces: [
      { kind: "project", hint: "Schema and repository for the new project" },
      { kind: "skill", hint: "Schema design" },
    ],
  },
  {
    slug: "project-core-loop",
    title: "Build the one thing it has to do",
    category: "project",
    effortHours: 10,
    leadTimeWeeks: 2,
    evidenceValue: 5,
    deadlineSensitive: false,
    prerequisites: ["project-schema-first-commit"],
    verifyVia: "github",
    doneMeans: [
      { label: "The core path works end to end", via: "github" },
      { label: "Commits spread across at least eight days", via: "github" },
    ],
    whyNow:
      "One path working completely is worth more than five started. It is also the only version you can demonstrate in an interview without apologising for something.",
    produces: [{ kind: "project", hint: "Working core feature" }],
  },
  {
    slug: "project-real-data",
    title: "Put real data behind it",
    category: "project",
    effortHours: 8,
    leadTimeWeeks: 2,
    evidenceValue: 4,
    deadlineSensitive: false,
    prerequisites: ["project-core-loop"],
    verifyVia: "github",
    doneMeans: [
      { label: "Real records, not seeded dummies", via: "github" },
      { label: "Migrations committed", via: "github" },
    ],
    whyNow:
      "Dummy data hides every problem worth solving — duplicates, missing fields, things that do not fit the schema you designed in week one. Real data is where the interview material comes from.",
    produces: [{ kind: "skill", hint: "Data modelling" }],
  },
  {
    slug: "project-second-path",
    title: "Handle the case you skipped",
    category: "project",
    effortHours: 8,
    leadTimeWeeks: 2,
    evidenceValue: 4,
    deadlineSensitive: false,
    prerequisites: ["project-core-loop"],
    verifyVia: "github",
    doneMeans: [
      { label: "The obvious failure case is handled", via: "github" },
      { label: "One test covering it", via: "github" },
    ],
    whyNow:
      "Every tutorial project stops at the happy path, and every interviewer's second question is about the other one. This is the cheapest way to have an answer.",
  },
  {
    slug: "project-deploy",
    title: "Deploy it where a stranger can open it",
    category: "project",
    effortHours: 4,
    leadTimeWeeks: 1,
    evidenceValue: 5,
    deadlineSensitive: false,
    prerequisites: ["project-core-loop"],
    verifyVia: "github",
    doneMeans: [
      { label: "Public URL that loads", via: "self" },
      { label: "Link in the README and on the CV", via: "github" },
    ],
    whyNow:
      "A running URL cannot be exaggerated, which is exactly why it outweighs three described projects. Free tiers are enough.",
    produces: [{ kind: "skill", hint: "Deployment" }],
  },
  {
    slug: "project-first-user",
    title: "Get one person who is not you to use it",
    category: "project",
    effortHours: 3,
    leadTimeWeeks: 2,
    evidenceValue: 5,
    deadlineSensitive: false,
    prerequisites: ["project-deploy"],
    verifyVia: "self",
    doneMeans: [
      { label: "One external user, named", via: "self" },
      { label: "One thing they hit that you had not thought of", via: "self" },
    ],
    whyNow:
      "This is the sentence that ends the interview well: somebody else used it, and here is what broke. Almost no fresher CV in the country can say it.",
  },
  {
    slug: "project-hardening",
    title: "Fix what your first user broke",
    category: "project",
    effortHours: 8,
    leadTimeWeeks: 2,
    evidenceValue: 5,
    deadlineSensitive: false,
    prerequisites: ["project-first-user"],
    verifyVia: "github",
    doneMeans: [
      { label: "Every issue they hit is closed", via: "github" },
      { label: "Commits reference what broke", via: "github" },
    ],
    whyNow:
      "The gap between a demo and a thing that works is entirely here, and it is the part almost nobody on a fresher CV has done. It is also the best story you will have.",
  },
  {
    slug: "project-defence",
    title: "Write down why you built it that way",
    category: "project",
    effortHours: 3,
    leadTimeWeeks: 1,
    evidenceValue: 4,
    deadlineSensitive: false,
    prerequisites: ["project-core-loop"],
    verifyVia: "github",
    doneMeans: [
      { label: "Three design decisions written in the README", via: "github" },
      { label: "Each one names the alternative you rejected", via: "github" },
    ],
    whyNow:
      "Interviewers ask you to defend design choices, not describe features. Writing them down once is how you get twenty minutes of material out of one project.",
  },

  // ── Internship · the PPO route, hard deadlines ──────────────────────────
  {
    slug: "internship-shortlist",
    title: "Shortlist ten internship targets",
    category: "internship",
    effortHours: 2,
    leadTimeWeeks: 1,
    evidenceValue: 3,
    deadlineSensitive: true,
    anchor: "internship-applications",
    prerequisites: [],
    verifyVia: "self",
    doneMeans: [
      { label: "Ten named, with their application windows", via: "self" },
      { label: "At least three that convert interns to full-time", via: "self" },
    ],
    whyNow:
      "A summer internship that converts is the highest-leverage move available to a third-year, and the applications open months before the summer does. GCCs in particular hire through internship programmes rather than campus drives — which is the only way most of them are reachable at all.",
    sectors: ["product", "data", "core", "undecided"],
  },
  {
    slug: "internship-applications",
    title: "Send the first five applications",
    category: "internship",
    effortHours: 4,
    leadTimeWeeks: 1,
    evidenceValue: 4,
    deadlineSensitive: true,
    anchor: "internship-applications",
    prerequisites: ["internship-shortlist", "cv-export"],
    verifyVia: "self",
    doneMeans: [
      { label: "Five applications submitted", via: "self" },
      { label: "Dates logged so follow-up is possible", via: "self" },
    ],
    whyNow:
      "Applications sent late in the window compete against a shortlist that is already forming. The first five teach you what the sixth should look like.",
  },
  {
    slug: "internship-outreach",
    title: "Three direct approaches",
    category: "internship",
    effortHours: 3,
    leadTimeWeeks: 1,
    evidenceValue: 3,
    deadlineSensitive: true,
    anchor: "internship-applications",
    prerequisites: ["project-deploy"],
    verifyVia: "self",
    doneMeans: [
      { label: "Three messages sent to named people", via: "self" },
      { label: "Each references the deployed project", via: "self" },
    ],
    whyNow:
      "Your TPO can only introduce you to companies that come to campus. The higher-paying centres in Bangalore mostly do not, and a direct approach with something running attached is the route that exists instead.",
    sectors: ["product", "data", "undecided"],
  },

  // ── Core CS · interview fodder ──────────────────────────────────────────
  {
    slug: "core-cs-dbms",
    title: "DBMS — the eight questions that recur",
    category: "core-cs",
    effortHours: 6,
    leadTimeWeeks: 2,
    evidenceValue: 3,
    deadlineSensitive: false,
    prerequisites: [],
    verifyVia: "self",
    doneMeans: [
      { label: "Normalisation, indexes, transactions, joins answered aloud", via: "self" },
      { label: "One query written against your own project's schema", via: "self" },
    ],
    whyNow:
      "Asked in almost every technical round on your list, and answerable from your own project rather than from a textbook — which is what makes the answer sound like yours.",
    produces: [{ kind: "skill", hint: "DBMS" }],
  },
  {
    slug: "core-cs-os",
    title: "Operating systems — scheduling and memory",
    category: "core-cs",
    effortHours: 6,
    leadTimeWeeks: 2,
    evidenceValue: 3,
    deadlineSensitive: false,
    prerequisites: [],
    verifyVia: "self",
    doneMeans: [
      { label: "Processes, threads, scheduling, deadlock answered aloud", via: "self" },
    ],
    whyNow:
      "The second most-asked core subject, and the one most often answered from memory rather than understanding. The difference is audible.",
    produces: [{ kind: "skill", hint: "Operating systems" }],
  },
  {
    slug: "core-cs-networks",
    title: "Networks — what happens when you open a URL",
    category: "core-cs",
    effortHours: 4,
    leadTimeWeeks: 1,
    evidenceValue: 2,
    deadlineSensitive: false,
    prerequisites: [],
    verifyVia: "self",
    doneMeans: [
      { label: "The full path answered end to end, unprompted", via: "self" },
    ],
    whyNow:
      "One question carries most of the networks syllabus in an interview. Being able to take it all the way down and back up is the whole preparation.",
    produces: [{ kind: "skill", hint: "Computer networks" }],
  },

  // ── Artefact hygiene · last, once there is something real ───────────────
  {
    slug: "github-commit-habit",
    title: "Commit on four separate days",
    category: "hygiene",
    effortHours: 1,
    leadTimeWeeks: 1,
    evidenceValue: 3,
    deadlineSensitive: false,
    prerequisites: ["project-schema-first-commit"],
    verifyVia: "github",
    doneMeans: [{ label: "Commits on four distinct days this week", via: "github" }],
    whyNow:
      "A commit history spread over weeks is read as sustained work. The same code pushed in one sitting is read as a download.",
  },
  {
    slug: "github-profile",
    title: "Fix the GitHub profile a recruiter lands on",
    category: "hygiene",
    effortHours: 1.5,
    leadTimeWeeks: 0,
    evidenceValue: 2,
    deadlineSensitive: false,
    prerequisites: ["project-deploy"],
    verifyVia: "github",
    doneMeans: [
      { label: "Profile README with three lines and a link", via: "github" },
      { label: "Best repo pinned first", via: "github" },
      { label: "Tutorial repos unpinned", via: "github" },
    ],
    whyNow:
      "The profile page is what opens when someone clicks the link on your CV. Ninety minutes controls the first ten seconds of that.",
  },
  {
    slug: "leetcode-connect",
    title: "Connect your LeetCode handle",
    category: "hygiene",
    effortHours: 0.1,
    leadTimeWeeks: 0,
    evidenceValue: 1,
    deadlineSensitive: false,
    prerequisites: [],
    verifyVia: "leetcode",
    doneMeans: [{ label: "Handle connected and counts reading", via: "leetcode" }],
    whyNow:
      "One text field, and every DSA task after it verifies itself. Nothing to tick each week.",
  },
  {
    slug: "cv-export",
    title: "Export the CV and read it once",
    category: "hygiene",
    effortHours: 1,
    leadTimeWeeks: 0,
    evidenceValue: 3,
    deadlineSensitive: false,
    prerequisites: [],
    verifyVia: "self",
    doneMeans: [
      { label: "CV exported", via: "self" },
      { label: "Every line traceable to something you did", via: "self" },
    ],
    whyNow:
      "Your CV has been rebuilding itself as tasks complete. This is where you check it says what you would say.",
  },
  {
    slug: "linkedin-headline",
    title: "Rewrite the LinkedIn headline and About",
    category: "hygiene",
    effortHours: 1,
    leadTimeWeeks: 0,
    evidenceValue: 2,
    deadlineSensitive: false,
    prerequisites: ["project-deploy"],
    verifyVia: "self",
    doneMeans: [
      { label: "Headline names what you build, not what you study", via: "self" },
      { label: "About section is three sentences with the project link", via: "self" },
    ],
    whyNow:
      "Recruiters sourcing outside campus search LinkedIn first. An hour, and it is generated from what is already in your record.",
  },
];

export const ACTION_BY_SLUG = new Map(ACTIONS.map((a) => [a.slug, a]));

export function getAction(slug: string): Action | undefined {
  return ACTION_BY_SLUG.get(slug);
}

export const CATALOGUE_VERSION = "actions-2026.08.02";
