import type {
  CompanyTypeOption,
  DreamInterpretation,
  SectorOption,
} from "@/lib/types";

/**
 * Wizard option lists + the smart-default derivation for step 3.
 * Value tuples are kept in lockstep with the unions in lib/types.ts —
 * `satisfies` breaks the build if they drift.
 */

export const SECTOR_VALUES = [
  "engineering",
  "design",
  "product",
  "data",
  "marketing",
  "operations",
  "healthcare",
  "other",
] as const satisfies readonly SectorOption[];

export const COMPANY_TYPE_VALUES = [
  "startup",
  "scaleup",
  "big-tech",
  "enterprise",
  "public-sector",
  "agency",
  "any",
] as const satisfies readonly CompanyTypeOption[];

export interface SectorChoice {
  value: SectorOption;
  title: string;
  /** Lowercase form used inside the composed dream sentence. */
  phrase: string;
}

/** The 7 named sectors, then "Something else" revealing the inline input. */
export const SECTOR_CHOICES: readonly SectorChoice[] = [
  { value: "engineering", title: "Engineering", phrase: "engineering" },
  { value: "design", title: "Design", phrase: "design" },
  { value: "product", title: "Product", phrase: "product" },
  { value: "data", title: "Data", phrase: "data" },
  { value: "marketing", title: "Marketing", phrase: "marketing" },
  { value: "operations", title: "Operations", phrase: "operations" },
  { value: "healthcare", title: "Healthcare", phrase: "healthcare" },
  { value: "other", title: "Something else", phrase: "" },
];

export function sectorChoice(value: SectorOption): SectorChoice {
  return (
    SECTOR_CHOICES.find((choice) => choice.value === value) ??
    SECTOR_CHOICES[SECTOR_CHOICES.length - 1]
  );
}

/** Sentinel for the "Something else" role card — reveals the inline input. */
export const ROLE_OTHER = "other" as const;

export interface RoleChoice {
  /** The job title itself, stored verbatim as the interpretation's roleTitle. */
  value: string;
  description?: string;
}

/**
 * Step 2's role ladder, one list per sector. Each list is ordered roughly
 * entry → lead so the ladder reads as a trajectory, and caps at 8 cards
 * (PRODUCT.md: ≤9 items per uncategorised list) with "Something else"
 * always last — the escape hatch for a dream that isn't on the list.
 */
const ROLES_BY_SECTOR: Record<SectorOption, readonly RoleChoice[]> = {
  engineering: [
    { value: "Software Engineer" },
    { value: "Senior Software Engineer" },
    { value: "Staff Engineer", description: "Principal or staff level" },
    { value: "Engineering Manager" },
    { value: "Machine Learning Engineer" },
    { value: "Platform Engineer", description: "DevOps, infrastructure, SRE" },
    { value: "Founding Engineer", description: "First engineer at a new company" },
  ],
  design: [
    { value: "Product Designer" },
    { value: "Senior Product Designer" },
    { value: "Design Lead" },
    { value: "UX Researcher" },
    { value: "Brand Designer", description: "Visual identity and campaigns" },
    { value: "Design Manager" },
    { value: "Founding Designer", description: "First designer at a new company" },
  ],
  product: [
    { value: "Product Manager" },
    { value: "Senior Product Manager" },
    { value: "Group Product Manager" },
    { value: "Technical Product Manager" },
    { value: "Product Marketing Manager" },
    { value: "Product Operations Manager" },
    { value: "Head of Product" },
  ],
  data: [
    { value: "Data Analyst" },
    { value: "Data Scientist" },
    { value: "Senior Data Scientist" },
    { value: "Data Engineer" },
    { value: "Analytics Engineer" },
    { value: "Machine Learning Engineer" },
    { value: "Head of Data" },
  ],
  marketing: [
    { value: "Marketing Manager" },
    { value: "Growth Marketer", description: "Acquisition and retention" },
    { value: "Performance Marketer", description: "Paid channels and ads" },
    { value: "Content Lead", description: "Editorial, SEO, storytelling" },
    { value: "Brand Manager" },
    { value: "Social Media Manager" },
    { value: "Head of Marketing" },
  ],
  operations: [
    { value: "Operations Manager" },
    { value: "Business Operations Manager" },
    { value: "Project Manager", description: "Programme and delivery" },
    { value: "Chief of Staff" },
    { value: "Supply Chain Manager" },
    { value: "People Manager", description: "HR, talent, culture" },
    { value: "Head of Operations" },
  ],
  healthcare: [
    { value: "Nurse" },
    { value: "Doctor" },
    { value: "Healthcare Assistant" },
    { value: "Pharmacist" },
    { value: "Physiotherapist" },
    { value: "Clinical Researcher" },
    { value: "Healthcare Manager", description: "Service and practice leadership" },
  ],
  // Sector "other" is user-typed, so the ladder is shaped by seniority only.
  other: [
    { value: "Specialist", description: "Hands-on, deep in the craft" },
    { value: "Senior Specialist" },
    { value: "Team Lead" },
    { value: "Manager" },
    { value: "Head of Department" },
    { value: "Director" },
    { value: "Founder", description: "Working for yourself" },
  ],
};

