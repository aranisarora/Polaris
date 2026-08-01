import type { Company, Source } from "./types";

/**
 * The company eligibility registry — asset 1 of `docs/product.md` §13.1.
 *
 * Ships at 23 rows, which is the recruiter roster a single VTU college in east
 * Bangalore actually sees. Target is 40–60; widen after a student has used it,
 * not before (§13.1: "Curating the full target set before any student sees the
 * product is two to three weeks of procrastination wearing a spreadsheet").
 *
 * ## The reconciliation problem
 *
 * §13.2 is right that the bottleneck here is not collection. Every criterion
 * below is published in three places with two different numbers, and drive
 * notices override all of them per batch. Three rules follow:
 *
 * 1. An absent field means *not stated*, never *no requirement*. Absent gates
 *    never block a student, so an error of omission costs a false "open" rather
 *    than a false "settled" — and a false "settled" tells someone to stop
 *    trying, which is the one mistake this product must not make.
 * 2. Where sources conflict the row is marked `contested` and the conflict is
 *    printed on the company page. We do not silently pick a winner.
 * 3. `checkedOn` is the date a human last looked. It is shown to the student.
 */

const PREPINSTA = (path: string, checkedOn = "2026-08-02"): Source => ({
  label: "PrepInsta",
  url: `https://prepinsta.com/${path}`,
  checkedOn,
});

const PLACEMENT_PREP = (path: string, checkedOn = "2026-08-02"): Source => ({
  label: "PlacementPreparation",
  url: `https://www.placementpreparation.io/${path}`,
  checkedOn,
});

const PAPERSADDA = (path: string, checkedOn = "2026-08-02"): Source => ({
  label: "PapersAdda",
  url: `https://papersadda.com/article/${path}`,
  checkedOn,
});

