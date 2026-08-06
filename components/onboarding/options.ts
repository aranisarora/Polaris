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
}

/** The 7 named sectors, then "Something else" revealing the inline input. */
export const SECTOR_CHOICES: readonly SectorChoice[] = [
  { value: "engineering", title: "Engineering" },
  { value: "design", title: "Design" },
  { value: "product", title: "Product" },
  { value: "data", title: "Data" },
  { value: "marketing", title: "Marketing" },
  { value: "operations", title: "Operations" },
  { value: "healthcare", title: "Healthcare" },
  { value: "other", title: "Something else" },
];

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
 * Smart default for step 3, derived from what the dream interpretation
 * heard. Null when nothing points anywhere — no suggestion beats a wrong one.
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
