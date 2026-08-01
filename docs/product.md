# Polaris — Product Specification

**Status:** Pre-build. Phase 0 scoped, not started.
**Last updated:** 2 August 2026
**Companion documents:**
- [`research.md`](./research.md) — market evidence and data-source inventory
- [`platform.md`](./platform.md) — form factor, user stories, onboarding flow, page inventory

---

## 1. What Polaris is

Polaris takes a student from where they are today to being hireable for a specific target role, within a fixed deadline they cannot move.

It does three things:

1. Analyses the student's CV and academic record
2. Identifies the exact gap between them and their target role
3. Builds a constraint-based roadmap to close it in the time available

The initial market is India, starting with engineering colleges in Bangalore.

---

## 2. Thesis — why this, why now

Two facts define the opportunity:

**Indian engineering graduates are employable but not hired.** ~70% of engineering graduates are rated employable (CS 80%, IT 78%), yet only ~17% are hired. The failure is not capability. It is targeting, timing, eligibility, and signal.

**The undifferentiated fresher pipeline is collapsing.** Entry-level openings (0–2 years) fell ~44% year on year. Bulk service-company intake — which historically absorbed hundreds of thousands of mediocre graduates — is shrinking, because that tier of work is exactly what AI compresses. Simultaneously, Global Capability Centres are growing fast, paying 3–4× more, and hiring selectively. Bangalore alone hosts 880+ GCCs, 36% of India's GCC talent.

The strategic consequence:

> **The value of knowing exactly what your gap is, is inversely proportional to how easy it is to get a job.**

When TCS hired at volume against a 6.0 CGPA cutoff, differentiation was optional and this product would have had no market. As the safety net thins and the remaining good jobs demand demonstrable differentiation, gap analysis becomes existential. The market is moving toward us.

**Positioning consequence:** the goal is not "get placed." It is **"get placed somewhere that isn't the shrinking part of the market."**

---

## 3. Target customer

**Primary user:** 3rd-year (penultimate) B.Tech student, CSE / IT / ISE / ECE, at a Tier-2 or Tier-3 VTU-affiliated college in Bangalore, targeting a software role.

**Defined by target, not by department.** A large share of ECE, EEE and mechanical students target IT roles because that is where the jobs are. They are often the most anxious and least served. Do not exclude them.

### Why 3rd year specifically

The product's core mechanic is hard eligibility gates — CGPA floors and active backlogs. **Those are only fixable if semesters remain.**

| | 3rd year | Final year (Oct) |
|---|---|---|
| CGPA | Movable across 2–3 semesters | Effectively locked |
| Backlogs | Clearable | Mostly locked |
| Summer internship (→ PPO) | Ahead of them | Gone |
| Placement season | 12–18 months out | Already running |

Targeting final-years means targeting students we cannot help with our most important lever.

### The sales tension, and how it resolves

The TPO's urgency is about *final*-years — this year's placement number goes on next year's admissions brochure. We are most useful to the cohort below.

> **Final-years are the sales instrument. Pre-final years are the product.**

Run workshops with final-years, because before/after resume improvement is fast, visible and demoable — that is the proof artefact. Build the roadmap product for 3rd years. Pitch to the TPO as: *"We can't move this year's number much. We can move next year's, and we start now."*

### Three segments, three jobs

The 3rd-year is the *product* avatar — the mechanic requires remaining semesters and that does not change. But two adjacent segments do different work for the business, and treating all three as one funnel is a mistake.

| Segment | What they are for | Why |
|---|---|---|
| **Final-years and recent unplaced graduates** | **Cash and proof** | Maximum desperation, real willingness to pay, and — critically — they produce *outcomes in 3–6 months* rather than 18. Every one of them is a calibration record we would otherwise wait a year and a half for. |
| **3rd-years** | **The product and the moat** | The only cohort where eligibility repair works. Where the roadmap engine earns its keep. |
| **Colleges** | **Scale, once proof exists** | Distribution and unbiased denominators. Gated on evidence we cannot have on day one. |

This is not a loss of focus. It is the same engine (§12.1) run over a different dataset: for a graduate, eligibility repair degrades to a read-only ledger, and everything else — signal audit, reachability, roadmap, season tracker — works unchanged.

The binding constraint on this business is **proof**, not product. Every outcome that matters — a TPO signature, a student's belief, the price we can charge — is gated on evidence that takes a full placement cycle to accumulate. Working with people who already have outcomes is the only way to compress that.

### Explicitly out of scope for now

