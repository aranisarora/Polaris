import type { AntiPattern } from "./types";

/**
 * The resume anti-pattern taxonomy — asset 4 of `docs/product.md` §13.1.
 *
 * Hand-authored judgement, not collected data. §13.2 is explicit that this is
 * the kind of asset a scraper cannot produce.
 *
 * ## The line this file must not cross
 *
 * `docs/brand.md` §2.2: we are harsh about artefacts and never about people.
 * "Your three projects appear on two hundred thousand CVs" is a fact about the
 * CV. "You have not done enough" is a verdict on a person. Every `finding`
 * below is written about the artefact, and every one carries a `fix` sized in
 * hours — a finding without a lever is just an insult (§3.1 rule 5).
 *
 * Counts like "200,000 CVs" are order-of-magnitude estimates over the Indian
 * fresher population, not measurements, and are worded as estimates.
 */

export const ANTI_PATTERNS: AntiPattern[] = [
  // ── Projects ────────────────────────────────────────────────────────────
  {
    slug: "food-delivery-clone",
    label: "Food delivery clone",
    category: "project",
    match: [
      "food delivery",
      "food-delivery",
      "swiggy",
      "zomato",
      "restaurant app",
      "food ordering",
    ],
    verdict: "Very common",
    weight: 95,
    finding:
      "On an estimated 200,000+ Indian fresher CVs. The skills transfer; the project does not distinguish you.",
    fix: "Keep it on the CV. Do not build an interview around it — an interviewer has seen this one this week.",
    fixHours: 0,
  },
  {
    slug: "ecommerce-clone",
    label: "E-commerce clone",
    category: "project",
    match: [
      "e-commerce",
      "ecommerce",
      "shopping cart",
      "online store",
      "amazon clone",
      "flipkart",
    ],
    verdict: "Very common",
    weight: 93,
    finding:
      "The most-built fresher project in India. A cart, a product list and a payment stub read as a tutorial rather than a decision you made.",
    fix: "If you keep it, add one thing it does that a tutorial would not — inventory races, idempotent payments, a real search index.",
    fixHours: 12,
  },
  {
    slug: "library-management-system",
    label: "Library management system",
    category: "project",
    match: [
      "library management",
      "library system",
      "book management",
      "librarian",
    ],
    verdict: "Reads as coursework",
    weight: 90,
    finding:
      "Assigned in thousands of colleges as a database lab exercise. A recruiter reads it as a submitted assignment, not as something you chose to build.",
    fix: "Keep it under education, not under projects.",
    fixHours: 0,
  },
  {
    slug: "student-management-system",
    label: "Student / employee management system",
    category: "project",
    match: [
      "student management",
      "employee management",
      "payroll system",
      "attendance management",
      "school management",
    ],
    verdict: "Reads as coursework",
    weight: 88,
    finding:
      "A CRUD table with a login screen. It demonstrates that you can use a database, which your degree already claims.",
    fix: "Replace with anything that has a second user. Same stack, different argument.",
    fixHours: 0,
  },
  {
    slug: "hospital-management-system",
    label: "Hospital management system",
    category: "project",
    match: ["hospital management", "clinic management", "patient management"],
    verdict: "Reads as coursework",
    weight: 87,
    finding:
      "Same shape as the library system, with different table names. Nothing in it is specific to you.",
    fix: "File it under coursework and spend the interview time on something you can defend.",
    fixHours: 0,
  },
  {
    slug: "netflix-clone",
    label: "Streaming / OTT clone",
    category: "project",
    match: ["netflix", "spotify clone", "youtube clone", "ott platform", "streaming app"],
    verdict: "Very common",
    weight: 86,
    finding:
      "A front-end over a public API. The hard parts of the real product — encoding, delivery, recommendation — are the parts a clone leaves out, and interviewers know which parts those are.",
    fix: "Either own one hard part properly, or drop it.",
    fixHours: 10,
  },
  {
    slug: "chat-app",
    label: "Chat application",
    category: "project",
    match: ["chat app", "chat application", "whatsapp clone", "messaging app", "real-time chat"],
    verdict: "Common",
    weight: 78,
    finding:
      "Sockets plus a message table. Common enough that it only helps if you can talk about delivery guarantees, ordering, or offline sync.",
    fix: "Be ready to answer what happens when a message is sent twice. If you cannot, it is not an interview project.",
    fixHours: 6,
  },
  {
    slug: "weather-app",
    label: "Weather app",
    category: "project",
    match: ["weather app", "weather application", "weather forecast"],
    verdict: "Not a project",
    weight: 84,
    finding:
      "One API call rendered to a screen. It belongs in a list of things you learned, not in a list of things you built.",
    fix: "Remove it. Space on a one-page CV is the scarce resource.",
    fixHours: 0,
  },
  {
    slug: "todo-app",
    label: "To-do / notes app",
    category: "project",
    match: ["to-do", "todo app", "task manager app", "notes app"],
    verdict: "Not a project",
    weight: 85,
    finding:
      "The canonical framework tutorial. Listing it signals that the tutorial is the most substantial thing available to list.",
    fix: "Remove it.",
    fixHours: 0,
  },
  {
    slug: "calculator-utility",
    label: "Calculator or basic utility",
    category: "project",
    match: ["calculator", "unit converter", "tic tac toe", "snake game", "number guessing"],
    verdict: "Not a project",
    weight: 83,
    finding:
      "First-week exercises. On a CV they actively reduce the weight a reader gives to everything around them.",
    fix: "Remove. Anything you built in an afternoon belongs on GitHub, not on the CV.",
    fixHours: 0,
  },
  {
    slug: "portfolio-site",
    label: "Portfolio site",
    category: "project",
    match: ["portfolio site", "portfolio website", "personal website"],
    verdict: "Counts differently",
    weight: 60,
    finding:
      "Artefact hygiene, not a project. Useful to have, filed in the wrong place.",
    fix: "Move it to the header as a link. It earns its space there.",
    fixHours: 1,
  },
  {
    slug: "tutorial-followed",
    label: "Followed a tutorial end to end",
    category: "project",
    match: [
      "followed a youtube",
      "youtube series",
      "udemy project",
      "tutorial project",
      "course project",
      "followed a tutorial",
    ],
    verdict: "Shows in the interview",
    weight: 92,
    finding:
      "A project built by following along cannot survive the question every interviewer asks: why did you do it that way. The honest answer is that the video did.",
    fix: "Take one decision in it and change it deliberately, then be able to say why. Four hours buys you an answer.",
    fixHours: 4,
  },
  {
    slug: "face-recognition-attendance",
    label: "Face-recognition attendance system",
    category: "project",
    match: [
      "face recognition",
      "facial recognition",
      "attendance system using",
      "face detection attendance",
    ],
    verdict: "Very common",
    weight: 82,
    finding:
      "A pre-trained model wired to a webcam and a spreadsheet. Extremely common in Indian final-year submissions, and the model is not yours.",
    fix: "State clearly which part you built. If the answer is the CSV writer, it is not an ML project.",
    fixHours: 2,
  },
  {
    slug: "kaggle-tutorial-ml",
    label: "Titanic / Iris / house prices",
    category: "project",
    match: ["titanic", "iris dataset", "house price prediction", "boston housing", "mnist"],
    verdict: "Not a project",
    weight: 88,
    finding:
      "Teaching datasets with known answers. Listing them tells a reader you completed the first chapter.",
    fix: "Swap in one question nobody has answered, on data you collected. Even a small one.",
    fixHours: 20,
  },
  {
    slug: "generic-chatbot",
    label: "Chatbot wrapper",
    category: "project",
    match: ["chatbot", "ai assistant", "gpt wrapper", "llm chatbot"],
    verdict: "Common",
    weight: 80,
    finding:
      "A prompt and an API key. Every recruiter is seeing dozens of these this cycle, which makes it the fastest-commoditising item on a fresher CV.",
    fix: "The differentiator is the data or the evaluation, never the model. Show one of those or drop it.",
    fixHours: 15,
  },

  // ── Evidence ────────────────────────────────────────────────────────────
  {
    slug: "github-thin",
    label: "GitHub",
    category: "evidence",
    match: [],
    verdict: "Easiest win",
    weight: 96,
    finding:
      "Commits clustered into a single day read as a project uploaded at the end rather than built over time. Interviewers check this, and it undersells work you actually did.",
    fix: "Commit as you work, from this week. Costs nothing and compounds every week you keep it up.",
    fixHours: 1,
  },
  {
    slug: "github-empty",
    label: "GitHub",
    category: "evidence",
    match: [],
    verdict: "Missing",
    weight: 97,
    finding:
      "No public repositories. For a software role this is the single cheapest piece of evidence available, and its absence is read as absence of work.",
    fix: "Push one thing you have already written. Forty minutes.",
    fixHours: 0.7,
  },
  {
    slug: "leetcode-easy-heavy",
    label: "LeetCode",
    category: "evidence",
    match: [],
    verdict: "Half-way",
    weight: 75,
    finding:
      "Volume is good — the habit is built. The mix is the problem: an easy-heavy profile does not predict performance on the rounds your open companies actually set.",
    fix: "Shift to mediums. Same minutes per day, different list.",
    fixHours: 0,
  },
  {
    slug: "course-no-artefact",
    label: "Course in progress",
    category: "evidence",
    match: ["udemy", "coursera", "in progress", "% complete", "currently learning"],
    verdict: "Keep going, differently",
    weight: 70,
    finding:
      "Courses teach well and prove nothing on their own. Completion is not an artefact, and a recruiter cannot check it.",
    fix: "Finish it by building rather than watching. Same hours, something to show at the end.",
    fixHours: 0,
  },
  {
    slug: "certificates-over-artefacts",
    label: "Certificate stack",
    category: "evidence",
    match: ["certificate", "certification of completion", "workshop certificate"],
    verdict: "Low weight",
    weight: 72,
    finding:
      "Unproctored completion certificates carry almost no weight, and a column of them signals time spent on the wrong thing. The exceptions are proctored: AWS, Azure, GCP and NPTEL.",
    fix: "Keep the proctored ones with their credential IDs. Cut the rest and reclaim the space.",
    fixHours: 0.5,
  },

  // ── Document ────────────────────────────────────────────────────────────
  {
    slug: "skill-list-inflation",
    label: "Skills section",
    category: "document",
    match: [],
    verdict: "Dilutes",
    weight: 68,
    finding:
      "A long list of technologies invites a question on the weakest item in it. Everything listed is fair game, and the list is only as strong as its worst entry.",
    fix: "Cut to what you would defend for ten minutes. Usually five or six things.",
    fixHours: 0.5,
  },
  {
    slug: "no-deployment",
    label: "Nothing running",
    category: "document",
    match: [],
    verdict: "Missing",
    weight: 76,
    finding:
      "No project has a URL a stranger can open. A running thing is worth more than three described things, because it cannot be exaggerated.",
    fix: "Deploy one project and put the link on the CV. Free tiers are enough.",
    fixHours: 3,
  },
  {
    slug: "generic-objective",
    label: "Objective statement",
    category: "framing",
    match: ["seeking a challenging", "dynamic organization", "utilize my skills", "career objective"],
    verdict: "Costs a line",
    weight: 64,
    finding:
      "A sentence that appears verbatim on hundreds of thousands of CVs, at the top, in the space a reader looks at first.",
    fix: "Delete it. Nothing replaces it — the space is better empty.",
    fixHours: 0.2,
  },
  {
    slug: "unclear-contribution",
    label: "Team project, unclear share",
    category: "framing",
    match: ["team project", "group project", "we built", "our team"],
    verdict: "Ambiguous",
    weight: 66,
    finding:
      "Written in the first person plural, so a reader cannot tell which part was yours — and will assume the smallest reading.",
    fix: "Rewrite each line as what you personally built. One sitting.",
    fixHours: 1,
  },
  {
    slug: "no-numbers",
    label: "No measurements",
    category: "framing",
    match: [],
    verdict: "Weak",
    weight: 62,
    finding:
      "Project lines describe features rather than results. Features are what the code does; results are what changed because it exists.",
    fix: "Put one number on each project — users, records, latency, anything you actually measured.",
    fixHours: 1,
  },
];

export const ANTI_PATTERN_BY_SLUG = new Map(
  ANTI_PATTERNS.map((p) => [p.slug, p]),
);

export const TAXONOMY_VERSION = "antipatterns-2026.08.02";