/**
 * The cards shown on step 2 for a given sector — the ladder plus the
 * always-last "Something else" escape hatch.
 */
export function rolesForSector(sector: SectorOption): readonly RoleChoice[] {
  const sectorLabel = sectorChoice(sector);
  const suffix = sectorLabel.phrase ? ` in ${sectorLabel.phrase}` : "";
  return [
    ...ROLES_BY_SECTOR[sector],
    { value: ROLE_OTHER, description: `Name the role you're aiming for${suffix}` },
  ];
}

/** True when `value` is a role this sector offers (used to restore on resume). */
export function isKnownRole(sector: SectorOption, value: string): boolean {
  return ROLES_BY_SECTOR[sector].some((role) => role.value === value);
}

export interface CompanyChoice {
  value: CompanyTypeOption;
  title: string;
  description: string;
}

export const COMPANY_CHOICES: readonly CompanyChoice[] = [
  {
    value: "startup",
    title: "Startup",
    description: "Small team, broad role, fast pace",
  },
  {
    value: "scaleup",
    title: "Scale-up",
    description: "Proven idea, still growing fast",
  },
  {
    value: "big-tech",
    title: "Big tech",
    description: "Deep resources, sharp specialisms",
  },
  {
    value: "enterprise",
    title: "Enterprise",
    description: "Established, structured, steady",
  },
  {
    value: "public-sector",
    title: "Public sector",
    description: "Work in the public's service",
  },
  {
    value: "agency",
    title: "Agency",
    description: "Many clients, varied briefs",
  },
  {
    value: "any",
    title: "Any of these",
    description: "The work matters more than the walls",
  },
];

/**
 * Signals scanned, in priority order, across the dream interpretation's
 * companyHints / sector / roleTitle to preselect a company type on step 3.
 */
const COMPANY_TYPE_SIGNALS: ReadonlyArray<readonly [RegExp, CompanyTypeOption]> =
  [
    [/start.?up|founder|founding|early.?stage|seed.?stage|y ?combinator/i, "startup"],
    [/scale.?up|series [b-d]\b|hyper.?growth|unicorn/i, "scaleup"],
    [
      /big.?tech|faang|google|alphabet|apple|meta\b|amazon|microsoft|netflix|nvidia|openai|anthropic|deepmind/i,
      "big-tech",
    ],
    [/agency|agencies|consultanc|consulting|client.?facing|freelance/i, "agency"],
    [
      /public.?sector|government|civil service|nhs\b|non.?profit|charity|charities|ngo\b|council|museum|university|school/i,
      "public-sector",
    ],
    [
      /enterprise|corporate|corporation|bank|banking|insurance|fortune ?500|blue.?chip|multinational/i,
      "enterprise",
    ],
  ];

