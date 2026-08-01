import type { College, Source, University } from "./types";

/**
 * Universities and colleges.
 *
 * `docs/product.md` §6: the affiliating university is the unit of scale, not
 * the college — VTU covers ~200 colleges on one calendar. So the calendar hangs
 * off the university and colleges only carry what actually differs: location,
 * tier, and whether they hold autonomous status.
 *
 * Autonomous colleges set their own calendar and exams, which breaks the shared
 * calendar advantage. They are still fully supported — the student enters two
 * exam dates once a semester (§6: "Do not hard-block non-VTU students").
 */

const COLLEGEDUNIA: Source = {
  label: "Collegedunia — VTU affiliated colleges, Bangalore",
  url: "https://collegedunia.com/engineering/bangalore/visvesvaraya-technological-university-vtu-affiliated-colleges",
  checkedOn: "2026-08-02",
};

export const UNIVERSITIES: University[] = [
  {
    code: "VTU",
    name: "Visvesvaraya Technological University",
    shortName: "VTU",
    state: "Karnataka",
    calendarMapped: true,
    sources: [
      {
        label: "VTU academic calendar",
        url: "https://vtu.ac.in/academic-calendar/",
        checkedOn: "2026-08-02",
      },
    ],
  },
  {
    code: "ANNA",
    name: "Anna University",
    shortName: "Anna University",
    state: "Tamil Nadu",
    calendarMapped: false,
    sources: [
      {
        label: "Anna University",
        url: "https://www.annauniv.edu/",
        checkedOn: "2026-08-02",
      },
    ],
  },
  {
    code: "AKTU",
    name: "Dr. A.P.J. Abdul Kalam Technical University",
    shortName: "AKTU",
    state: "Uttar Pradesh",
    calendarMapped: false,
    sources: [
      { label: "AKTU", url: "https://aktu.ac.in/", checkedOn: "2026-08-02" },
    ],
  },
  {
    code: "OTHER",
    name: "Another university",
    shortName: "Other",
    state: "—",
    calendarMapped: false,
    sources: [],
  },
];

export const UNIVERSITY_BY_CODE = new Map(UNIVERSITIES.map((u) => [u.code, u]));

/**
 * Tier is a matching key for proof records (`docs/product.md` §9.2.1), never a
 * judgement shown to a student. It exists so that "someone like you" means
 * someone actually like them.
 */
const vtu = (
  slug: string,
  name: string,
  area: string,
  tier: 1 | 2 | 3,
  autonomous = false,
): College => ({
  slug,
  name,
  universityCode: "VTU",
  city: "Bengaluru",
  area,
  tier,
  autonomous,
  sources: [COLLEGEDUNIA],
});

