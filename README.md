# Cornerman

**The AI sales coach that drills your real weak spot.**

> Cornerman diagnoses an Australian residential real-estate agent’s losing pattern from seeded call outcomes, runs a live ElevenLabs objection roleplay, scores it against the agency’s own playbook, and lets the principal correct the coach when they disagree — with the correction carrying a reason and applying to future drills.

Forward: AI in Business Hackathon · Track 1 + Built With ElevenLabs

## For judges — use the deployed link (no keys needed)

**You do not need API keys to test the live site.** Secrets are already configured on Vercel.

1. Open the **production URL**
2. Sign in with a demo account (any password):
   - Employee: `alex@northline.demo`
   - Manager: `jordan@northline.demo`
3. Walk the loop: Profile → Learn → Practice → Progress (employee) or Team → Playbook → Evidence (manager)

Cloning the repo is **optional** (for code review or local hacking). Only local clones need you to create a `.env.local`.

## Cloning locally (optional — any OS)

**Yes — install/run works on Windows, macOS, and Linux** with **Node.js 20+**.

| Step | Cross-OS? | Notes |
|------|-----------|--------|
| `npm install` | Yes | [nodejs.org](https://nodejs.org) LTS |
| `npm run dev` | Yes | `next dev` — no Unix-only `NODE_ENV=` prefix |
| `npm run build` / `start` / `eval` | Yes | Standard tooling |

Locally, features that call external APIs need keys in `.env.local` (see below). On the **deployed** URL, those keys are already set — judges should use that.

## Scope (locked)

| In | Out (kill list) |
|---|---|
| Diagnose weak spot from seeded call outcomes | Live CRM / call-recording pipe |
| Live spoken objection roleplay (ElevenLabs) | Multi-vertical “any sales team” |
| Rubric scoring grounded in firm playbook | Manager “who’s failing” surveillance board |
| Re-practice + progress over time | Mobile apps, payments, full SSO |
| Rep-owned sharing + manager coaching notes | Invented prices / ungrounded “best practice” |
| Playbook import (PDF) → draft → Publish | Production IdP / magic links |

## What’s in the product

**Employee:** Profile · Learn · Practice · Progress (+ header inbox bell)  
**Manager:** Team · Playbook · Evidence  

- Demo login (work email + **any password**)
- Live drills with cue modes **Guided → Hints → Unaided**, recorded on the attempt so a
  score can be read as earned with or without help
- Reflection (“what went wrong” / “next time I will”) kept with the attempt and in the
  take-away PDF — not on the manager report
- Playbook: download sample PDF, parse (AI or rules), clear knowledge base, publish to live
- Manager “Leave a note” → employee inbox (Supabase)
- Refusal rubric for “Not interested” scenarios — respecting a clear no is the
  heaviest criterion, so booking the appointment is not the only way to win
- **Calibrate the coach:** a principal who disagrees with a score picks the criterion,
  sets the score they believe is right, **writes a reason**, and chooses whether it
  applies to that conversation only or becomes an **agency standard**. Standards are
  read back into later scoring and shown to the agent with the name of whoever set them.

## Stack

- Next.js 16 (App Router) + Turbopack, React 19, TypeScript
- Tailwind CSS v4 with a CSS custom-property design system
- ElevenLabs Conversational AI (voice) — per-session `first_message` / prompt overrides
  let one agent play four different sellers
- xAI Grok (`XAI_API_KEY`, `grok-4.5`) for playbook Parse with AI + **live AI rubric
  scoring**, with the deterministic heuristic as fallback
- Supabase Postgres (practice sessions, calibration standards, comments / inbox, share settings)
- `jose` — signed-JWT session cookie, role enforced in middleware
- `jspdf` — the agent's take-away report · `unpdf` — reading an agency's existing playbook
- `recharts` — progress charts
- Deploy: Vercel

## Phases

| Phase | Status | Focus |
|------|--------|--------|
| 0–6 | **done** | Scaffold → diagnosis → voice → score → loop → eval → playbook/cues → value |
| 7 | **active** | Harden + docs |
| 8 | pending | Demo video + Devpost |

## Eval

```bash
npm run eval
```

Writes `EVAL.md` and `src/data/eval-snapshot.json`, which the app reads and serves at
**Manager → Evidence** (`/coach/health`). Current results:

| Check | Result |
|---|---|
| Diagnosis accuracy | **5/5** |
| Scoring agreement with a human grader (±20 band) | **8/8** |
| Persona / guardrails | **4/4** |

Guardrails include a **prompt injection hidden inside a transcript** that tries to force
a perfect score.

Two deliberate choices about what the harness measures:

- It calls `scoreTranscriptHeuristic` — the **deterministic** scorer — so results are
  reproducible without an `XAI_API_KEY` and free to run. Live drills use the AI-forward
  path (`llm+heuristic`) on top of the same rubric.
- It calls the **uncorrected** scorer. Principal calibration is applied when a live drill
  is scored, not in the harness, so the 8/8 figure can't shift because someone calibrated
  the system. The harness measures the scorer we ship; calibration sits on top of it.

## Local setup (any OS)

**Requirements:** Node.js **20+**, npm 10+

```bash
git clone https://github.com/Eeva-cyber/ai_business_hackathon.git
cd ai_business_hackathon
npm install
cp .env.example .env.local
```

Edit `.env.local` (see below), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Let’s get started** / `/login`.

### Demo accounts

Not a real IdP. Allowlisted emails; **any non-empty password** works.

| Role | Email | Lands on |
|------|-------|----------|
| Employee | `alex@northline.demo` | Profile |
| Manager | `jordan@northline.demo` | Team |

### Environment variables

Copy from `.env.example`. **Never commit secrets.**

| Variable | Needed for |
|----------|------------|
| `AUTH_SECRET` | Signed session cookie (long random string) |
| `ELEVENLABS_API_KEY` + `ELEVENLABS_AGENT_ID` | Live voice drills |
| `XAI_API_KEY` | Playbook “Parse with AI” + live AI rubric scoring |
| `CORNERMAN_SCORING` | `auto` (default) / `llm` / `heuristic` |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` | Manager notes / inbox |
| `NEXT_PUBLIC_APP_URL` | Absolute URLs (use `http://localhost:3000` locally) |

Optional: `PLAYBOOK_LLM_PROVIDER`, `PLAYBOOK_LLM_MODEL`, `SCORING_LLM_MODEL` (default xAI `grok-4.5`). Live drills use xAI against the playbook when the key is set; `npm run eval` always uses the heuristic scorer.

For Supabase SQL helpers (if using practice session logs): run `supabase/practice_sessions.sql` in the Supabase SQL editor.

### Deploy (Vercel)

Set the same keys under **Project → Settings → Environment Variables** (Production), then **Redeploy**.

- `NEXT_PUBLIC_*` → Config (public by design)
- `XAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ELEVENLABS_API_KEY`, `AUTH_SECRET` → **Secret**

## Honesty for judges

- Diagnosis uses **seeded** call outcomes, not a live CRM.
- Login is **demo allowlist**, not production SSO.
- The diagnose → drill → score loop is real; CRM integration is the obvious next step.
- Playbook sample PDF is under **Playbook → Download sample PDF** for testing parse yourself.
- **Sharing is partial, and we'd rather say so.** An agent chooses whether to share
  progress with their principal (`shareProgressWithManager`, default off), and the team
  table respects it — an unshared agent shows as “has not shared progress” instead of
  their numbers. That consent gate does **not** yet cover the practice logs below it, so
  a principal can still open a transcript. Extending the gate to transcripts is the next
  thing on the list; until it ships, “practice transcripts stay private” is a design
  intention, not a guarantee the code makes.
- Reflection is **optional and shown after the score**, not a gate in front of it.
- No invented testimonials, user counts, or technologies we don't actually use. Five
  clearly fictional quotes were removed rather than relabelled, because they sat under a
  “Sessions (5)” heading that could read as five completed user tests.

## License / hackathon

Built for the AI in Business Hackathon. Planning notes live in the sibling Flint workspace when applicable.
