# Polaris — Platform Specification

**Status:** Pre-build. Companion to [`product.md`](./product.md).
**Last updated:** 2 August 2026
**Scope:** form factor, user stories, onboarding flow, page inventory, build order.

`product.md` decides *what* Polaris is and who pays. This document decides *what gets built and in what order.*

---

## 1. Form factor

### 1.1 The decision

| Phase | Form factor |
|---|---|
| **Phase 0** | Mobile-first responsive website. No PWA layer, no service worker |
| **Phase 1** (when the loop ships, ~week 6) | Add the PWA layer — manifest, install prompt, web push |
| **Ever** | **No native app** |

### 1.2 Why web

**An install between the WhatsApp link and the shock kills the funnel.** Student acquisition is a screenshot forwarded into a group chat. That link must resolve to the ledger in a few seconds. Any install step in between forfeits most of the traffic — and with it the only zero-cost distribution channel available.

**The share mechanic requires URLs.** `/r/[slug]` with an Open Graph preview is what makes the audit spread. A native app cannot produce a link that renders a preview card in WhatsApp. That constraint alone settles the question.

**The workshop scenario is web-shaped.** Three hundred students, one lecture hall, saturated campus wifi, mixed budget Android. Server-rendered HTML with a small JS payload works. "Everyone please install our app" burns ten minutes of a sixty-minute session and loses the room.

**Install friction in this market is real.** Budget Android with 32–64GB storage is why Lite apps exist in India. These users ration installs. That is not a fight worth having for a product they have known about for four minutes.

**Web push already covers the market.** Android Chrome has supported the Web Push API for years with no install required, and Android is the overwhelming majority of this avatar's devices. iOS supports web push only for home-screen-installed sites, but iOS is a small share here. The retention channel is available without asking for anything.

### 1.3 Why the PWA layer waits until Phase 1

Phase 0 ships the ledger and the audit — one-time, viral surfaces with no retention to serve. A service worker before there is a loop is pure cost: cache invalidation bugs, stale-content reports, and debugging time that does not exist yet.

Once §9.5's loop ships, the PWA layer earns its place:

- Home-screen icon → a habit surface for the weekly check-in
- Web push → the re-engagement mechanism the loop depends on
- Offline caching → the roadmap stays readable on bad campus wifi

> **Prompt the install after the first completed task, never on first visit.** An "add to home screen" dialog before value has landed is the most-ignored prompt on the web. After a win — readiness score moved, CV updated — it converts.

### 1.4 Notifications

Web push is the Phase 1 default because it is free and requires no install on Android.

**WhatsApp is likely to outperform it and should be evaluated in Phase 2.** It is where these students already are, and where placement-season chatter already happens. The Business API charges per conversation, so it is a cost decision rather than a technical one.

> **Design consequence:** the weekly check-in must be completable from a deep link, so the delivery channel is swappable without touching the check-in itself.

### 1.5 Performance budget

Non-negotiable, because the funnel's most valuable moment is also its most fragile.

| Path | Budget |
|---|---|
| Ledger interactive — mid-range Android, 4G | **< 3s** |
| Onboarding start → shock | **< 90s**, thumb-reachable, no file upload |
| Client JS on the ledger path | Minimal. Server-render it |
| Share page `/r/[slug]` | Static or edge-cached. Must survive a group chat opening it 200 times |

**Desktop is first-class for `/cv` and `/roadmap`.** Deep work — editing CV entities, reading the full plan — is not a phone task. Mobile-first does not mean mobile-only.

The existing stack (Next.js App Router, RSC, Supabase) is already the right shape. The discipline required is keeping client JS off the ledger path.

---

## 2. User stories

### 2.1 Build for this person

**Meera, 3rd-year CSE, MVJ College of Engineering (VTU), Whitefield.**

CGPA 6.4 · 2 active backlogs · 10th 72% · 12th **63.8%** · GitHub: 4 commits, all one day · LeetCode 120 solved, 90% easy · 40% through a Udemy full-stack course with nothing shipped · Projects: a food-delivery clone, a library management system, a portfolio site.

They are not lazy. They are busy doing the wrong things in the wrong order, and nobody has told them.