- Core mechanical / civil roles — different process, thinner data, weaker placement
- MBA — entirely different game (case interviews, B-school tiers, separate season)
- Non-tech roles
- Mid-career switchers (3+ years experience) — different product entirely

---

## 4. Positioning

| Against | Their position | Ours |
|---|---|---|
| **ChatGPT** | Generic advice from model weights | Every recommendation cites a fact the model could not know |
| **Superset** (incumbent, 600+ colleges, owned by Great Learning) | Owns the *transaction*: job posting → application → offer letter | Sits *upstream* — preparation, gap analysis, readiness. Not a competitor |
| **Free eligibility checkers** (PrepInsta, PapersAdda) | One company at a time, generic | Portfolio view across every recruiter that visits your campus, with trajectory maths and fixable-vs-permanent classification |
| **CV builders** (FlowCV, Enhancv, Zety) | Optimise the document | Plan the person. Never position as "the CV thing" |
| **VMock** (CV scoring, sold to universities) | Scores the document | Same distinction — we plan, they score |

### The design rule that keeps us out of wrapper territory

> **Every recommendation must contain a fact the model could not have known from its weights.**

If the output would be identical without our database, we built a wrapper. If it cannot be produced without our database, we built a product. Checkable feature by feature.

### The honest caveat

Every individual component of Polaris already exists free somewhere — eligibility checkers, GPA calculators, interview archives (GfG), resume checkers, company prep material.

**What does not exist is the integration.** Nobody takes *this* resume + *this* CGPA + *these* backlogs + *this* exam calendar + *this* target and produces one sequenced, deadline-aware plan that updates. The pieces are scattered across ten sites, and assembling them requires knowing what to look for — which is precisely what the student lacks.

That is a legitimate product. But **the pitch is synthesis, not information.** Never position as "we tell you the cutoffs."

---

## 5. Value proposition

Ranked by how much of the real pain each addresses:

1. **Calibration — "am I on track?"** The central pain. A 3rd-year is already *doing things* — LeetCode, projects, courses. What they cannot know is whether it is enough, or how they compare to people who made it. There is no scoreboard. That uncertainty is the daily suffering.
2. **Realism.** What is genuinely reachable given tier, CGPA, branch. Students err in both directions — some fixate on Google, others accept 3.5 LPA when 12 was reachable.
3. **Sequencing.** The scarce resource is time, not information. Order and deadlines, not a list.
4. **Honest signal audit.** Telling them the food-delivery clone is worth nothing. Nobody in their life will say this.
5. **Accountability.** Did you actually do it.

---

## 6. The moat

Separate two things that are easy to conflate:

**Facts** — calendar, recruiter roster, cutoffs, who-went-where. Mostly public or crowdsourceable. Cheap. Copyable. **Not a moat.** Treat as cost of entry and acquire the laziest way possible.

**Calibration** — *which actions actually change outcomes, for which students.* "Students at your tier with your CGPA who did X converted at 3× those who did Y." Cannot be scraped, bought, or reasoned out. Only exists after running cohorts through a full cycle. **This is the moat, and it compounds.**

A third, quieter one: **being the system of record.** Holding the student's resume versions, application log, interview history and prep record creates real switching cost.

### Why replicating to other colleges is good, not threatening

- If per-college setup is *expensive* → moat, but no scale. We become a consultancy.
- If per-college setup is *cheap* → we scale, and so could a competitor.

The second is strictly better, because the moat survives elsewhere:

- **The aggregate.** College #1's data improves the product for college #20. Recruiters overlap, roles overlap, what-correlates-with-an-offer generalises across the whole Tier-2/3 CSE population. Each college added makes the product better for all others.
- **The outcome loop.** Three cohorts of longitudinal data cannot be shortcut.
- **Access.** Placement data is not public; obtaining it requires trust.

**Colleges being similar is an advantage.** Eligibility rules are company-level and transfer nationally. Syllabus and calendar are per-*affiliating university*, not per-college — VTU covers ~200 colleges on one calendar. Recruiter rosters overlap 60–70%.

> **The affiliating university is the unit of scale, not the college.** Explicit design goal: a new college live in under a week, mostly self-serve.

### Data-asset portability

| Asset | Scope |
|---|---|
| Company eligibility registry | National |
| Interview process corpus | National |
| Resume anti-pattern taxonomy | National, arguably global |
| Action catalogue | Mostly national |
| Exam calendar, syllabus, grading | VTU-specific |

