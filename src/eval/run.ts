/**
 * Cornerman Phase 5 eval harness.
 * Run: npm run eval
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { diagnoseCalls } from "@/lib/diagnosis";
import { scoreTranscriptHeuristic } from "@/lib/score";
import { DIAGNOSIS_CASES } from "@/eval/fixtures/diagnosis";
import {
  OVERALL_AGREEMENT_BAND,
  SCORING_CASES,
} from "@/eval/fixtures/scoring";
import { PERSONA_CHECKS } from "@/eval/fixtures/persona";

type Row = { id: string; label: string; pass: boolean; detail: string };

function pct(n: number, d: number): string {
  if (d === 0) return "n/a";
  return `${Math.round((n / d) * 1000) / 10}%`;
}

function runDiagnosis(): Row[] {
  return DIAGNOSIS_CASES.map((c) => {
    const d = diagnoseCalls(c.calls, c.calls[0]?.repId ?? c.id);
    if (!d) {
      return {
        id: c.id,
        label: c.label,
        pass: false,
        detail: "diagnoseCalls returned null",
      };
    }
    const pass =
      d.primaryStage === c.goldStage &&
      d.primaryObjection === c.goldObjection;
    return {
      id: c.id,
      label: c.label,
      pass,
      detail: pass
        ? `predicted ${d.primaryStage}/${d.primaryObjection} (confidence ${d.confidence})`
        : `predicted ${d.primaryStage}/${d.primaryObjection}; gold ${c.goldStage}/${c.goldObjection}`,
    };
  });
}

function runScoring(): {
  rows: Row[];
  overallAgree: number;
  heldAgree: number;
  total: number;
} {
  let overallAgree = 0;
  let heldAgree = 0;
  const rows: Row[] = SCORING_CASES.map((c) => {
    const score = scoreTranscriptHeuristic(c.turns, c.scenarioId);
    const overallOk =
      Math.abs(score.overall - c.humanOverall) <= OVERALL_AGREEMENT_BAND;
    const heldOk = score.heldFee === c.humanHeldFee;
    if (overallOk) overallAgree += 1;
    if (heldOk) heldAgree += 1;
    const pass = overallOk && heldOk;
    return {
      id: c.id,
      label: c.label,
      pass,
      detail: `ai=${score.overall} human=${c.humanOverall} (Δ${Math.abs(score.overall - c.humanOverall)}); heldFee ai=${score.heldFee} human=${c.humanHeldFee}`,
    };
  });
  return {
    rows,
    overallAgree,
    heldAgree,
    total: SCORING_CASES.length,
  };
}

function runPersona(): Row[] {
  return PERSONA_CHECKS.map((c) => {
    const score = scoreTranscriptHeuristic(c.turns, c.scenarioId);
    const fail = c.assert(score);
    return {
      id: c.id,
      label: c.label,
      pass: fail === null,
      detail: fail ?? "ok",
    };
  });
}

function renderMd(args: {
  diagnosis: Row[];
  scoringRows: Row[];
  overallAgree: number;
  heldAgree: number;
  scoringTotal: number;
  persona: Row[];
  generatedAt: string;
}): string {
  const dPass = args.diagnosis.filter((r) => r.pass).length;
  const pPass = args.persona.filter((r) => r.pass).length;
  const sPass = args.scoringRows.filter((r) => r.pass).length;
  const headlineOverall = pct(args.overallAgree, args.scoringTotal);
  const headlineHeld = pct(args.heldAgree, args.scoringTotal);
  const headlineDiag = pct(dPass, args.diagnosis.length);

  const table = (rows: Row[]) =>
    [
      "| Case | Pass | Detail |",
      "|---|---|---|",
      ...rows.map(
        (r) =>
          `| ${r.id} | ${r.pass ? "✅" : "❌"} | ${r.detail.replace(/\|/g, "/")} |`,
      ),
    ].join("\n");

  return `# Cornerman EVAL

Generated: ${args.generatedAt}

Offline harness for hackathon judges ,  diagnosis accuracy, scoring–human agreement, and persona/guardrail checks. Run with \`npm run eval\`.

## Headline metrics

| Measure | Result | Notes |
|---|---|---|
| **Scoring–human overall agreement** (±${OVERALL_AGREEMENT_BAND}) | **${args.overallAgree}/${args.scoringTotal} (${headlineOverall})** | Heuristic scorer vs teammate gold on fixed transcripts |
| Scoring–human heldFee agreement | ${args.heldAgree}/${args.scoringTotal} (${headlineHeld}) | Boolean: held near list (soft-hold bar) |
| Full scoring case pass (overall + heldFee) | ${sPass}/${args.scoringTotal} | Both must match |
| **Diagnosis accuracy** | **${dPass}/${args.diagnosis.length} (${headlineDiag})** | Predicted stage+objection vs gold label |
| Persona / guardrail checks | ${pPass}/${args.persona.length} | No invented sub-floor fees; structure; injection |

## Diagnosis accuracy

${table(args.diagnosis)}

## Scoring–human agreement

${table(args.scoringRows)}

## Persona / guardrail

${table(args.persona)}

## Method

- Diagnosis: deterministic aggregation over call outcomes (\`diagnoseCalls\`).
- Scoring: heuristic rubric only in this harness (no live \`XAI_API_KEY\` dependency).
- Human gold: teammate ratings on **synthetic** transcripts / labelled histories ,  not live CRM data.
- Agreement band for overall score: absolute difference ≤ ${OVERALL_AGREEMENT_BAND}.

## Known limits

- Reps can game rubrics by reciting approved lines robotically (\`robotic_perfect\` case) ,  shallow delivery detection is out of scope for the hackathon.
- Heuristic keyword matching will miss nuanced delivery and false-positive on some phrasings.
- Diagnosis needs ≥2 calls in a stage×objection bucket; thin histories fall back to fee-biased defaults.
- Voice persona faithfulness (live ElevenLabs) is **not** covered here ,  manual demo check.
- Seeded demo honesty: product diagnosis uses labelled demo calls, not a live CRM pipe.

## How to re-run

\`\`\`bash
npm run eval
\`\`\`
`;
}

function main() {
  const diagnosis = runDiagnosis();
  const scoring = runScoring();
  const persona = runPersona();

  const dPass = diagnosis.filter((r) => r.pass).length;
  const pPass = persona.filter((r) => r.pass).length;
  const sPass = scoring.rows.filter((r) => r.pass).length;

  console.log("\n=== Cornerman eval ===\n");
  console.log(
    `Diagnosis accuracy:     ${dPass}/${diagnosis.length} (${pct(dPass, diagnosis.length)})`,
  );
  console.log(
    `Scoring overall agree:  ${scoring.overallAgree}/${scoring.total} (${pct(scoring.overallAgree, scoring.total)})  [band ±${OVERALL_AGREEMENT_BAND}]`,
  );
  console.log(
    `Scoring heldFee agree:  ${scoring.heldAgree}/${scoring.total} (${pct(scoring.heldAgree, scoring.total)})`,
  );
  console.log(
    `Scoring full pass:      ${sPass}/${scoring.total}`,
  );
  console.log(
    `Persona / guardrails:   ${pPass}/${persona.length}`,
  );
  console.log("");

  for (const section of [
    ["Diagnosis", diagnosis],
    ["Scoring", scoring.rows],
    ["Persona", persona],
  ] as const) {
    console.log(`-- ${section[0]} --`);
    for (const r of section[1]) {
      console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.id}: ${r.detail}`);
    }
    console.log("");
  }

  const generatedAt = new Date().toISOString();
  const md = renderMd({
    diagnosis,
    scoringRows: scoring.rows,
    overallAgree: scoring.overallAgree,
    heldAgree: scoring.heldAgree,
    scoringTotal: scoring.total,
    persona,
    generatedAt,
  });
  const out = resolve(process.cwd(), "EVAL.md");
  writeFileSync(out, md, "utf8");
  console.log(`Wrote ${out}`);

  const snapshot = {
    generatedAt,
    overallAgreementBand: OVERALL_AGREEMENT_BAND,
    headlines: {
      diagnosisPassed: dPass,
      diagnosisTotal: diagnosis.length,
      diagnosisPct: pct(dPass, diagnosis.length),
      scoringOverallAgree: scoring.overallAgree,
      scoringHeldAgree: scoring.heldAgree,
      scoringFullPass: sPass,
      scoringTotal: scoring.total,
      scoringOverallPct: pct(scoring.overallAgree, scoring.total),
      scoringHeldPct: pct(scoring.heldAgree, scoring.total),
      personaPassed: pPass,
      personaTotal: persona.length,
      personaPct: pct(pPass, persona.length),
    },
    diagnosis,
    scoring: scoring.rows,
    persona,
    method: [
      "Diagnosis: deterministic aggregation over call outcomes (diagnoseCalls).",
      "Scoring: heuristic rubric only in this harness (no live XAI_API_KEY dependency).",
      "Human gold: teammate ratings on synthetic transcripts / labelled histories ,  not live CRM data.",
      `Agreement band for overall score: absolute difference ≤ ${OVERALL_AGREEMENT_BAND}.`,
    ],
    knownLimits: [
      "Reps can game rubrics by reciting approved lines robotically (robotic_perfect) ,  shallow delivery detection is out of scope.",
      "Heuristic keyword matching will miss nuanced delivery and can false-positive on some phrasings.",
      "Diagnosis needs ≥2 calls in a stage×objection bucket; thin histories fall back to fee-biased defaults.",
      "Voice persona faithfulness (live ElevenLabs) is not covered here ,  manual demo check.",
      "Product diagnosis uses labelled demo calls, not a live CRM pipe.",
    ],
    reproduce: "npm run eval",
  };
  const snapPath = resolve(process.cwd(), "src/data/eval-snapshot.json");
  writeFileSync(snapPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Wrote ${snapPath}`);

  const failed =
    diagnosis.some((r) => !r.pass) ||
    persona.some((r) => !r.pass) ||
    scoring.overallAgree / scoring.total < 0.7;

  if (failed) {
    console.error(
      "\nEval finished with failures (or overall agreement < 70%). See details above.",
    );
    process.exit(1);
  }
  console.log("\nEval OK.");
}

main();