§13.5 requires a *named, real* student. Meera is the placeholder until that person exists — replace them.

### 2.2 The arc

| When | What happens | Function |
|---|---|---|
| **T+0s** | Arrives from a friend's WhatsApp screenshot. No signup. Seven fields | Acquisition |
| **T+45s** | **Ledger.** Eligible for 9 of 23. Locked out of Wipro +6 by 2 backlogs — *fixable*. Locked out of Infosys by 1.2% on their 12th — *permanent* | Activation |
| **T+60s** | *"Someone from a VTU Tier-3 college, 6.2 CGPA, one cleared backlog, got into [Company]. Here's the round-by-round."* | Belief (§9.2.1) |
| **T+2m** | *"Nine doors are open. Eligible isn't hired. Want to know why you won't convert?"* → **account created here** | Capture at peak charge |
| **T+4m** | **Signal audit.** Brutal, specific. *"Your differentiating signal is: none."* | Emotional payload |
| **T+5m** | Screenshots it. Sends it to three friends | Referral |
| **Day 1** | Returns for the roadmap. Gives hours/week, connects GitHub | Retention begins |
| **Week 1** | Task: *"Push the schema and first commit."* Forty minutes. Readiness 31 → 34. CV updates itself | **First win < 7 days** |
| **Week 4** | Free loop window closes. Plan stays visible; accountability locks | Conversion |
| **Week 6** | Backlog cleared. Seven companies flip red → green *in front of them* | **The re-shock** |
| **Month 5** | Summer internship applications, sequenced against the real calendar → PPO route | Outcome |
| **Month 14** | Season tracker replaces their WhatsApp group | System of record |

**The Phase 0 test, restated:** does Meera screenshot the audit without being asked?

### 2.3 The stories that gate Phase 0

Ranked by proximity to the shock, not by build order.

```
1. As a 3rd-year, I want to know which companies I am already
   disqualified from, so I stop spending time on closed doors.
   ✅ Renders in < 60s. No file upload. No account.

2. As a 3rd-year, I want fixable separated from permanent,
   so I know what to fight and what to let go.
   ✅ Every locked row classified, with the arithmetic shown.

3. As a 3rd-year, I want to see someone like me who made it,
   because I do not believe this is reachable.
   ✅ ≥1 real record matched on tier + CGPA band + branch.

4. As a 3rd-year, I want to know whether my profile is actually
   differentiated, because nobody in my life will tell me.
   ✅ Names my specific projects and says what they are worth.

5. As a 3rd-year with no resume on my phone, I want to get the
   audit anyway.
   ✅ Four intake routes, all first-class (§3.4).

6. As a 3rd-year, I want to know what to do *this week*,
   not a 40-item list.
   ✅ Max 3 active items. Each ≤ 1 week. Each verifiable.

7. As a 3rd-year, I want my CV to improve as I do the work,
   so effort compounds instead of evaporating.
   ✅ Task completion mutates structured CV entities.

8. As a 3rd-year, I want to see my whole plan before I pay
   for anything.
   ✅ Full roadmap visible free. Only the mechanism gates.
```

Story 3 is the one most easily dropped under time pressure and the one that most damages the product if it is. See `product.md` §9.2.1.

---

## 3. Onboarding

**Principle: deliver the shock before asking for anything else.**

### 3.1 The ungated path — no account, ~45 seconds

```
┌────────────────────────────────────────────────────────────┐
│  1. College       [dropdown · VTU list · never free text]  │
│     Branch        [chips]                                  │
│     Grad year     [chips]                         → 3 taps │
│                                                            │
│  2. CGPA · Active backlogs · 10th % · 12th %               │
│     "Four numbers you know by heart."          → 4 fields  │
│                                                            │
│  3. Target sector [product SWE / service IT / data /       │
│                    core / not sure yet]           → 1 tap  │
│                                                            │
│  ⏳ LOADING = THE COUNTDOWN                                 │
│     "Placement registration: 31 weeks."                    │
│     "2 exam windows. 1 summer."                            │
│     "Usable time: ~340 hours."   ← counts up, then holds   │
│                                                            │
│  ▶ THE LEDGER                                              │
│     • 9 of 23 open                                         │
│     • 🔴 PERMANENT  Infosys — 12th 63.8% vs 65%            │
│     • 🟡 FIXABLE    Wipro +6 — 2 active backlogs           │
│     • 📈 CGPA 6.4 → 7.0 needs 7.9 avg over 3 semesters     │
│     • 👤 "Someone like you got in. Here's how."            │
│                                                            │
│     [ Share ]        [ Save my ledger ]                    │
└────────────────────────────────────────────────────────────┘
```