~80% is nationally portable. VTU is the starting point because the calendar layer comes free across ~200 colleges — not because the product only works there.

**Do not hard-block non-VTU students.** Degrade gracefully: everything works except exam-window-aware scheduling; let them enter exam dates manually. Expanding to Anna University or AKTU later is one new calendar, not a rebuild.

---

## 7. Business model and go-to-market

### Two payers, not one

**Correction to an earlier assumption.** "Students have no money" is not true of this avatar. These families already pay for JEE coaching, ₹1–4L/year in college fees, and placement prep — PrepInsta, Coding Ninjas, PW Skills, and bootcamps charging in the lakhs. *(Verify current price points before quoting externally.)* The market is not broke; it is **already spending on this exact outcome.**

The accurate version is narrower and more useful:

> **Students will not pay for information. They pay for outcomes and for accountability.**

Which is fine, because §4 already commits to selling synthesis rather than information.

**Colleges remain the larger and more durable payer.** Their incentive is stronger in India than anywhere else: placement percentage is the primary admissions marketing asset, drives next year's revenue, and feeds NAAC/NIRF. They already pay for pre-placement training — there is an existing budget line to displace, not a new category to invent. But a college sale is a 6–18 month cycle against an academic budget calendar, and building a company whose only revenue arrives on that clock is a cash-flow trap.

### Why charging students improves the moat

This is the argument that matters more than the revenue.

The moat (§6) is calibration — *which actions change outcomes*. That requires students to **actually execute**, so we can measure. Free users do not execute; every completion-rate figure in consumer edtech says so. A signup who abandons the roadmap in week two contributes nothing, and worse, teaches us what disengaged people do.

> **Price is a commitment filter. Charging is a data-quality decision before it is a revenue decision.**

Charging students does not touch Hard Rule 1 (§8). Affiliate revenue corrupts the recommendation engine because we are paid for *what* we recommend. Revenue from the student aligns it — we are paid for being right.

### The freemium line

Free forever, never gated, no account required:

- **The eligibility ledger** — the lead magnet and the share engine. Gating this would be self-harm
- **The signal audit**
- **The reachability set**
- **The full roadmap, visible.** Every task, every deadline, the whole two-semester shape

Free for the first **28 days**, then locked:

- The loop — check-in, verify, **re-plan**
- GitHub and LeetCode verification
- Auto-updating CV and export
- "People like you" records per company
- Placement season tracker

**Gate the mechanism, not the content.** A time-gated *preview* of the roadmap paywalls at the worst possible moment: around day 14 the student has completed one task, the readiness score has barely moved, and the reward loop of §11.5 has not yet landed. It also hides the persuasive part — the shape of the plan across two semesters — while showing the dull foundational weeks.

Showing the whole plan costs nothing and is screenshot-shareable. What students will pay for is the thing that stops them abandoning it, because every one of them has abandoned a plan before. A static roadmap without accountability is worth approximately nothing, and they know it.

Two consequences:

1. **Losing a mechanism beats never seeing it.** Twenty-eight days covers four check-in cycles and three or four completed tasks — enough for at least one visible win before anything locks.
2. **A mechanism gate supports renewal; a content gate does not.** Re-planning as reality diverges is an ongoing service, so the student has a reason to pay again next year. Unlocking hidden content is spent the moment it is revealed.

**Pricing:** test in the ₹999–4,999 band for **12 months' access, charged once**. A single payment is a far easier decision for a student than a recurring commitment, and consumer subscription churn in this segment is punishing — take the renewal decision annually rather than fighting a monthly one. Expect to be too cheap on the first attempt.

**Peak willingness to pay is not day 28.** It is the **re-shock** — the moment a cleared backlog flips seven companies red→green in front of them. If that event falls inside the free window, put the upgrade prompt there rather than on a timer.

### Sequencing — product first, data second

Cold-asking a TPO for placement data before having a product is the hardest version of that conversation: a stranger requesting student personal data (DPDP Act 2023 applies) in exchange for a promise.

Flip it. With 200 of their 3rd-years already using Polaris, walk in with: *"38% of your CSE cohort is ineligible for your top five recruiters — here are the 30 closest to threshold."* Now the TPO wants the conversation.

> **Product-first creates pull. Data-first requires a cold ask.**

### What colleges give that students cannot

Not facts — students know the facts better. Colleges give:

