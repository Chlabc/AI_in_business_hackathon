# Cornerman

**The AI sales coach that drills your real weak spot.**

> Cornerman diagnoses an Australian residential real-estate agent’s losing pattern from seeded call outcomes, runs a live ElevenLabs objection roleplay, scores against the firm’s playbook, and shows progress — rep-owned, not surveillance.

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
- Live drills with cue modes (Off / Soft / Full / Unaided) and cueMode logged on attempts
- Playbook: download sample PDF, parse (AI or rules), clear knowledge base, publish to live
- Manager “Leave a note” → employee inbox (Supabase)
- Refusal rubric for “Not interested” scenarios

## Stack

- Next.js 16 + React 19 + TypeScript (App Router)
- ElevenLabs Conversational AI (voice)
- Supabase Postgres (comments / inbox; optional practice logs)
- xAI Grok (`XAI_API_KEY`) for playbook Parse with AI + **live AI rubric scoring** (heuristic fallback)
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

Writes `EVAL.md` (diagnosis accuracy, scoring–human agreement, persona/guardrails).

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

Optional: `PLAYBOOK_LLM_PROVIDER`, `PLAYBOOK_LLM_MODEL`, `SCORING_LLM_MODEL` (default xAI `grok-4.5`). Live drills use SpaceXAI against the playbook when the key is set; `npm run eval` always uses the heuristic scorer.

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

## License / hackathon

Built for the AI in Business Hackathon. Planning notes live in the sibling Flint workspace when applicable.
