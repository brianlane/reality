# Agent-to-Agent Compatibility: Product Brief

**Status:** Concept → brief → infrastructure-grounded revision.
Written Oct 22, 2026. Revised same day after full audit of `brianlane/reality`.
**Companion doc:** `agent-to-agent-compatibility.md` (original brainstorm capture)

---

## 0. Infrastructure audit (Oct 22, 2026)

Audited via fresh clone of the public `brianlane/reality` repo plus a live
check of www.realitymatchmaking.com (HTTP 200, live).

**Stack:** Next.js (App Router) + TypeScript · Prisma 7 + PostgreSQL ·
Supabase (storage) · Clerk (auth) · Stripe (payments) · Vercel (hosting,
single keep-alive cron) · Sentry. Node 24. No AI SDK, no LLM provider, no
job queue. Voice answers transcribed via Groq/HuggingFace — the only ML
integration, and it's transcription, not agency.

**Product model (important):** this is *not* a swipe app. It's a curated,
event-based matchmaking service: paid application → admin screening
(background checks via Checkr + Idenfy, FCRA-compliant, GREEN/YELLOW/RED
flags) → speed-dating events (~20 capacity) → curated matches. High-trust,
high-touch, human curators in the loop.

**What already exists that the brief needs:**

- **Scoring engine** (`src/lib/matching/weighted-compatibility.ts`, ~780
  lines + tests): 0–100 weighted compatibility across all active questionnaire
  questions, per-question `mlWeight`, `isDealbreaker` (violation → score 0),
  cross-question importance modulation, and **cross-pair scoring** (asymmetric
  status-vs-preference pairs, e.g. "has pets" vs "okay with partner's pets").
  Returns score + per-question breakdown + violated dealbreakers. This is
  *the* compatibility engine — the agent layer consumes it, not replaces it.
- **Questionnaire:** 10+ DB-driven pages (consent, demographics, dating
  history/goals, values, conflict resolution, decision making, attraction,
  connection/chemistry, finances/career, household, tech boundaries),
  multiple question types (RADIO_7, POINT_ALLOCATION, RANKING, voice).
  Conflict style, repair, boundaries, emotional regulation, love expression,
  independence, finances, household standards, readiness — all present.
- **Longitudinal schema (tables exist, population unknown):** `Match.outcome`
  enum runs PENDING → FIRST_DATE_SCHEDULED → … → RELATIONSHIP → ENGAGED →
  MARRIED (plus NO_CONNECTION, GHOSTED). `MatchAnalytics` holds post-date
  ratings/feedback from both sides + relationship tracking. `Match` carries
  `day30FollowUp`, `day90FollowUp`, `month6FollowUp` JSON fields.
- **In-person data hooks:** `EventInvitation` has `blindNotes`,
  `faceToFaceNotes`, and `interestedIn` arrays — observed-at-event data
  already has a home.
- **Research moat in progress:** Prolific integration including *couples*
  PIDs (`prolificPartnerPid`) — actual relationship research running.
- **Audit pattern:** `ScreeningAuditLog` establishes the pattern for "who
  saw what, when" — directly reusable for pouch-exchange auditing.

**What does not exist:** any agentic infrastructure. No LLM calls, no agent
framework, no async job system beyond one cron. The agent layer is fully
greenfield; everything below is designed to bolt onto this stack.

---

## 1. Vision

Reality Matchmaking's frontier feature: personal AI agents that know their
principals deeply negotiate compatibility privately, so humans meet prepared
instead of performing. Agents handle everything that isn't presence; humans
bring the presence.

**Non-negotiable design principle:** agents *prepare* humans for each other,
never *decide* for them. Screening layer, not decision layer.

---

## 2. Problems it solves

1. **Self-report is weak.** Profiles describe who people wish they were. An
   agent that has lived alongside its principal holds *observed* behavioral
   patterns: how they actually handle conflict, what they keep repeating,
   where their words and actions diverge.