1. **Distribution.** 300 students in a room in one afternoon.
2. **Money.** The only revenue source.
3. **Unbiased denominators.** The critical one — students who got offers report; students who got rejected go quiet. Building calibration on self-reported outcomes teaches us *"everyone who does X succeeds"* because failures never reported. The TPO has the complete list. This matters later, for calibration, not at launch.

### Selling before we have proof

Sell the **diagnostic**, not the outcome. A report stating *"42% of your final-year students are ineligible for your top three recruiters — 18 on CGPA, 31 on active backlogs, here are the 30 closest to threshold"* requires zero efficacy evidence. It is simply true, actionable this semester, and no TPO currently has it.

For proof, measure a **leading** indicator visible in six weeks, not placement a year out. Cleanest: **shortlist rate**. In the workshop itself, run before/after resume scoring by a recruiter or TPO staff — cheap, visual, becomes the slide that sells college #2.

Trade terms with college #1 explicitly: free or near-free, in exchange for placement data, permission to publish results, and a TPO testimonial.

### Second-order data business

- **Colleges (now):** cohort analytics, cross-college benchmarking. *"Your CSE cohort sits 23% below the VTU median on product-company readiness."* Their brochure number.
- **Employers (year 2+, carefully):** a verified candidate pool from Tier-2/3 colleges is genuinely valuable — companies struggle to source outside the top tier. But the moment students suspect they are being sold, honest self-reporting stops and data quality dies. Opt-in only, student-controlled, and not until the core product is loved.

---

## 8. Hard rules

1. **No course/edtech affiliate revenue. Ever.** It is the easiest early money and it will kill us. The instant the roadmap recommends a course we are paid to recommend, the recommendation engine is corrupted — and the recommendation engine *is* the product.
2. **The LLM is never the source of a fact.** Facts come from the database; the model reasons over retrieved rows.
3. **Never ask for data as a favour.** Capture it as a byproduct of something the student already wants.
4. **Track outputs, not inputs.** A course is an input; the artefact it produces is the output.
5. **Do not manufacture generic candidates.** If the roadmap outputs "300 LeetCode problems and a CRUD app," we are producing exactly the profile the market is rejecting. Differentiation is the objective function, not volume of activity.

---

## 9. Product surfaces

Four outputs, in this order — the order does emotional work.

### 9.1 The countdown

*"Placement registration closes in 31 weeks. You have 2 exam windows and 1 summer in between. Usable time: ~340 hours."*

Converts vague dread into a number. Pure calendar arithmetic. **Framing only — low standalone value.**

### 9.2 The eligibility ledger — the credibility artefact

*"Of the 23 companies that recruited at colleges like yours last year, you are eligible for 9. You are locked out of Wipro and 6 others by 2 active backlogs. You are locked out of Infosys by 1.2% on your 12th, which is permanent. Your CGPA is 6.4; clearing the 7.0 gate requires averaging 7.9 across your remaining 3 semesters."*

100% arithmetic — no AI judgment. Undeniable. Also does something rare: **states what is permanently closed**, so students stop wasting time on it.

**Four required components:**

1. Current eligibility across the full recruiter set
2. Fixable-vs-permanent classification
3. Required-average trajectory maths
4. **At least one "someone like you" record** — see below

### 9.2.1 The proof component — do not ship the ledger without it

Every surface in this section tells the student what is *wrong*. Nothing tells them the outcome is *achievable*. That is a serious omission, because belief is a multiplier: a ledger that only closes doors produces despair and churn rather than engagement.

The fix is one row, drawn from the interview corpus (§13.1, asset 2), matched on college tier, CGPA band and branch:

*"Someone from a VTU Tier-3 college with a 6.2 CGPA and one cleared backlog got into [Company]. Here is their round-by-round process."*

This is also the layer research identifies as underexploited (`research.md` §3.3) and the one that answers the student's actual question — *can someone like me get in, and how did they do it?* It is a hard requirement of the ledger, not a later enhancement.

### 9.3 The signal audit — the emotional payload

Brutal, specific, unflattering. *"Your three projects are a food-delivery clone, a library management system, and a portfolio site. These appear on hundreds of thousands of Indian resumes. Your GitHub has 4 commits, all on one day. Your resume's differentiating signal is: none."* Then what to build instead, sized to the time actually available.

Being usefully harsh is a deliberate product decision. A general assistant will not do it.

### 9.4 The roadmap

Closable gaps scheduled against exam windows, placement dates, and the registration cutoff. Every deadline derived from the real calendar, never invented.

### 9.5 The loop

Check in, verify, re-plan. **This is what makes it a product rather than a one-time artefact.**