export const COMPANIES: Company[] = [
  // ─── IT services · the volume tier ──────────────────────────────────────
  {
    slug: "tcs-nqt",
    name: "TCS",
    programme: "National Qualifier Test",
    tier: "services",
    sectors: ["services", "data"],
    packageMinLpa: 3.36,
    packageMaxLpa: 9.0,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugPct: 60,
      ugCgpa: 6.0,
      maxActiveBacklogs: 1,
      backlogsClearedByJoining: true,
      maxGapYears: 2,
    },
    confidence: "verified",
    notes:
      "60% or 6.0 CGPA at every level — 10th, 12th, diploma, UG. No rounding: 59.9% does not clear 60%. Age 18–28. Cleared historical backlogs do not disqualify.",
    sources: [
      {
        label: "TCS All India NQT hiring",
        url: "https://www.tcs.com/careers/india/tcs-all-india-nqt-hiring",
        checkedOn: "2026-08-02",
      },
      PREPINSTA("tcs-nqt/eligibility-criteria/"),
    ],
    process: [
      {
        name: "NQT — aptitude",
        minutes: 75,
        topics: ["Numerical ability", "Verbal ability", "Reasoning"],
      },
      {
        name: "NQT — programming",
        minutes: 45,
        topics: ["Pseudocode", "Hands-on coding"],
      },
      { name: "Technical interview", minutes: 40 },
      { name: "Managerial + HR", minutes: 25 },
    ],
    campusTypes: ["on-campus", "pool", "off-campus"],
    typicalDriveMonth: 8,
  },
  {
    slug: "infosys",
    name: "Infosys",
    programme: "Systems Engineer",
    tier: "services",
    sectors: ["services", "data"],
    packageMinLpa: 3.6,
    packageMaxLpa: 9.5,
    batchYear: 2027,
    criteria: {
      tenthPct: 65,
      twelfthPct: 65,
      ugPct: 65,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
      maxGapYears: 2,
    },
    confidence: "contested",
    contestedNote:
      "Two readings are in circulation. Infosys's own drive notices for the Systems Engineer role state 65% at all three levels — 10th, 12th and graduation — from the 2024 batch onward, and candidates have been rejected at document verification on a 12th mark of 64.8%. Several aggregators still publish the older 60% / 60% / 65% split. Polaris applies the stricter 65% reading, because a student told a door is open and then rejected at document screening is worse off than one who prepared for it to be shut. Verify against the drive notice for your batch.",
    notes:
      "Raised from the 2024 batch onward. The higher bar than its peers is the single most consequential row in this registry for VTU students.",
    sources: [
      PREPINSTA("infosys/eligibility-criteria/"),
      PLACEMENT_PREP("infosys/eligibility-criteria/"),
      {
        label: "Polaris research.md §4",
        url: "https://github.com/aranisarora/Polaris/blob/main/docs/research.md",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      {
        name: "Online assessment",
        minutes: 100,
        topics: ["Reasoning", "Mathematical ability", "Pseudocode"],
      },
      { name: "Technical interview", minutes: 45 },
      { name: "HR interview", minutes: 20 },
    ],
    campusTypes: ["on-campus", "pool", "off-campus"],
    typicalDriveMonth: 9,
  },
  {
    slug: "wipro",
    name: "Wipro",
    programme: "Elite National Talent Hunt",
    tier: "services",
    sectors: ["services"],
    packageMinLpa: 3.5,
    packageMaxLpa: 6.5,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugPct: 60,
      ugCgpa: 6.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
      maxGapYears: 3,
    },
    confidence: "contested",
    contestedNote:
      "Wipro's Elite NTH notice requires 60% at all three levels. On backlogs the sources split: some state zero active backlogs at the time of application, others allow one at the time of the test with everything cleared before joining. Polaris applies zero, because Wipro is documented to reject at document screening for a final-semester backlog even after a candidate has cleared every round — the failure mode is late and expensive.",
    notes:
      "The 60% UG requirement is cumulative across all semesters, not per-year. Fashion Technology, Textile, Agriculture and Food Technology branches are excluded.",
    sources: [
      PAPERSADDA("wipro-eligibility-criteria-2026/"),
      PREPINSTA("wipro-nlth/eligibility-criteria/"),
      PLACEMENT_PREP("blog/wipro-elite-nth-eligibility-criteria/"),
    ],
    process: [
      {
        name: "Online assessment",
        minutes: 138,
        topics: ["Aptitude", "Written communication", "Coding"],
      },
      { name: "Technical interview", minutes: 40 },
      { name: "HR interview", minutes: 20 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 10,
  },
  {
    slug: "accenture",
    name: "Accenture",
    programme: "Associate Software Engineer",
    tier: "services",
    sectors: ["services", "data"],
    packageMinLpa: 4.5,
    packageMaxLpa: 6.5,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugPct: 60,
      ugCgpa: 6.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
      maxGapYears: 1,
    },
    confidence: "contested",
    contestedNote:
      "Most drive notices state 60% or 6.0 CGPA throughout; some 2026 postings state 65% or 7.25 CGPA for the standard track. Polaris applies 60%, the more widely published figure, and flags that a specific drive may be stricter. The gap allowance of one year is tighter than most peers and catches more students than the percentage does.",
    notes: "Age 18–30. No active backlog at any point in the selection process.",
    sources: [
      PLACEMENT_PREP("accenture/eligibility-criteria/"),
      {
        label: "Unstop — Accenture eligibility",
        url: "https://unstop.com/blog/eligibility-criteria-for-accenture",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      {
        name: "Cognitive and technical assessment",
        minutes: 90,
        topics: ["English", "Analytical", "Pseudocode", "Networking", "Cloud"],
      },
      { name: "Coding assessment", minutes: 45 },
      { name: "Communication assessment", minutes: 20 },
      { name: "Technical + HR interview", minutes: 40 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 9,
  },
  {
    slug: "cognizant",
    name: "Cognizant",
    programme: "GenC",
    tier: "services",
    sectors: ["services", "data"],
    packageMinLpa: 4.0,
    packageMaxLpa: 6.75,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugPct: 60,
      ugCgpa: 6.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
      maxGapYears: 1,
    },
    confidence: "reported",
    notes:
      "BE / B.Tech / ME / M.Tech / MCA only. Maximum one year of gap after 12th or between semesters. GenC Next and GenC Elevate are separate, stricter tracks.",
    sources: [
      PLACEMENT_PREP("cognizant-genc/eligibility-criteria/"),
      {
        label: "Unstop — Cognizant recruitment process",
        url: "https://unstop.com/blog/cognizant-recruitment-process",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      {
        name: "Aptitude assessment",
        minutes: 60,
        topics: ["Quantitative", "Logical", "Verbal"],
      },
      { name: "Automata Fix / coding", minutes: 45 },
      { name: "Technical interview", minutes: 35 },
      { name: "HR interview", minutes: 15 },
    ],
    campusTypes: ["on-campus", "pool", "off-campus"],
    typicalDriveMonth: 8,
  },
  {
    slug: "capgemini",
    name: "Capgemini",
    programme: "Analyst",
    tier: "services",
    sectors: ["services"],
    packageMinLpa: 4.25,
    packageMaxLpa: 7.5,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugPct: 60,
      ugCgpa: 6.0,
      maxActiveBacklogs: 1,
      backlogsClearedByJoining: true,
      maxGapYears: 2,
    },
    confidence: "reported",
    notes:
      "One active backlog is permitted at application; everything must clear before joining. No gap is permitted *within* a degree — a four-year course stretched to five is not accepted, which is a separate trap from the two-year overall gap allowance.",
    sources: [PLACEMENT_PREP("capgemini/eligibility-criteria/")],
    process: [
      {
        name: "Game-based aptitude",
        minutes: 45,
        topics: ["Cognitive ability"],
      },
      {
        name: "Technical assessment",
        minutes: 75,
        topics: ["Pseudocode", "English"],
      },
      { name: "Technical interview", minutes: 40 },
      { name: "HR interview", minutes: 20 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 11,
  },
  {
    slug: "ltimindtree",
    name: "LTIMindtree",
    tier: "services",
    sectors: ["services"],
    packageMinLpa: 4.0,
    packageMaxLpa: 6.5,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugPct: 60,
      ugCgpa: 6.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
      maxGapYears: 2,
    },
    confidence: "reported",
    notes:
      "The standard track gates at 60% throughout. Specialised tracks are documented to waive the percentage filter for strong coders — if you are below the line, the specialised track is the route, not the general drive.",
    sources: [
      {
        label: "Minimum CGPA for placements",
        url: "https://gradekar.com/blog/minimum-cgpa-for-placements",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      {
        name: "Online assessment",
        minutes: 90,
        topics: ["Quantitative", "Logical", "Verbal", "Coding"],
      },
      { name: "Technical interview", minutes: 40 },
      { name: "HR interview", minutes: 20 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 10,
  },
  {
    slug: "tech-mahindra",
    name: "Tech Mahindra",
    tier: "services",
    sectors: ["services"],
    packageMinLpa: 3.25,
    packageMaxLpa: 5.5,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugPct: 60,
      ugCgpa: 6.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
      maxGapYears: 3,
    },
    confidence: "contested",
    contestedNote:
      "Drives have run at both 60% / 6.0 and 65% / 6.5 within the last two cycles, and one 2024 drive ran at 70%. Polaris applies 60%, the floor across recent drives. Treat this row as the least stable in the registry and check the drive notice.",
    sources: [
      PLACEMENT_PREP("tech-mahindra/eligibility-criteria/"),
      {
        label: "Placement Papers — Tech Mahindra",
        url: "https://placementpapers.app/tech-mahindra/",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      {
        name: "Online assessment",
        minutes: 90,
        topics: ["Aptitude", "Technical MCQ", "Essay"],
      },
      { name: "Technical interview", minutes: 35 },
      { name: "HR interview", minutes: 15 },
    ],
    campusTypes: ["on-campus", "pool"],
    typicalDriveMonth: 12,
  },
  {
    slug: "hcltech",
    name: "HCLTech",
    tier: "services",
    sectors: ["services", "core"],
    packageMinLpa: 3.5,
    packageMaxLpa: 7.0,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugPct: 60,
      ugCgpa: 6.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
      maxGapYears: 2,
    },
    confidence: "reported",
    notes:
      "60% or 6.0 throughout 10th, 12th/diploma and graduation. Zero active backlogs at the online test or interview.",
    sources: [PLACEMENT_PREP("hcl/eligibility-criteria/")],
    process: [
      {
        name: "Online assessment",
        minutes: 90,
        topics: ["Aptitude", "Technical", "Coding"],
      },
      { name: "Technical interview", minutes: 40 },
      { name: "HR interview", minutes: 20 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 9,
  },
  {
    slug: "virtusa",
    name: "Virtusa",
    tier: "services",
    sectors: ["services"],
    packageMinLpa: 4.0,
    packageMaxLpa: 6.0,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugPct: 60,
      ugCgpa: 6.0,
      maxActiveBacklogs: 1,
      backlogsClearedByJoining: true,
    },
    confidence: "reported",
    sources: [
      {
        label: "Minimum CGPA for placements",
        url: "https://gradekar.com/blog/minimum-cgpa-for-placements",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      { name: "Aptitude and technical MCQ", minutes: 60 },
      { name: "Coding round", minutes: 45 },
      { name: "Technical interview", minutes: 35 },
      { name: "HR interview", minutes: 15 },
    ],
    campusTypes: ["on-campus", "pool"],
    typicalDriveMonth: 11,
  },
  {
    slug: "mphasis",
    name: "Mphasis",
    tier: "services",
    sectors: ["services"],
    packageMinLpa: 3.5,
    packageMaxLpa: 5.5,
    batchYear: 2027,
    criteria: {
      ugPct: 60,
      ugCgpa: 6.0,
      backlogsClearedByJoining: true,
    },
    confidence: "reported",
    notes:
      "Gates on the graduation aggregate rather than school marks, and is documented to flex below 60% for strong technical rounds. No published 10th or 12th requirement — which is why it stays open for students Infosys and TCS close out.",
    sources: [
      {
        label: "Minimum CGPA for placements",
        url: "https://gradekar.com/blog/minimum-cgpa-for-placements",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      { name: "Aptitude assessment", minutes: 60 },
      { name: "Technical interview", minutes: 40 },
      { name: "HR interview", minutes: 15 },
    ],
    campusTypes: ["on-campus", "pool"],
    typicalDriveMonth: 12,
  },
  {
    slug: "hexaware",
    name: "Hexaware",
    tier: "services",
    sectors: ["services"],
    packageMinLpa: 3.5,
    packageMaxLpa: 5.0,
    batchYear: 2027,
    criteria: {
      ugPct: 60,
      ugCgpa: 6.0,
      backlogsClearedByJoining: true,
    },
    confidence: "reported",
    notes:
      "Documented to hire at 50% in graduation where the technical rounds carry it. No published school-mark gate.",
    sources: [
      {
        label: "IT companies hiring without a 60% criterion",
        url: "https://itjobnotify.com/blog/companies-hiring-without-60-percent-2026",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      { name: "Aptitude and technical MCQ", minutes: 60 },
      { name: "Technical interview", minutes: 35 },
      { name: "HR interview", minutes: 15 },
    ],
    campusTypes: ["on-campus", "pool"],
    typicalDriveMonth: 1,
  },
  {
    slug: "sonata-software",
    name: "Sonata Software",
    tier: "services",
    sectors: ["services"],
    packageMinLpa: 3.5,
    packageMaxLpa: 5.0,
    batchYear: 2027,
    criteria: {
      ugPct: 60,
      ugCgpa: 6.0,
      backlogsClearedByJoining: true,
    },
    confidence: "reported",
    notes: "Bengaluru-headquartered. Recruits steadily from the VTU belt.",
    sources: [
      {
        label: "Minimum CGPA for placements",
        url: "https://gradekar.com/blog/minimum-cgpa-for-placements",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      { name: "Written test", minutes: 60 },
      { name: "Technical interview", minutes: 35 },
      { name: "HR interview", minutes: 15 },
    ],
    campusTypes: ["on-campus"],
    typicalDriveMonth: 2,
  },

  // ─── Product · the no-marks-gate route ──────────────────────────────────
  {
    slug: "zoho",
    name: "Zoho",
    tier: "product",
    sectors: ["product"],
    packageMinLpa: 6.0,
    packageMaxLpa: 11.0,
    batchYear: 2027,
    criteria: {
      backlogsClearedByJoining: true,
    },
    confidence: "contested",
    contestedNote:
      "Zoho's own process documentation states no CGPA or percentage requirement, and it is the standard counter-example to the 60% floor in India. Some aggregators nonetheless publish a 60% / 6.5 CGPA criterion for it. Polaris applies no academic gate, because the downside of a wrong 'open' here is a student sitting a test they were always allowed to sit, while a wrong 'settled' would remove the single most valuable row in this registry for a student whose school marks have closed the services tier.",
    notes:
      "Selection is a long sequence of programming rounds rather than an aptitude filter — four to six rounds, two of them writing complete working programs judged on edge cases and code quality. It rewards preparation that can be started from scratch, which is exactly why it belongs at the top of the list for a student with weak marks and time remaining.",
    sources: [
      {
        label: "GeeksforGeeks — Zoho Corporation recruitment process",
        url: "https://www.geeksforgeeks.org/interview-experiences/zoho-corporation-recruitment-process/",
        checkedOn: "2026-08-02",
      },
      PLACEMENT_PREP("zoho/eligibility-criteria/"),
      {
        label: "IT companies hiring without a 60% criterion",
        url: "https://itjobnotify.com/blog/companies-hiring-without-60-percent-2026",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      {
        name: "Online assessment",
        minutes: 90,
        topics: [
          "Arrays",
          "Strings",
          "Recursion",
          "Searching and sorting",
          "Hashing",
          "Basic DP",
        ],
      },
      {
        name: "Programming round",
        minutes: 90,
        topics: [
          "Complete working programs",
          "Linked lists",
          "Trees",
          "Edge cases and code quality",
        ],
      },
      {
        name: "Technical interview",
        minutes: 60,
        topics: ["DSA", "OOP", "OS", "DBMS", "Networks", "SQL", "Your projects"],
      },
      {
        name: "Advanced technical round",
        minutes: 60,
        topics: ["Advanced DSA", "DP", "Graphs", "Object-oriented design"],
      },
      { name: "Managerial round", minutes: 45 },
      { name: "HR interview", minutes: 25 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 9,
  },
  {
    slug: "ibm-india",
    name: "IBM India",
    tier: "product",
    sectors: ["product", "data"],
    packageMinLpa: 4.5,
    packageMaxLpa: 9.0,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugPct: 60,
      ugCgpa: 6.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
      maxGapYears: 2,
    },
    confidence: "contested",
    contestedNote:
      "60% or 6.0 CGPA in graduation is the widely published floor; some campus drives run at 65% or 6.5. Polaris applies 60% and flags that a specific drive may be stricter.",
    sources: [
      PREPINSTA("ibm/eligibility-criteria/"),
      PLACEMENT_PREP("ibm/eligibility-criteria/"),
    ],
    process: [
      {
        name: "Cognitive ability assessment",
        minutes: 60,
        topics: ["Numerical", "Inductive reasoning"],
      },
      { name: "Coding assessment", minutes: 60 },
      { name: "Technical interview", minutes: 45 },
      { name: "HR interview", minutes: 20 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 10,
  },

  // ─── Core / embedded ────────────────────────────────────────────────────
  {
    slug: "bosch-global",
    name: "Bosch Global Software Technologies",
    tier: "core",
    sectors: ["core", "product"],
    packageMinLpa: 6.0,
    packageMaxLpa: 10.0,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugPct: 60,
      ugCgpa: 6.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
      maxGapYears: 1,
    },
    confidence: "reported",
    notes:
      "60% or 6.0 CGPA at all three levels. Bengaluru-headquartered, and one of the largest engineering employers in the city. Recruits across CSE, ECE, EEE and Mechanical, which makes it one of the few higher-package rows open to non-circuit branches.",
    sources: [
      {
        label: "GeeksforGeeks — Bosch Group recruitment process",
        url: "https://www.geeksforgeeks.org/interview-experiences/bosch-group-recruitment-process/",
        checkedOn: "2026-08-02",
      },
      {
        label: "Minimum CGPA for placements",
        url: "https://gradekar.com/blog/minimum-cgpa-for-placements",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      {
        name: "Aptitude and technical MCQ",
        minutes: 90,
        topics: ["Quantitative", "Logical", "C", "OOP"],
      },
      {
        name: "Coding round",
        minutes: 60,
        topics: ["Arrays", "Strings"],
      },
      {
        name: "Technical interview",
        minutes: 45,
        topics: ["DBMS", "OS", "Projects in depth"],
      },
      { name: "HR interview", minutes: 15 },
    ],
    campusTypes: ["on-campus", "pool"],
    typicalDriveMonth: 8,
  },
  {
    slug: "continental",
    name: "Continental",
    tier: "core",
    sectors: ["core"],
    packageMinLpa: 7.0,
    packageMaxLpa: 12.0,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugCgpa: 7.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
    },
    confidence: "reported",
    notes:
      "Automotive electronics. Strong ECE and EEE intake alongside software. Bengaluru and Chennai sites.",
    sources: [
      {
        label: "Minimum CGPA for placements",
        url: "https://gradekar.com/blog/minimum-cgpa-for-placements",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      { name: "Online assessment", minutes: 90 },
      { name: "Technical interview", minutes: 45 },
      { name: "HR interview", minutes: 20 },
    ],
    campusTypes: ["on-campus"],
    typicalDriveMonth: 9,
  },
  {
    slug: "philips",
    name: "Philips Innovation Campus",
    tier: "gcc",
    sectors: ["core", "product", "data"],
    packageMinLpa: 8.0,
    packageMaxLpa: 14.0,
    batchYear: 2027,
    criteria: {
      ugCgpa: 7.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
    },
    confidence: "reported",
    notes:
      "Health-technology R&D centre in Bengaluru. Publishes little campus criteria directly; the 7.0 figure is the consistently reported campus floor.",
    sources: [
      {
        label: "Minimum CGPA for placements",
        url: "https://gradekar.com/blog/minimum-cgpa-for-placements",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      { name: "Online assessment", minutes: 90 },
      { name: "Technical interview", minutes: 45 },
      { name: "Managerial + HR", minutes: 30 },
    ],
    campusTypes: ["on-campus"],
    typicalDriveMonth: 9,
  },

  // ─── GCCs · the growing tier ────────────────────────────────────────────
  {
    slug: "societe-generale-gsc",
    name: "Société Générale GSC",
    tier: "gcc",
    sectors: ["product", "data"],
    packageMinLpa: 8.0,
    packageMaxLpa: 14.0,
    batchYear: 2027,
    criteria: {
      ugCgpa: 7.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
    },
    confidence: "reported",
    notes:
      "Bengaluru global solution centre. GCCs of this kind publish far less campus criteria than the services tier — `docs/research.md` §1.4 notes they often bypass campus routes entirely in favour of hackathons and internship programmes. Treat the 7.0 as the reported campus floor and the internship route as the more reliable way in.",
    sources: [
      {
        label: "Société Générale careers",
        url: "https://careers.societegenerale.com/en",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      { name: "Online assessment", minutes: 90 },
      { name: "Technical interview", minutes: 45 },
      { name: "Managerial + HR", minutes: 30 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 10,
  },
  {
    slug: "anz-bengaluru",
    name: "ANZ",
    programme: "Bengaluru Group Capability Centre",
    tier: "gcc",
    sectors: ["product", "data"],
    packageMinLpa: 9.0,
    packageMaxLpa: 15.0,
    batchYear: 2027,
    criteria: {
      ugCgpa: 7.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
    },
    confidence: "reported",
    notes:
      "Banking technology centre in Bengaluru. Campus criteria are not published; 7.0 is the reported floor.",
    sources: [
      {
        label: "ANZ Bengaluru careers",
        url: "https://www.anz.com.au/careers/our-teams/group-capability-centre/bengaluru/",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      { name: "Online assessment", minutes: 75 },
      { name: "Technical interview", minutes: 45 },
      { name: "Behavioural interview", minutes: 30 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 11,
  },
  {
    slug: "wells-fargo-india",
    name: "Wells Fargo India",
    tier: "gcc",
    sectors: ["product", "data"],
    packageMinLpa: 9.0,
    packageMaxLpa: 16.0,
    batchYear: 2027,
    criteria: {
      ugCgpa: 7.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
    },
    confidence: "reported",
    notes: "Bengaluru and Hyderabad technology centres.",
    sources: [
      {
        label: "GCC expansion in Bangalore",
        url: "https://v3staffing.in/blog/gcc-expansion-bangalore-global-hub",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      { name: "Online assessment", minutes: 90 },
      { name: "Technical interview", minutes: 45 },
      { name: "HR interview", minutes: 25 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 10,
  },
  {
    slug: "target-in-india",
    name: "Target in India",
    tier: "gcc",
    sectors: ["product", "data"],
    packageMinLpa: 10.0,
    packageMaxLpa: 18.0,
    batchYear: 2027,
    criteria: {
      ugCgpa: 7.0,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
    },
    confidence: "reported",
    notes:
      "Bengaluru. One of the higher-paying GCC rows reachable from the VTU belt, and a documented hirer through internship conversion rather than bulk campus drives.",
    sources: [
      {
        label: "GCC expansion in Bangalore",
        url: "https://v3staffing.in/blog/gcc-expansion-bangalore-global-hub",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      { name: "Online assessment", minutes: 90 },
      { name: "Technical interview 1", minutes: 45 },
      { name: "Technical interview 2", minutes: 45 },
      { name: "Hiring manager", minutes: 30 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 8,
  },
  {
    slug: "deloitte-usi",
    name: "Deloitte USI",
    tier: "gcc",
    sectors: ["services", "data"],
    packageMinLpa: 6.5,
    packageMaxLpa: 11.0,
    batchYear: 2027,
    criteria: {
      tenthPct: 60,
      twelfthPct: 60,
      ugCgpa: 6.5,
      maxActiveBacklogs: 0,
      backlogsClearedByJoining: true,
      maxGapYears: 1,
    },
    confidence: "contested",
    contestedNote:
      "Deloitte runs two very different bars. The technology track recruits at roughly 6.5 CGPA from a wide set of colleges; the consulting track recruits at 7.0–8.0 from IITs, NITs and top business schools. Polaris applies the technology track, which is the one that visits the VTU belt.",
    sources: [
      PREPINSTA("deloitte-eligibility-criteria/"),
      {
        label: "FACE Prep — Deloitte recruitment process",
        url: "https://faceprep.in/article/deloitte-recruitment-process-for-freshers-in-detail-face-prep/",
        checkedOn: "2026-08-02",
      },
    ],
    process: [
      { name: "Profile screening" },
      {
        name: "Online assessment",
        minutes: 90,
        topics: ["Aptitude", "Technical", "Situational judgement"],
      },
      { name: "Technical + HR interview", minutes: 45 },
    ],
    campusTypes: ["on-campus", "off-campus"],
    typicalDriveMonth: 9,
  },
];

export const COMPANY_BY_SLUG = new Map(COMPANIES.map((c) => [c.slug, c]));

export function getCompany(slug: string): Company | undefined {
  return COMPANY_BY_SLUG.get(slug);
}

/** The date the registry as a whole was last reconciled. Shown on every artefact. */
export const REGISTRY_UPDATED_ON = "2026-08-02";

/** Bumped whenever a criterion changes, so a stored analysis records what it saw. */
export const REGISTRY_VERSION = "registry-2026.08.02";
