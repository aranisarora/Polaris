# Polaris — Market Research & Data Source Inventory

**As of:** 2 August 2026
**Purpose:** Evidence base for [`product.md`](./product.md). Figures here go stale — re-verify before quoting externally.

---

## 1. Market conditions

### 1.1 Employability vs hiring — the central gap

| Metric | Value | Source |
|---|---|---|
| Engineering graduates rated employable (2026) | ~70.15% (down from 71.5% in 2025) | India Skills Report 2026 |
| Computer Science employability | ~80% | India Skills Report 2026 |
| IT employability | ~78% | India Skills Report 2026 |
| Engineering graduates actually hired | ~17% | Reported alongside a 71% employability figure |

India Skills Report is the 13th edition, published by ETS with CII, AICTE, AIU and Taggd.

**Interpretation:** the failure is not capability. Students are employable and not converting. The gap is targeting, timing, eligibility and signal — which is the product's whole thesis.

### 1.2 The entry-level squeeze

- Entry-level openings (0–2 years experience) fell to ~10,000 from ~13,000 in May 2026 — a **~44% YoY decline**
- Analyst framing: automation is reducing the need for young graduates *"unless they have specialised skill sets"*
- IT services fresher intake is flat-to-down and increasingly selective; the profile is shifting toward "AI-native" graduates

### 1.3 But large-scale hiring continues

- **Infosys** — hit its 20,000 fresher target for FY26, repeating for the current fiscal year; 4,000 onboarded in Q1 FY27
- **TCS** — ~14,000 freshers onboarded, net addition 9,279 in Q1 FY27, $9.5B order book
- Naukri JobSpeak: white-collar hiring opened 2026 with 3% YoY growth, driven by non-IT sectors *and* fresher hiring

### 1.4 GCCs — the growth story

| Metric | Value |
|---|---|
| Operational GCCs in India | 1,700–1,900 (projected 2,100+ by 2030) |
| GCC professionals employed | ~1.9M (FY24), double-digit growth |
| **Bangalore GCC units** | **880+ — ~36% of all GCC talent in India** |
| GCCs expecting up to 20% increase in fresher hiring | 64% |
| GCC roles announced in last 12 months | 50,000+ |
| New GCC jobs anticipated in 2025 | ~364,000 |
| Projected fresher jobs from GCCs by 2030 | ~400,000 |
| Fresher package, GenAI / data engineering skills | ₹10–18 LPA |

**Critical detail:** GCCs are *"often bypassing traditional recruitment methods in favour of hackathons and specialised internship programmes."*

This means the highest-paying opportunities **do not come to campus.** A Tier-3 student's TPO cannot help them access these, because the TPO only knows the companies that show up. That is a gap with no incumbent.

### 1.5 Synthesis

> Tech is not dying. **The undifferentiated fresher pipeline is dying.**

The bulk service-company intake that absorbed hundreds of thousands of mediocre graduates is shrinking, because that tier of work is exactly what AI compresses. GCCs are simultaneously booming, paying 3–4×, and hiring selectively.

This is a tailwind. When TCS hired at volume against a 6.0 CGPA cutoff, nobody needed gap analysis. As the safety net thins, knowing your gap becomes existential.

---

## 2. Competitive landscape

### 2.1 Superset — the incumbent to know about