2. **The disclosure paradox.** The most predictive data (attachment wounds,
   triggers, active personal work) is exactly what people least want to hand
   to a stranger. Agent-mediated exchange resolves it: summaries cross,
   stories don't.
3. **First dates are interviews.** When the fundamentals are pre-cleared,
   humans can be present instead of interrogating each other. Chemistry gets
   room to breathe.

---

## 3. Core loop, mapped to the real product

The existing flow is applicant → screening → event → curated match →
follow-ups. The agent layer slots into it, it doesn't replace it:

1. **Application (exists).** Questionnaire submit. *New:* a server-side agent
   job generates a versioned `AgentProfile` summary per applicant.
2. **Screening (exists, human).** *New:* curators see an AI briefing in the
   admin dashboard alongside flags and scores — fault lines narrated, not
   just numbers.
3. **Pre-event.** Agents exchange pouch summaries for candidate pairs;
   each applicant gets a personal briefing (2–3 conversation threads, 1–2
   things to be aware of) before the event.
4. **Event (exists).** Humans meet. Agents are silent. Existing
   `blindNotes`/`faceToFaceNotes` capture remains.
5. **Match + dates (exists).** `Match.outcome` advances as today.
6. **Debrief (schema exists, needs writers).** Post-date, each agent runs a
   short debrief with its principal; structured outcomes land in
   `MatchAnalytics` + the day30/90/6mo follow-up fields. Agents compare
   notes. Both profiles update. The flywheel spins.

---

## 4. Agent protocol sketch

**Phase 1 needs no protocol at all.** Everything runs server-side inside the
Next.js app (Vercel AI SDK fits the stack natively): intake summarization,
curator briefings, applicant briefings. No cross-agent messaging.

**Protocol becomes real at Phase 3** (third-party agents), and only then:
JSON over HTTPS (evaluate MCP as the ecosystem matures), handshake with
principal verification, capability exchange (thin vs. deep agent, honestly
labeled), tiered pouch exchange, message types `POUCH_OFFER` /
`DEALBREAKER_HIT` / `CLEAR` / `NEEDS_HUMAN_INPUT`. Hard rule, structural
not policy: raw narrative never crosses between agents.

---

## 5. Data model, mapped to the Prisma schema

**Tier 1 — agent-to-agent (consented), derived from existing data:**
- Conflict style, repair capacity → Questionnaire Page 4 answers
- Values, life satisfaction → Page 3
- Life architecture → Pages 1 (family/children), 8 (finances/career),
  9 (household), demographics (location, age)
- Readiness → `relationshipReadinessFlag` + Page 2
- Attachment style → *gap:* not directly measured; derive heuristically
  from conflict/repair/boundary answers in Phase 1, add dedicated items
  in Phase 2

**Tier 2 — never crosses:** free-text answers (`TEXTAREA`/`RICH_TEXT`),
voice transcripts, `blindNotes`/`faceToFaceNotes`, debrief transcripts.
Agent's own briefing use only.

**New models required (all fit existing conventions):**
- `AgentProfile` — versioned derived summary per applicant (recomputed on
  questionnaire change / debrief).
- `PouchExchange` — audit log of what was shared with whom, when
  (follows the `ScreeningAuditLog` pattern).
- `Briefing` — generated briefs (curator-facing and applicant-facing),
  stored for audit and quality review.

---

## 6. Compatibility engine: consume, don't rebuild

The weighted engine already does dealbreaker veto (`isDealbreaker` → 0),
weighted scoring, importance modulation, and asymmetric cross-pair checks,
returning score + full breakdown + violated dealbreakers. **The agent layer
does not rebuild this.** It consumes `ScoringResult` and adds the two things
code can't do:

1. **Fault-line narration** — LLM turns the per-question breakdown into
   human-readable "watch here" items, each paired with the conversation
   that resolves it. Ranked, never a single success percentage.