### 3.2 The gate

Placed at maximum emotional charge, not at zero:

> **"Nine doors are open. Eligible isn't hired. Show me your profile and I'll tell you why you won't convert at any of them."**

Account is created here. Everything before this point is anonymous.

### 3.3 After the gate

Signal audit → reachability set → constraints (hours/week, location, financial floor) → roadmap → GitHub connect → first task, sized to finish inside a week.

### 3.4 Intake routes — all four are first-class

| Route | Notes |
|---|---|
| **Upload CV** | The default |
| **Connect GitHub** | Best available signal. Repos, languages, commit history, README text |
| **Import from LinkedIn** | Opens an instruction card for LinkedIn's own *Save to PDF* export — three taps in their app, and our parser already reads the result. The student experiences a LinkedIn import; nothing is built and nothing can be switched off. See `product.md` §10.5 for why the API route does not exist |
| **Answer 6 questions** | Guided intake → structured CV entities. Always available |

### 3.5 Rules

| Rule | Why |
|---|---|
| **No account before the ledger** | Every field asked before value is delivered is conversion tax |
| **The countdown is a loading state, not a page** | §9.1 concedes low standalone value; as framing during the wait it is free |
| **Exactly one permanent loss, at least one fixable win, one proof record** | Loss alone → despair → churn. Loss + lever + evidence → action |
| **Every input visibly changes something** | §11.3, extended to onboarding. Never ask a question whose answer only benefits us |
| **Share is a primary button** | Referral is the entire student acquisition mechanism |
| **College is a dropdown, target is a chip set** | Free text here destroys the join to the registry and the calendar |

---

## 4. Page inventory

### 4.1 Public — no account

| Route | Job | Phase |
|---|---|---|
| `/` | **Is the tool.** Field one above the fold. Not a hero carousel | 0 |
| `/check` | The ungated ledger flow (§3.1) | 0 |
| `/r/[slug]` | Shareable ledger card + OG image. The referral engine | 0 |
| `/companies/[slug]` | *"TCS NQT eligibility 2027."* One page per registry row — zero marginal content cost, ends in "check your own eligibility" | 0–1 |
| `/colleges/[slug]` | *"MVJ placements 2026."* Also a TPO honeypot — they search for their own college | 1 |
| `/for-colleges` | TPO landing. One CTA: request the cohort diagnostic | 1 |
| `/pricing` | The freemium line, stated plainly (`product.md` §7) | 1 |
| `/privacy` · `/terms` | DPDP Act 2023. Not optional with student data and a college contract ahead | 0 |

`/companies/*` is close to free: the registry is being curated regardless, and these are the queries free eligibility checkers already rank for. It converts search intent directly into the funnel.

### 4.2 Student app — account required

| Route | Job | Free / Paid | Phase |
|---|---|---|---|
| `/today` | Home. **Max 3 items.** Readiness score, countdown | Paid after 28d | 0 |
| `/ledger` | Full recruiter set · fixable-vs-permanent · trajectory maths · proof record | **Free** | 0 |
| `/audit` | Signal audit | **Free** | 0 |
| `/reach` | Safe / stretch / reach | **Free** | 0 |
| `/roadmap` | **The whole plan, always visible.** Sequenced against exam windows | **Free** | 0 |
| `/roadmap/[task]` | Task detail, evidence requirement, verification | Paid after 28d | 0 |
| `/check-in` | < 30s on a phone. Needs a URL for push and WhatsApp deep links | Paid after 28d | 0 |
| `/connections` | GitHub OAuth, LeetCode handle | Paid after 28d | 0 |
| `/cv` | Structured entities, version history, ATS-safe export | Paid | 1 |
| `/companies/[slug]` | In-app: process corpus + "people like you" | Paid | 1 |
| `/season` | Placement season tracker. **The lock-in** | Paid | 2 |
| `/settings` | Account, data export, deletion (DPDP) | Free | 0 |