Two mechanisms drive return visits:

- **A readiness score that moves.** One number, benchmarked against people who got the target role, changing as they act.
- **The placement-season workflow.** During season a student tracks: which companies are coming, am I eligible for each, when does registration close, what is this company's process, what happened in my interview. This currently lives in WhatsApp groups and notebooks. Superset handles the *college's* side of the transaction, not the student's preparation. Own this and retention is automatic.

### 9.6 TPO dashboard (Phase 3)

Cohort eligibility gaps, students closest to thresholds, readiness by recruiter. The thing that renews the contract.

---

## 10. Onboarding

**Principle: deliver the shock before asking for anything else.**

Full flow, copy and screen-by-screen detail in [`platform.md`](./platform.md) §3. The load-bearing decisions:

### 10.1 The ledger requires no resume

**Correction to an earlier draft, which opened with resume upload.** The eligibility ledger is 100% arithmetic on seven fields, none of which is the CV. Putting a file upload in front of it taxes the funnel at its most valuable point — in a 300-person workshop, a large share of the room has no PDF on their phone, on saturated college wifi.

The resume moves *after* the ledger, where it stops being a cost and becomes the price of something they now want.

1. **College · branch · graduation year** — three taps. College from a dropdown of VTU colleges, never free text
2. **CGPA · active backlogs · 10th % · 12th %** — four numbers they know by heart
3. **Target** — sector-level, from a short list (product SWE / service IT / data / core / undecided). Not free text
4. **→ The eligibility ledger.** No account, no upload, ~45 seconds in
5. *Then* the resume, to unlock the signal audit — **this is where the account is created**, at peak emotional charge
6. *Then* constraints — hours/week, location, financial floor — at plan-generation time
7. *Then* GitHub connect, framed as "verify your projects," not "give us data"

The 10th/12th percentages matter more than students realise: Infosys gates at 65% across all three levels, TCS at 60% across all three. Revealing *"your 12th marks have permanently closed this door"* during onboarding is the moment they realise we know something they don't.

### 10.2 The countdown is a loading state

§9.1 concedes the countdown has low standalone value. It has high value as the *wait*: while eligibility resolves, the screen counts up the weeks, the exam windows, and the ~340 usable hours. Dead time becomes emotional priming, and it costs one component.

### 10.3 Composition of the shock

The ledger must contain **exactly one permanent loss and at least one fixable win**, plus the proof record from §9.2.1. Loss alone produces despair and churn. Loss plus a lever plus evidence someone like them made it produces action.

### 10.4 The no-CV path is mandatory

Most of a workshop room has no resume to hand, and this is the single largest drop-off in the funnel. Four routes into the signal audit, all first-class:

| Route | Notes |
|---|---|
| **Upload CV** | The default |
| **Connect GitHub** | The best signal available and already planned in §11.2. For the no-CV path, promote it from verification to a primary intake route — repos, languages, commit history and README text are better audit input than any student LinkedIn profile |
| **Import from LinkedIn** | Routes to a 3-tap instruction card for LinkedIn's own *Save to PDF* export, which our parser already reads. **Not an API integration — one does not exist.** See §10.5 |
| **Answer 6 questions** | Guided intake producing structured CV entities from scratch. Frequently yields *better* data than a student's LinkedIn, because we ask the right questions |

### 10.5 LinkedIn autofill — investigated, not buildable

Recorded so it is not re-proposed:

- **Sign In with LinkedIn (OIDC)** grants only `openid`, `profile`, `email`. `profile` is the documented *lite* profile — member ID, name, picture. No positions, education or skills. The legacy scopes that returned those sit behind LinkedIn's Partner Program.
- **Member Data Portability (3rd Party)** does return full profile data, but only EEA members may consent. Our users are in India. Unusable.
- **Scraping and resale vendors** violate LinkedIn's user agreement and are actively litigated. Unusable for a business that must sign a DPDP-compliant data agreement with a college.
- **It would not help anyway.** A 3rd-year Tier-3 student's LinkedIn is typically a headline and three endorsed skills. The signal audit needs projects and commit history, which LinkedIn does not hold and GitHub does.

**Where LinkedIn does belong: as an output.** We cannot read their profile, but we can write it. Generating a headline and About section from the structured CV entities is nearly free, completes a real §11.1 artefact-hygiene task, and improves their actual hiring surface.

Sign In with LinkedIn is still worth offering **as an auth method** — one-tap signup and a verified email — alongside Google. Just never as a data source.