/**
 * Smart default for step 3, derived from what the dream points at. Null when
 * nothing points anywhere — no suggestion beats a wrong one.
 */
export function deriveCompanyType(
  interpretation: DreamInterpretation | null,
): CompanyTypeOption | null {
  if (!interpretation) return null;
  const haystack = [
    ...(interpretation.companyHints ?? []),
    interpretation.sector ?? "",
    interpretation.roleTitle ?? "",
  ]
    .join(" ")
    .trim();
  if (!haystack) return null;
  for (const [pattern, type] of COMPANY_TYPE_SIGNALS) {
    if (pattern.test(haystack)) return type;
  }
  return null;
}

// ------------------------------------------------------- dream composition

/**
 * Seniority read off the chosen title. Ordered most-specific first: "Senior
 * Data Scientist" must read as senior, not lead, so the lead pattern is
 * checked only after senior has been ruled out.
 */
const SENIORITY_SIGNALS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bsenior\b/i, "senior"],
  [
    /\b(head|director|chief|lead|principal|staff|manager|founder|founding)\b/i,
    "lead",
  ],
  [/\b(junior|assistant|graduate|trainee|intern)\b/i, "entry"],
];

function deriveSeniority(roleTitle: string): string | undefined {
  for (const [pattern, level] of SENIORITY_SIGNALS) {
    if (pattern.test(roleTitle)) return level;
  }
  return undefined;
}

/**
 * "a" / "an" for the composed sentence. Only A/E/I/O take "an" — a naive
 * vowel test would produce "an UX Researcher", and every U-initial title in
 * the ladder ("UX Researcher") reads with a consonant sound.
 */
function article(word: string): "a" | "an" {
  return /^[aeio]/i.test(word.trim()) ? "an" : "a";
}

/** Strip punctuation and cap length so the line is safe for job-board APIs. */
function toSearchLine(value: string): string {
  return value
    .replace(/[.,;:!?'"“”‘’()[\]{}\\/|@#$%^&*+=~`<>_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 6)
    .join(" ");
}

export interface ComposedDream {
  /** The user's statement, stored verbatim in `dream_text`. */
  dreamText: string;
  interpretation: DreamInterpretation;
}

/**
 * Build the dream statement and its interpretation from the two card picks.
 *
 * Onboarding used to send a free-text dream to Gemini; the picks are already
 * structured, so this derives the same shape deterministically. That keeps
 * the first Continue instant (no model round-trip to wait on) and makes the
 * whole wizard work even when the Gemini key is throttled or unset.
 *
 * `quotedPhrases` must be verbatim substrings of `dreamText` — every product
 * surface quotes them back as the user's own words — so both entries are
 * sliced from the very sentence built here.
 */
export function composeDream(input: {
  sector: SectorOption;
  sectorOther: string;
  role: string;
  roleOther: string;
}): ComposedDream {
  const roleTitle =
    input.role === ROLE_OTHER ? input.roleOther.trim() : input.role.trim();

  const choice = sectorChoice(input.sector);
  const sectorPhrase =
    input.sector === "other" ? input.sectorOther.trim() : choice.phrase;

  const dreamText = sectorPhrase
    ? `I want to be ${article(roleTitle)} ${roleTitle} in ${sectorPhrase}.`
    : `I want to be ${article(roleTitle)} ${roleTitle}.`;

  const quotedPhrases = [roleTitle];
  if (sectorPhrase && !quotedPhrases.includes(sectorPhrase)) {
    quotedPhrases.push(sectorPhrase);
  }

  return {
    dreamText,
    interpretation: {
      roleTitle,
      seniority: deriveSeniority(roleTitle),
      sector: sectorPhrase || undefined,
      companyHints: [],
      locationHints: [],
      motivations: [],
      quotedPhrases,
      searchKeywords: toSearchLine(roleTitle),
    },
  };
}
