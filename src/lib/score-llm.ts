import { getScenario } from "@/data/scenarios";
import {
  overallFromCriteria,
  rubricForScenario,
  type CriterionScore,
  type PracticeScore,
  type RubricCriterionId,
} from "@/lib/rubric";
import {
  getPlaybookTalkTrack,
  type FirmPlaybook,
} from "@/lib/playbook";
import type { TranscriptTurn } from "@/lib/score";
import { xaiChatJson, xaiConfigured } from "@/lib/xai";

export type ScoringMode = "auto" | "llm" | "heuristic";

export function resolveScoringMode(): ScoringMode {
  const raw = (process.env.CORNERMAN_SCORING ?? "auto").toLowerCase().trim();
  if (raw === "llm" || raw === "heuristic" || raw === "auto") return raw;
  return "auto";
}

/** Snap continuous model scores onto the calibration grid. */
export function snapCriterionScore(n: number): 0 | 0.5 | 1 {
  if (!Number.isFinite(n)) return 0;
  if (n < 0.25) return 0;
  if (n < 0.75) return 0.5;
  return 1;
}

type LlmCriterion = {
  id?: string;
  score?: number;
  notes?: string;
};

type LlmScorePayload = {
  overall?: number;
  heldFee?: boolean;
  feeOfferedPct?: number | null;
  criteria?: LlmCriterion[];
  feedback?: unknown;
  suggestedResponse?: string;
};

function asFeedback(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(String)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 5);
}

/**
 * Ask SpaceXAI for a full rubric score.
 * Returns null if disabled, unconfigured, or the reply cannot be validated.
 * Caller applies fee/floor hybrid guardrails and agency standards.
 */
export async function scoreTranscriptWithLlm(
  turns: TranscriptTurn[],
  scenarioId: string,
  playbook: FirmPlaybook,
): Promise<PracticeScore | null> {
  const mode = resolveScoringMode();
  if (mode === "heuristic") return null;
  if (mode === "auto" && !xaiConfigured()) return null;
  if (mode === "llm" && !xaiConfigured()) return null;

  const scenario = getScenario(scenarioId);
  const talkTrack = getPlaybookTalkTrack(playbook, scenario.objectionType);
  const rubric = rubricForScenario(scenario.id);
  const rubricIds = new Set(rubric.map((c) => c.id));

  const system = `You are the scoring engine for Cornerman, an Australian residential real-estate sales coach.
Score the AGENT (role "user" in the transcript) against the firm's playbook and the given rubric.
Return ONLY JSON with this shape:
{"overall":0-100,"heldFee":true|false,"feeOfferedPct":number|null,"criteria":[{"id":string,"score":0|0.5|1,"notes":string}],"feedback":string[],"suggestedResponse":string}
Rules:
- Include exactly one criteria entry for every rubric id provided.
- score must be 0, 0.5, or 1 (half marks allowed).
- notes: short behavioural evidence from the transcript (≤160 chars).
- heldFee: true only if the agent held near the list commission without dropping below the soft hold band.
- feeOfferedPct: lowest commission % the agent explicitly offered, or null if none.
- Never invent firm policy or a commission below the floor (${playbook.feeFloorPct}%).
- feedback: 2 to 5 behavioural bullets grounded in the approved play.
- suggestedResponse: one stronger line the agent could say next time, consistent with the playbook.
- Do not score the AI seller (role "agent"); only the human agent.`;

  const user = JSON.stringify({
    scenario: {
      id: scenario.id,
      title: scenario.title,
      objectionType: scenario.objectionType,
    },
    firm: {
      name: playbook.firmName,
      listCommissionPct: playbook.standardPermFeePct,
      floorCommissionPct: playbook.feeFloorPct,
      competitorQuotePct: playbook.competitorQuotePct,
      valueAnchors: playbook.valueAnchors,
    },
    talkTrack: {
      id: talkTrack.id,
      title: talkTrack.title,
      approvedPlay: talkTrack.approvedPlay,
      anchorPoints: talkTrack.anchorPoints,
      neverDo: talkTrack.neverDo,
      exampleLine: talkTrack.exampleLine,
    },
    rubric: rubric.map((c) => ({
      id: c.id,
      label: c.label,
      weight: c.weight,
      description: c.description,
    })),
    transcript: turns.filter((t) => t.role !== "system"),
  });

  const parsed = (await xaiChatJson({
    system,
    user,
    temperature: 0.2,
    // Keep short so /api/practice/score cannot hang the browser fetch.
    timeoutMs: 12_000,
  })) as LlmScorePayload | null;
  if (!parsed || typeof parsed !== "object") return null;

  const byId = new Map<string, LlmCriterion>();
  for (const row of Array.isArray(parsed.criteria) ? parsed.criteria : []) {
    if (row && typeof row.id === "string" && rubricIds.has(row.id as RubricCriterionId)) {
      byId.set(row.id, row);
    }
  }
  // Require a complete rubric — otherwise fall back to heuristic.
  if (byId.size !== rubric.length) return null;

  const criteria: CriterionScore[] = rubric.map((c) => {
    const row = byId.get(c.id)!;
    const notes =
      typeof row.notes === "string" && row.notes.trim()
        ? row.notes.trim().slice(0, 160)
        : "No note returned.";
    return {
      id: c.id,
      label: c.label,
      score: snapCriterionScore(Number(row.score)),
      max: c.weight,
      notes,
    };
  });

  const recomputed = overallFromCriteria(criteria);
  let overall = recomputed;
  if (typeof parsed.overall === "number" && Number.isFinite(parsed.overall)) {
    const claimed = Math.max(0, Math.min(100, Math.round(parsed.overall)));
    // Trust the model overall only when it agrees with weighted criteria.
    if (Math.abs(claimed - recomputed) <= 15) overall = claimed;
  }

  let feeOfferedPct: number | null = null;
  if (
    typeof parsed.feeOfferedPct === "number" &&
    Number.isFinite(parsed.feeOfferedPct) &&
    parsed.feeOfferedPct > 0 &&
    parsed.feeOfferedPct <= 100
  ) {
    feeOfferedPct = Math.round(parsed.feeOfferedPct * 1000) / 1000;
  }

  const feedback = asFeedback(parsed.feedback);
  const suggested =
    typeof parsed.suggestedResponse === "string" &&
    parsed.suggestedResponse.trim()
      ? parsed.suggestedResponse.trim().slice(0, 400)
      : talkTrack.exampleLine || talkTrack.approvedPlay;

  return {
    overall,
    heldFee:
      typeof parsed.heldFee === "boolean" ? parsed.heldFee : feeOfferedPct === null,
    feeOfferedPct,
    criteria,
    feedback:
      feedback.length > 0
        ? feedback
        : [`Approved play: ${talkTrack.approvedPlay}`],
    approvedPlayReminder: talkTrack.approvedPlay,
    suggestedResponse: suggested,
    method: "llm",
    talkTrackId: talkTrack.id,
    scenarioId: scenario.id,
  };
}