### 10.6 On target discovery

A genuinely clueless student cannot complete step 3 — and that is often why they are stuck. Resolution for v1: accept **sector-level** input, and frame the output as **reachability, not aspiration** — safe / stretch / reach sets with what each requires. Full guided target discovery is a later feature.

---

## 11. The roadmap engine

### 11.1 Task categories, in leverage order

1. **Eligibility repair** — clear backlog X by the supplementary exam; hit Y CGPA this semester. Binary, verifiable, gates everything else
2. **Aptitude prep** — underrated, highest ROI. The "employable but not hired" gap is often the aptitude round, which is pure practice
3. **DSA** — patterns and volume, against the target company's actual bar
4. **One genuinely differentiated project** — the signal fix
5. **Internship applications** — the PPO route, hard deadlines
6. **Core CS** (OS / DBMS / CN) — interview fodder
7. **Artefact hygiene** — GitHub, LinkedIn, resume

### 11.2 Verification

**GitHub OAuth** is the single best mechanism available. Free API, students have accounts, automatically verifies the highest-value task type. Also powers the signal audit with real evidence — *"4 commits, all on one day."* Zero ongoing student effort.

**LeetCode username** — one text field, then automatic solved-count tracking thereafter.

Those two cover most verifiable work. Everything else falls back to a one-tap checkbox, plus marksheet upload for CGPA and backlogs (which students receive anyway).

### 11.3 Friction rules

- Check-in answerable in **under 30 seconds on a phone**
- **Every input must visibly change something they see.** Never ask a question whose answer only benefits us
- **Tasks sized to one week.** "Build a project" is not a task; "push the schema and first commit" is
- **Plan is long, view is short.** Surface at most 3 active items. A 40-item roadmap is demotivating and gets abandoned — keep the full plan visible, surface only this week

### 11.4 Courses — recommend, never track

No integration. Udemy's progress/completion tracking (xAPI) is Udemy Business / Enterprise only; there is no consumer OAuth exposing individual learner progress. Coursera is the same.

But the API is not the real reason. **Courses are the lowest-signal action in the catalogue.** Completion is trivially gameable, and Indian students already massively over-invest in certificates — recruiters hire portfolios, not certificates. A readiness score that rises on course completion manufactures exactly the undifferentiated candidate the market is rejecting.

**GitHub is already the course-tracking integration.** Recommend a course where it is the right *means*; score only the artefact it produces.

Two exceptions that carry real weight in India, verifiable by credential ID or badge URL — no integration needed:
- **Proctored cloud certifications** — AWS, Azure, GCP (genuine value for cloud/DevOps/data roles)
- **NPTEL** — IIT-run, proctored exam, real standing

### 11.5 CV auto-update and export

**Auto-update as tasks complete is not a supplementary feature — it is the reward mechanism of the loop.** Student does a project → CV visibly improves → readiness score moves. That reinforcement is what stops the roadmap becoming an abandoned to-do list. It also makes us the system of record for their CV.

> **Architectural consequence to act on in week 2, even though the feature ships later: store the CV as structured entities, not a PDF blob.** Projects, skills, education, experience as rows. A blob makes auto-update impossible forever without a rewrite.

**Export:** build it, cheap (HTML → PDF), ATS-safe. Table stakes — auto-update is pointless if the file cannot leave. But never lead with it; the moment students call us "the CV thing," positioning is lost.

---

## 12. Architecture principles

1. **Generic engine, specific content.** The engine is segment-agnostic: parse CV → resolve target → diff against reference class → generate candidate actions → schedule under constraints. All segment-specific content — action catalogue, reference profiles, role requirements, constraint types — lives in the database. Get this split right and a new segment is a new dataset; get it wrong and it is a rewrite.
2. **Facts from the database, reasoning from the LLM.** Eligibility, cutoffs, dates, processes all retrieved. The model sequences, explains and writes prose. Show the provenance: *"Wipro requires 0 active backlogs [Wipro 2026 criteria] — you have 2."* This makes hallucination structurally hard, makes output visibly non-generic, and earns trust when we say something unwelcome.
3. **Structured CV entities from day one.**
4. **Store every raw input forever** — the original CV file, exact onboarding answers, target as typed. Storing only the parsed version means a parser bug in month two destroys the data permanently.
5. **Version every analysis output.** When a prompt changes, we must know which users received which version, or we can never tell whether we improved anything.
6. **Responsive web first; PWA when the loop ships; never native.** The acquisition path is a link forwarded into a WhatsApp group, and an install step between that link and the ledger destroys the funnel. Shareable results need URLs, which a native app cannot provide. Full reasoning and the performance budget in [`platform.md`](./platform.md) §1.