> **`/roadmap` stays free deliberately.** Showing the whole mountain costs nothing, is the most persuasive artefact we own, and is screenshot-shareable. What converts is losing the mechanism that makes the plan happen — not being denied sight of it.

### 4.3 TPO — Phase 1+

| Route | Job | Phase |
|---|---|---|
| `/tpo/report/[cohort]` | The cohort diagnostic. Ship as a generated PDF long before any dashboard | 1 |
| `/tpo` | Cohort eligibility, students nearest thresholds, readiness by recruiter | 3 |
| `/tpo/students/[id]` | Drill-down | 3 |

### 4.4 Not building

Native app shell · admin tooling (§13.4) · employer surface · multi-university calendar switching · any `/tpo` route before proof exists.

---

## 5. Build order

**Six routes constitute Phase 0:**

```
/            /check        /ledger
/audit       /r/[slug]     /today
```

Then, in order: `/roadmap` → `/roadmap/[task]` → `/check-in` → `/connections` → PWA layer.

`/r/[slug]` looks optional and is not. It is the only thing that makes the product spread without someone standing in a lecture hall.

### 5.1 Sequencing constraints

1. **`/ledger` has no resume dependency and no auth dependency.** Nothing blocks it but the company registry at 15 rows. It ships first, in week 2.
2. **Structured CV entities before `/audit`.** `product.md` §11.5 — a PDF blob makes auto-update impossible without a rewrite later. This is a week-2 decision even though `/cv` ships much later.
3. **Analysis versioning before the first real user.** §12.5 — retrofitting which prompt version a user received is impossible after the fact.
4. **The free-window timer before `/check-in`.** The 28-day clock starts at account creation and must be recorded from the first account, or the first cohort has no enforceable boundary.

---

## 6. Open platform questions

| # | Question | Blocks |
|---|---|---|
| 1 | Does LinkedIn's *Save to PDF* flow work on the LinkedIn Android app in its current version? | The §3.4 LinkedIn intake route. Verify on a real mid-range Android device before writing the instruction card |
| 2 | Auth providers — Google only, or Google + LinkedIn? | Signup friction; LinkedIn adds a verified email and a career-context signal |
| 3 | Payment rail — UPI one-time via Razorpay/Cashfree, or a card subscription? | `product.md` §7 leans one-time, which favours UPI |
| 4 | Does the readiness score get a public name? | It appears on the share card, so it is a positioning decision as much as a product one. **Proposed answer in [`brand.md`](./brand.md) §15 #1: _Altitude_, on a 0–90° scale** — the measured angle to Polaris, and a degree scale avoids being read as an exam mark by someone who is graded constantly. Needs a yes/no, not more options |
| 5 | Anonymity model for `/r/[slug]` — how much of a student's data is on a shareable public URL? | DPDP exposure and how shareable the artefact actually is. Default to college + branch + year + counts, never name or exact CGPA unless opted in |
| 6 | **"Phase 0" is used for two different scopes in this document.** §5 says *"six routes constitute Phase 0"* (`/`, `/check`, `/ledger`, `/audit`, `/r/[slug]`, `/today`), but §4.2 also marks `/reach`, `/roadmap`, `/roadmap/[task]`, `/check-in` and `/connections` as Phase 0 | Ambiguous scope at the moment work starts. Suggest naming them separately — **Phase 0a** (the six routes, weeks 1–3) and **Phase 0b** (roadmap and loop, weeks 4–6) — so "is this in Phase 0" has one answer |
| 7 | Does the §11 gesture layer in [`brand.md`](./brand.md) ship inside Phase 0? | It needs ≥ 2 tabs to be worth anything and must never delay the ledger. `brand.md` §15 #6 recommends plain links first, gesture layer once `/roadmap` lands |