export const COLLEGES: College[] = [
  // ── The pilot shortlist · east Bangalore / Whitefield ──────────────────
  vtu("mvj-college-of-engineering", "MVJ College of Engineering", "Whitefield", 3),
  vtu(
    "cmr-institute-of-technology",
    "CMR Institute of Technology",
    "ITPL Main Road, Whitefield",
    2,
  ),
  vtu(
    "gopalan-college-of-engineering",
    "Gopalan College of Engineering & Management",
    "Whitefield",
    3,
  ),
  vtu(
    "east-point-college-of-engineering",
    "East Point College of Engineering & Technology",
    "Avalahalli",
    3,
  ),
  vtu(
    "new-horizon-college-of-engineering",
    "New Horizon College of Engineering",
    "Marathahalli",
    2,
    true,
  ),
  vtu(
    "cambridge-institute-of-technology",
    "Cambridge Institute of Technology",
    "KR Puram",
    3,
  ),
  vtu("sea-college-of-engineering", "SEA College of Engineering & Technology", "KR Puram", 3),

  // ── The wider Bengaluru roster ─────────────────────────────────────────
  vtu("rv-college-of-engineering", "RV College of Engineering", "Mysore Road", 2, true),
  vtu("bms-college-of-engineering", "BMS College of Engineering", "Basavanagudi", 2, true),
  vtu(
    "ms-ramaiah-institute-of-technology",
    "M. S. Ramaiah Institute of Technology",
    "Mathikere",
    2,
    true,
  ),
  vtu("bangalore-institute-of-technology", "Bangalore Institute of Technology", "VV Puram", 2),
  vtu("dayananda-sagar-college-of-engineering", "Dayananda Sagar College of Engineering", "Kumaraswamy Layout", 2, true),
  vtu("sir-mvit", "Sir M. Visvesvaraya Institute of Technology", "Hunasamaranahalli", 2),
  vtu("nitte-meenakshi-institute", "Nitte Meenakshi Institute of Technology", "Yelahanka", 2, true),
  vtu("rns-institute-of-technology", "RNS Institute of Technology", "Channasandra", 2),
  vtu("bnm-institute-of-technology", "BNM Institute of Technology", "Banashankari", 2, true),
  vtu("jss-academy-of-technical-education", "JSS Academy of Technical Education", "Uttarahalli", 2),
  vtu("acharya-institute-of-technology", "Acharya Institute of Technology", "Soladevanahalli", 3),
  vtu("atria-institute-of-technology", "Atria Institute of Technology", "Hebbal", 3),
  vtu("global-academy-of-technology", "Global Academy of Technology", "Rajarajeshwari Nagar", 3),
  vtu("rr-institute-of-technology", "RR Institute of Technology", "Chikkabanavara", 3),
  vtu("sapthagiri-college-of-engineering", "Sapthagiri College of Engineering", "Chikkasandra", 3),
  vtu("sjb-institute-of-technology", "SJB Institute of Technology", "Kengeri", 3),
  vtu("don-bosco-institute-of-technology", "Don Bosco Institute of Technology", "Kumbalgodu", 3),
  vtu("k-s-institute-of-technology", "K. S. Institute of Technology", "Kanakapura Road", 3),
  vtu("dr-ambedkar-institute-of-technology", "Dr. Ambedkar Institute of Technology", "Mallathahalli", 2),
  vtu("bangalore-technological-institute", "Bangalore Technological Institute", "Sarjapur Road", 3),
  vtu("t-john-institute-of-technology", "T. John Institute of Technology", "Bannerghatta Road", 3),
  vtu("impact-college-of-engineering", "Impact College of Engineering & Applied Sciences", "Sahakar Nagar", 3),
  vtu("nagarjuna-college-of-engineering", "Nagarjuna College of Engineering & Technology", "Devanahalli", 3),
  vtu("alphas-college-of-engineering", "Alpha College of Engineering", "Channasandra", 3),
  vtu("brindavan-college-of-engineering", "Brindavan College of Engineering", "Yelahanka", 3),
  vtu("city-engineering-college", "City Engineering College", "Kanakapura Road", 3),
  vtu("east-west-institute-of-technology", "East West Institute of Technology", "Anjananagar", 3),
  vtu("gopalan-school-of-engineering", "Gopalan School of Engineering & Technology", "Hoskote", 3),
  vtu("hkbk-college-of-engineering", "HKBK College of Engineering", "Nagawara", 3),
  vtu("mvj-school-of-engineering", "MVJ School of Engineering", "Channasandra", 3),
  vtu("rajarajeswari-college-of-engineering", "RajaRajeswari College of Engineering", "Kumbalgodu", 3),
  vtu("sambhram-institute-of-technology", "Sambhram Institute of Technology", "Vidyaranyapura", 3),
  vtu("srinivas-institute-of-technology", "Srinivas Institute of Technology", "Valachil", 3),
  vtu("the-oxford-college-of-engineering", "The Oxford College of Engineering", "Bommanahalli", 3),
  vtu("vemana-institute-of-technology", "Vemana Institute of Technology", "Koramangala", 3),
];

export const COLLEGE_BY_SLUG = new Map(COLLEGES.map((c) => [c.slug, c]));

export function getCollege(slug: string): College | undefined {
  return COLLEGE_BY_SLUG.get(slug);
}

/** Grad years offered in onboarding. A 3rd-year in Aug 2026 graduates in 2028. */
export const GRAD_YEARS = [2027, 2028, 2029, 2030];