---

## 13. Phase 0 — the only thing being built

**Hard constraint: the product must be useful to a single student when nobody else is on the platform.** If it is not useful cold, nothing later saves it.

### 13.1 Data assets to build (this *is* the work)

Two sizes per asset: **ship-at** is the minimum that produces the shock and gets in front of a student; **target** is where it needs to land before the first workshop.

| # | Asset | Ship at | Target | Method |
|---|---|---|---|---|
| 1 | **Company registry** | **15 companies** | 40–60 | Hand-curated. Fields: 10th %, 12th %, UG cutoff, active-backlog policy, gap policy, branch eligibility, package band, process stages, on/off campus, typical timing |
| 2 | **Interview process corpus** | **60 records** | 300–500 | Scrape GfG + LLM-extract: company, role, campus type, rounds, topics, outcome, college tier |
| 3 | **VTU calendar** | 1 dataset | — | Scrape + parse PDFs from vtu.ac.in |
| 4 | **Resume anti-pattern taxonomy** | **20 patterns** | ~50 | Hand-authored. Authored judgment, not data |
| 5 | **Action catalogue** | **20 items** | 80–150 | Hand-authored. Each tagged: effort hours, lead time, evidence value, prerequisites, deadline sensitivity |

Plus **Adzuna** (free India REST API) for live demand signal.

**Ship at the smaller number.** Fifteen companies covers most of the actual recruiter roster at a single pilot college, and the roadmap surfaces three items at a time (§11.3) — a 150-item catalogue is invisible to the user in week one. Curating the full target set before any student sees the product is two to three weeks of procrastination wearing a spreadsheet. Get to a student, then widen.

The corpus (asset 2) must be sampled to cover the CGPA and tier bands our own users occupy, not just the most-read posts — otherwise §9.2.1's proof record has nothing to match against.

Do it in spreadsheets and import — do not build admin tooling yet.

### 13.2 Automate vs hand-author

**Automate the volume:** GfG corpus (clean HTML, structured archives — extract *facts*, do not republish prose; rate-limit politely), VTU PDFs, Adzuna, college placement PDFs.

**Hand-author the judgment:** company eligibility criteria — the bottleneck is not collection but *reconciliation*. Sources contradict each other and go stale. ~50 companies is a day of verification, and this is the data where being wrong is most damaging: one incorrect cutoff and the student stops trusting everything else. Also hand-authored: anti-pattern taxonomy and action catalogue.

> **Do 20 records by hand before writing any scraper.** Hand-doing them is how the schema is discovered. Build the scraper first and it will automate the wrong shape.

### 13.3 Build sequence

| Weeks | Work |
|---|---|
| 1 | Company registry at **15** + VTU calendar + a corpus slice deep enough for §9.2.1. Boring. Everything downstream is empty without it |
| 1–2 | 7-field intake → **eligibility ledger**, plus the share page. No resume, no account. Ship this |
| 2–3 | Resume/GitHub/6-question intake → structured CV entities → **signal audit**. Account created here |
| 3–4 | Reachability set (safe / stretch / reach) |
| 4–5 | Roadmap generation against the calendar |
| 6 | The loop — check-in, verify, re-plan. GitHub OAuth. PWA layer |

**Ledger + signal audit is the first shippable artefact.** The ledger alone is credibility but thin; the audit is what makes it shareable. Get the ledger in front of a student in **week 2**, not week 3 — it has no resume dependency and no account, so nothing blocks it but the registry.

### 13.4 Not building in Phase 0

TPO dashboard · multi-college support · employer side · native mobile app · target discovery · CV export · cross-college benchmarking · any admin tooling

Also not in Phase 0: **the PWA layer** (manifest, service worker, web push). It arrives with the loop in week 6, because before there is a loop there is nothing to notify anyone about, and a service worker shipped early buys only cache-invalidation bugs. See [`platform.md`](./platform.md) §1.

### 13.5 The Phase 0 test

Not "would a college buy this." The only question:

> **Find one real 3rd-year VTU CSE student — named, specific, a friend or cousin. Would they forward it to a friend without being asked?**

Students share things that feel like inside information. The ledger and signal audit have that quality; a generic roadmap does not. Building for a named person is what keeps Phase 0 from drifting generic.

