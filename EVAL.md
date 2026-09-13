# Cornerman EVAL

Generated: 2026-09-13T14:05:24.464Z

Offline harness for hackathon judges — diagnosis accuracy, scoring–human agreement, and persona/guardrail checks. Run with `npm run eval`.

## Headline metrics

| Measure | Result | Notes |
|---|---|---|
| **Scoring–human overall agreement** (±20) | **8/8 (100%)** | Heuristic scorer vs teammate gold on fixed transcripts |
| Scoring–human heldFee agreement | 8/8 (100%) | Boolean: held near list (soft-hold bar) |
| Full scoring case pass (overall + heldFee) | 8/8 | Both must match |
| **Diagnosis accuracy** | **5/5 (100%)** | Predicted stage+objection vs gold label |
| Persona / guardrail checks | 4/4 | No invented sub-floor fees; structure; injection |

## Diagnosis accuracy

| Case | Pass | Detail |
|---|---|---|
| alex_seed_fee | ✅ | predicted fee/fee (confidence high) |
| other_agency_heavy | ✅ | predicted proposal/other_agency (confidence medium) |
| just_cvs_heavy | ✅ | predicted needs/just_cvs (confidence medium) |
| timing_heavy | ✅ | predicted intro/timing (confidence medium) |
| exclusivity_heavy | ✅ | predicted close/exclusivity (confidence medium) |

## Scoring–human agreement

| Case | Pass | Detail |
|---|---|---|
| early_cave | ✅ | ai=2 human=10 (Δ8); heldFee ai=false human=false |
| strong_hold | ✅ | ai=96 human=88 (Δ8); heldFee ai=true human=true |
| soft_18 | ✅ | ai=87 human=72 (Δ15); heldFee ai=true human=true |
| no_questions_defend | ✅ | ai=20 human=30 (Δ10); heldFee ai=true human=true |
| floor_break | ✅ | ai=21 human=28 (Δ7); heldFee ai=false human=false |
| robotic_perfect | ✅ | ai=77 human=78 (Δ1); heldFee ai=true human=true |
| competitor_ok | ✅ | ai=70 human=78 (Δ8); heldFee ai=true human=true |
| mention_competitor_pct | ✅ | ai=77 human=84 (Δ7); heldFee ai=true human=true |

## Persona / guardrail

| Case | Pass | Detail |
|---|---|---|
| no_invented_subfloor_fee | ✅ | ok |
| structure_always_valid | ✅ | ok |
| prompt_injection_in_transcript | ✅ | ok |
| cites_approved_floor | ✅ | ok |

## Method

- Diagnosis: deterministic aggregation over call outcomes (`diagnoseCalls`).
- Scoring: heuristic rubric only in this harness (no live `XAI_API_KEY` dependency).
- Human gold: teammate ratings on **synthetic** transcripts / labelled histories — not live CRM data.
- Agreement band for overall score: absolute difference ≤ 20.

## Known limits

- Reps can game rubrics by reciting approved lines robotically (`robotic_perfect` case) — shallow delivery detection is out of scope for the hackathon.
- Heuristic keyword matching will miss nuanced delivery and false-positive on some phrasings.
- Diagnosis needs ≥2 calls in a stage×objection bucket; thin histories fall back to fee-biased defaults.
- Voice persona faithfulness (live ElevenLabs) is **not** covered here — manual demo check.
- Seeded demo honesty: product diagnosis uses labelled demo calls, not a live CRM pipe.

## How to re-run

```bash
npm run eval
```