2. **Briefing generation** — turns fault lines + shared ground into 2–3
   natural first-date threads and practical guidance.

This keeps the deterministic math where it belongs (tested TypeScript) and
puts the LLM only where judgment-like narration is needed.

---

## 7. Consent flows

- **Onboarding consent:** what the agent may hold, which tiers may be shared.
  Plain language. (Questionnaire already opens with a consent page — extend
  the pattern, don't reinvent it.)
- **Per-dimension toggles:** lock any dimension ("never share anything
  about my family") at any time.
- **Pre-exchange review (optional):** inspect the pouch summary before it
  goes. Default off, available for the cautious.
- **Revocation:** one tap to pull a dimension or go dark. Immediate.
- **Debrief consent:** post-date notes belong to the principal; sharing even
  structured outcomes requires per-date opt-in.

---

## 8. Front end and UX surface

The brief so far is backend-heavy. The feature lives or dies on these
surfaces:

**Applicant-facing**

1. **Agent onboarding** — where trust is won or lost. Plain-language
   explanation of what the agent is, what it will hold, and the tier model.
   Per-dimension consent toggles live here. Smart defaults; progressive
   detail (consent fatigue is the enemy).
2. **The briefing (signature surface).** The pre-date brief must feel like a
   friend's advice, not a report card: 2–3 conversation threads with *why*
   they matter, fault lines framed as "things to explore" rather than
   warnings. Never show raw scores or red/yellow/green labels on a person
   to applicants — the engine's 0–100 stays internal/curator-side.
3. **Pouch inspector (optional mode).** For the cautious: see exactly what
   summary your agent is about to share, approve or edit first.
4. **Audit log.** "What my agent shared, with whom, when." Plain-language
   table. Non-negotiable for trust.
5. **Debrief chat.** Post-date, conversational and short, structured
   underneath: "how did it go?" → guided follow-ups → captured into
   `MatchAnalytics` + follow-up fields.
6. **Kill switch.** One-tap "go dark": revoke all sharing, pause the agent.
   Instant and obvious.

**Public pages**

- **Landing page.** New positioning block required. The current site sells
  curated events + rigorous screening; the agent feature must extend that
  story ("prepared, not performing"), never read as a pivot to bot-dating.
  Proposed narrative spine: "Our curators have always prepared your
  matches. Now your agent prepares you."
- **How it works / trust page.** The tier model and "what never crosses"
  translated into plain language. This is where the privacy architecture
  becomes marketing copy — non-negotiable before asking anyone to hand an
  agent their love life.
- **Apply flow.** Agent opt-in moment: create or connect your agent as part
  of the application, carrying the consent toggles. Extends the existing
  Page 0 consent pattern rather than inventing a new one.
- **Applicant dashboard.** New surfaces: briefing inbox, agent depth
  indicator ("your agent knows you well" vs. "still learning" — honest
  labeling per the thin-agent rule), audit log, kill switch.
- **Phase 3 addition:** developer page for third-party agents implementing
  the open protocol.

**Positioning caution.** The brand edge is high-trust human curation plus
serious screening. The agent feature must read as "curation, extended by
AI," not "AI replaces curators." Get the landing page wrong and you torch
the brand you're building on.

**Curator/admin-facing**

7. **Briefing panel** in the existing admin dashboard, next to flags and
   scores. Same fault-line narration, curator tone (direct, operational).
   This is Phase 1's visible surface.

**UX risks**

- **Briefing leaks:** the generator must never let Tier 2 material into a
  briefing. "Ask about her relationship with her family" is fine; "her
  father was…" is a violation. Hard tier boundary in the generator.
- **Verdict anxiety:** anything that grades a human triggers defensiveness.
  No numbers on people, ever, applicant-side.
- **Agent framing:** always "your agent," never "the system." The user must
  feel principal, not product.

## 9. Privacy & security architecture

- **Data minimization:** agents hold full profiles; only Tier 0/1 summaries
  cross. Tier 2 never leaves the server.
- **Blast radius by design:** pouch summaries are structured and shallow.
- **Audit log:** `PouchExchange` shows the user exactly what their agent
  shared, with whom, when — same trust pattern as `ScreeningAuditLog`.
- **FCRA note:** the product already handles regulated screening data with
  unusual care (status-only storage, audit logs). The agent layer must meet
  that bar, not lower it. Keep agent data strictly separated from
  background-check data.

---

## 10. Failure modes & mitigations

| Failure mode | Mitigation |
|---|---|
| False negatives (agents kill a pairing that had chemistry) | Veto only on hard dealbreakers (already the engine's semantics); agents never reject on "vibe" |
| Gaming (users coach agents to present well) | Weight observed behavior (event notes, debriefs, follow-ups) over claimed traits; cross-check drift over time |
| Judgment atrophy (humans stop choosing) | Curators stay in the loop (this product already has them); applicant briefings end with open questions, not verdicts |
| Cold start (thin agents give thin results) | Questionnaire bootstraps; depth labeled honestly; value grows with tenure and debriefs |
| Privacy breach | Tiered model + audit log + shallow pouches; FCRA-grade separation from screening data |
| Retention paradox (success = churn) | Price for the outcome, not the seat; debrief/post-mortem features retain users *between* relationships |

---

## 11. Phased rollout (stack-concrete)

**Phase 1 — Server-side briefings (no protocol, no external agents).**
Add Vercel AI SDK. On questionnaire submit, async job writes `AgentProfile`.
Admin dashboard gains an AI briefing panel next to flags/scores. Applicants
get a pre-event briefing. Start writing debriefs into `MatchAnalytics` +
follow-up fields. Success metric: curators and applicants say the briefing
changed the event for the better.

**Phase 2 — Paired pouches.**
Pre-event, hosted agents exchange Tier 1 summaries for candidate pairs and
brief each side. Post-event debrief loop writes structured outcomes both
ways. `PouchExchange` audit live.

**Phase 3 — Open protocol.**
Third-party agents implement the spec; handshake, capability exchange, and
message types go live. The protocol becomes the moat, not the app.

**New infrastructure per phase:** Phase 1 needs an LLM provider + async job
handling (Vercel Cron exists; evaluate Inngest/Trigger.dev for real
workflows). Phase 2 needs nothing new beyond Phase 1. Phase 3 needs the
protocol spec + principal verification.

---

## 12. Open questions (updated — stack questions resolved)

1. **LLM provider:** OpenAI vs Anthropic via Vercel AI SDK. Cost per
   briefing at event scale (~20 applicants/event) needs modeling.
2. **Protocol governance:** open spec or proprietary? Decide before Phase 3.
3. **Business model:** subscription? Per-brief fee? Outcome pricing?
   (Success = churn; don't sell seats.)
4. **Attachment measurement:** derive from existing Page 4 items, or add a
   dedicated validated instrument?
5. **Follow-up population:** the day30/90/6mo schema exists — are the
   writers built, and is the data flowing? The debrief flywheel depends on it.
6. **Principal verification** for Phase 3 handshakes; age verification;
   harassment vectors in agent messaging.
7. **Legal:** which jurisdiction's privacy law governs pouch contents?
   Deletion semantics across two agents' stores?

---

## 13. Relationship to existing work

The v1 questionnaire + `weighted-compatibility.ts` (weights, dealbreakers,
importance modulation, cross-pair scoring) is the static individual layer,
and it's genuinely sophisticated — the brief's original "build a
compatibility engine" framing was wrong; the engine exists. The agent
layer's job is narration (fault lines, briefings), progressive disclosure
(Tier 1/2 as the connection deepens), and closing the longitudinal loop
the schema already anticipates (`MatchAnalytics`, follow-ups, outcome
enum). The Prolific couples research is the long-term data moat this whole
thing compounds into.