---

## 14. Later phases (not being built now — recorded for direction only)

**Phase 1 — workshops as harvest (months 2–6).** Final-years and recent graduates are the richest source because they *have* outcomes. One workshop ≈ 100 outcome records + resume before/afters + a testimonial. Survivorship bias starts here — capture rejections deliberately, ask directly, normalise it.

**Phase 2 — first calibration (months 6–18).** A cohort completes a cycle. Now we can say things nobody else can.

**Phase 3 — colleges pay.** TPO dashboards, cross-college benchmarking.

---

## 15. Pilot college shortlist

Confirmed VTU-affiliated, east Bangalore / Whitefield:

| College | Location | Notes |
|---|---|---|
| MVJ College of Engineering | Whitefield | Est. 1982, 15-acre campus |
| CMR Institute of Technology | Whitefield / ITPL Main Rd | Est. 2000, NAAC A++, NIRF band 151–200 — strongest of the cluster |
| Gopalan College of Engineering & Management | Whitefield | Est. 2010 |
| East Point College of Engineering & Technology | Avalahalli | VTU affiliated |

Also worth checking in the wider east/ORR belt: New Horizon (Marathahalli), Cambridge Institute of Technology (KR Puram), SEA College (KR Puram). **Verify affiliation status individually** — some VTU colleges hold *autonomous* status and set their own calendar and exams, which breaks the shared-calendar advantage.

**Recommendation:** lean toward MVJ or Gopalan over CMRIT. CMRIT is the strongest of the four, meaning its students have the most existing support and the least acute problem. The product is sharpest where placement outcomes are worst.

---

## 16. Open questions

| # | Question | Why it matters |
|---|---|---|
| 1 | Which specific college for the pilot? | Determines whether the calendar layer is plain VTU or bespoke autonomous |
| 2 | Who is the named first student? | Phase 0 drifts generic without a specific person to build for |
| 3 | Is there a route in — TPO contact, faculty, society? | Gates the workshop timeline |
| 4 | Can we get placement data informally, even one year? | Determines whether the reference class comes from their data or public corpora. Note: outcome records can also be **bought directly from students** — paying a small amount per verified report, with a premium for rejections, inverts the survivorship bias deliberately and needs no college relationship |
| 5 | Confirm the "get out of the shrinking tier" framing | Changes emphasis across positioning and the action catalogue |
| 6 | **The free window closes two weeks before peak willingness to pay.** §7 puts the 28-day gate at week 4 and identifies the **re-shock** as the real conversion moment; `platform.md` §2.2 places the re-shock at **week 6**. As written, the student hits the paywall a fortnight *before* the event that would have converted them, and the §7 escape hatch — *"if that event falls inside the free window, put the upgrade prompt there"* — does not fire, because in the stated arc it does not | Directly determines conversion rate. Three candidate resolutions: extend the window to ~45 days; make the gate **event-based** rather than timed (lock on the *first* re-shock, whenever it lands); or keep 28 days and accept that eligibility-repair students convert on a later cycle. Decide before the first cohort — §5.1's constraint 4 means the clock is recorded from the very first account and cannot be retrofitted |

---

## Appendix — glossary

| Term | Meaning |
|---|---|
| **VTU** | Visvesvaraya Technological University — Karnataka state technical university, headquartered in Belagavi. ~200 affiliated engineering colleges follow its syllabus and calendar; VTU sets and conducts semester-end exams and awards the degree |
| **Affiliated vs autonomous** | Affiliated colleges follow VTU's calendar and exams. Autonomous colleges (granted status by VTU) set their own |
| **TPO / Placement cell** | Training & Placement Office — runs campus recruitment, enforces eligibility, holds outcome data |
| **PPO** | Pre-Placement Offer — a full-time offer converted from a summer internship. Highest-leverage move available to a 3rd-year |
| **GCC** | Global Capability Centre — an offshore in-house centre of a multinational. Bangalore hosts 880+ |
| **LPA** | Lakhs Per Annum — standard Indian salary unit. 1 lakh = 100,000 INR |
| **Active backlog** | An uncleared exam subject. Distinct from a *cleared* historical backlog — the distinction is load-bearing for eligibility |
| **NIRF** | National Institutional Ranking Framework — government ranking; colleges submit placement data publicly |
| **NAAC** | National Assessment and Accreditation Council — accreditation body |
| **DPDP Act 2023** | Digital Personal Data Protection Act — India's data protection law. Applies to student personal data |