- Official campus placement portal for **600+ Indian colleges**
- Founded 2016 in Bengaluru by Pranjal Goswami and Naman Agrawal
- Acquired by Great Learning (BYJU'S group), February 2022
- Function: end-to-end campus recruitment automation — job posting, outreach, assessments, virtual interviews, offer letters, analytics

**Assessment: not a competitor.** Superset owns the *transaction* and serves the college's administrative workflow. It does not do preparation, gap analysis, or student readiness. Polaris sits upstream.

**Positive signal:** 600+ TPOs already buy software. The category is established; we are not inventing a budget line.

### 2.2 Other players

| Player | What they do | Overlap |
|---|---|---|
| **Unstop** (formerly Dare2Compete) | Gamified hiring, hackathons, case competitions, employer branding | Adjacent — relevant as an *action* in the roadmap, not a competitor |
| **PrepInsta / PapersAdda / FastGPACalc** | Free eligibility checkers, GPA calculators, company prep material | Direct component overlap — but one company at a time, generic, no trajectory maths |
| **VMock** | CV scoring sold to universities | Closest positioning risk. They score the document; we plan the person |
| **FlowCV / Enhancv / Zety / Novoresume** | CV builders | Commoditised. Avoid being categorised here |
| **"AI career roadmap" content sites** | SEO blogspam | No real product competitor found in the gap-analysis space |

**Conclusion:** every component exists free somewhere. The integration does not exist. Position on synthesis, never on information.

---

## 3. Data source inventory

### 3.1 The locality ladder

How local we can get with **zero college relationships**:

| Rung | What it gives | Availability |
|---|---|---|
| **L1 — Market** | Live demand: roles, skills, salaries | ✅ Adzuna free India REST API |
| **L2 — Company** | Exact eligibility + full interview process | ✅ Extensively published |
| **L3 — Company × college tier** | What it took for someone *like you* | ✅ Underexploited — GfG corpus |
| **L4 — University (VTU)** | Exam windows, semester dates, syllabus, grading | ✅ Public on vtu.ac.in |
| **L5 — College** | Recruiter roster, past packages | 🟡 Semi-public — aggregators, brochures, placement PDFs |
| **L6 — Student** | Resume, CGPA, backlogs, constraints | ✅ They provide it |

**~80% of the locality is reachable with no college relationship.** Genuinely missing: per-company cutoffs *as actually enforced at a specific college*, and complete denominators (who applied and failed).

### 3.2 Source-by-source assessment

| Source | Content | Availability | Effort |
|---|---|---|---|
| **vtu.ac.in** | Academic calendar, exam timetables, syllabus | Public, PDF | Medium — PDF parsing, LLM-assisted |
| **GeeksforGeeks Company Interview Corner** | Interview experiences, company-wise, thousands of posts, India-heavy | Public HTML, structured archives | Medium — scrape + LLM extract |
| **Adzuna** | Live job postings, salaries, 19 countries incl. India | Free tier REST API | Low |
| **NIRF** | Placement rate + median salary per college, downloadable PDF/Excel | Public | Low — but self-reported, light verification, inflated |
| **College placement PDFs** | Named lists: student, branch, company, CTC | Semi-public — college sites, Scribd | Medium — bespoke format per college |
| **Shiksha / Careers360 / CollegeDekho / KollegeApply** | Aggregated per-college placement stats and recruiter lists | Public | Low — but stale and inflated |
| **Company career pages + prep sites** | Eligibility criteria | Public but contradictory | **Hand-verify** |
| **AmbitionBox / Glassdoor** | Salary, interview questions, reviews | Public | Low–medium |
| **Students themselves** | Real cutoffs, actual process, who came | Free, self-correcting at volume | Low — but survivorship-biased |
| **TPO** | Complete outcomes incl. rejections, denominators | Relationship required | High |

### 3.3 The GfG corpus — why it matters more than expected

GfG's contribution format explicitly asks authors to state:

- Recruitment channel — on-campus / pool campus / off-campus / referral
- Restrictions that applied — branch, percentage criteria, gender
- **How many students were selected from their college**
- The full round-by-round process and questions asked
- **Whether they were selected or rejected**

That last item is significant: **the public corpus contains failures, not just successes.** It partially solves the survivorship-bias problem using data available today for free.

Combined with the frequent mention of the author's college, this makes **L3 (company × college tier)** reachable from public data — the layer nobody is currently exploiting, and the one that answers a Tier-3 student's real question: *"can someone like me actually get in, and how did they do it?"*

### 3.4 Course platform APIs — investigated, rejected

- **Udemy:** progress and completion tracking (xAPI Progress/Completion events) is **Udemy Business / Enterprise plan only**, designed for corporate LMS integration. No consumer OAuth exposing individual learner progress to a third party.
- **Coursera:** same pattern — APIs are enterprise-oriented.

Conclusion: the integration does not exist. See `product.md` §11.4 for why we would not want it regardless.

**Verifiable alternatives requiring no integration:** AWS / Azure / GCP certifications (credential ID or Credly badge URL), NPTEL (certificate number, proctored exam, real standing in India).

---

## 4. Company eligibility reference — sample

Illustrative of the registry's shape. **Verify before use — criteria change per drive and per batch.**

| Company | 10th / 12th | UG | Active backlogs | Other |
|---|---|---|---|---|
| **TCS (NQT)** | 60% each | 60% / 6.0 CGPA | **Max 1** | Age 18–28; total gap ≤2 years. Cleared historical backlogs do not disqualify |
| **Infosys** | **65%** each | **65%** | — | Raised from the 2024 batch onward; higher bar than peers |
| **Wipro** | — | 6.0 CGPA cumulative across *all* semesters (not per-year) | **Zero at application** | A final-sem backlog causes rejection at document screening even after clearing all rounds |
| **Accenture** | — | 60% / 6.0 (some sources cite 65%) | — | — |

**Why this table is the product in miniature:** a student with two active backlogs is fine for TCS, dead for Wipro, and does not know it. Precise, machine-checkable, consequential, and invisible to a general assistant.

---

## 5. Pilot college candidates — east Bangalore / Whitefield

| College | Location | Affiliation | Notes |
|---|---|---|---|
| MVJ College of Engineering | Whitefield | VTU | Est. 1982, 15-acre campus |
| CMR Institute of Technology | Whitefield / ITPL Main Rd | VTU | Est. 2000, NAAC A++, NIRF band 151–200 |
| Gopalan College of Engineering & Management | Whitefield | VTU | Est. 2010 |
| East Point College of Engineering & Technology | Avalahalli | VTU | — |

**To verify:** New Horizon (Marathahalli), Cambridge Institute of Technology (KR Puram), SEA College (KR Puram) — and whether any of the above hold *autonomous* status, which would break the shared-calendar advantage.

---

## 6. Sources

**Market**
- [India Skills Report 2026 coverage](https://news.careers360.com/india-skills-report-2026-cs-computer-science-it-engineer-top-jobs-mba-employment-decline-ai-ml-bfsi-fmcg-pharma-women-hiring)
- [Engineering talent gap: 71% employable, 17% hired](https://education.sakshi.com/en/engineering/education-news/engineering-talent-gap-71-employable-only-17-hired-183130)
- [Fresher hiring drop amid AI adoption](https://www.outlookbusiness.com/corporate/india-incs-fresher-hiring-sees-steep-drop-amid-ai-adoption)
- [Infosys 20,000 campus hires](https://www.whalesbook.com/news/English/technology/Infosys-Plans-20000-Campus-Hires-Bets-Big-on-AI-Talent/6a6bf0a90f4505b5a039e84d)
- [TCS Q1 FY27 fresher hiring](https://www.ownyourcareer.in/blog/tcs-q1-fy27-hiring-9279-freshers-july-2026-india-results)
- [GCC employment stats India](https://flexiple.com/global-capability-centers/employment-stats-for-global-capability-centers-in-india)
- [GCC fresher jobs projection to 2030](https://news.careers360.com/indias-gcc-workforce-expected-create-4-lakh-jobs-for-freshers-2030-firstmeridian/amp)
- [Naukri JobSpeak 2026](https://www.naukri.com/blog/naukri-jobspeak-white-collar-hiring-opens-2026-with-3-yoy-growth-driven-by-non-it-sectors-and-fresher-hiring/amp)

**Competitive**
- [Superset](https://joinsuperset.com/)

**Data sources**
- [VTU academic calendar](https://vtu.ac.in/academic-calendar/)
- [GfG Company Interview Corner](https://www.geeksforgeeks.org/interview-experiences/company-interview-corner/)
- [GfG interview experience format](https://www.geeksforgeeks.org/interview-experiences/write-interview-experience/)
- [Adzuna developer API](https://developer.adzuna.com/)
- [NIRF](https://www.nirfindia.org/)
- [Udemy Business xAPI](https://business-support.udemy.com/hc/en-us/articles/4419782043543-Udemy-Business-Integration-xAPI-Statements)

**Eligibility criteria**
- [TCS NQT criteria](https://prepinsta.com/tcs-nqt/eligibility-criteria/)
- [Wipro criteria](https://papersadda.com/article/wipro-eligibility-criteria-2026/)
- [Minimum CGPA by company](https://gradekar.com/blog/minimum-cgpa-for-placements)

**Colleges**
- [CMRIT](https://www.cmrit.ac.in/) · [MVJCE](https://mvjce.edu.in/about-us/about-mvjce/) · [VTU affiliated colleges, Bangalore](https://collegedunia.com/engineering/bangalore/visvesvaraya-technological-university-vtu-affiliated-colleges)
