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
import type { ScoringMeta } from "@/lib/scoring-meta";
import {
  scoringModelFallbackChain,
  xaiChatJsonResult,
  xaiConfigured,
} from "@/lib/xai";

export type LlmScoreAttempt = {
  score: PracticeScore | null;
  reason: NonNullable<ScoringMeta["fallbackReason"]>;
  detail?: string;
  model?: string;
};

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
 * Returns score + reason so the UI can show why a run fell back to heuristic.
 */
export async function scoreTranscriptWithLlm(
  turns: TranscriptTurn[],
  scenarioId: string,
  playbook: FirmPlaybook,
): Promise<LlmScoreAttempt> {
  const mode = resolveScoringMode();
  if (mode === "heuristic") {
    return { score: null, reason: "mode_heuristic" };
  }
  if (!xaiConfigured()) {
    return { score: null, reason: "xai_key_missing" };
  }

  const scenario = getScenario(scenarioId);
  const talkTrack = getPlaybookTalkTrack(playbook, scenario.objectionType);
  const rubric = rubricForScenario(scenario.id);
  const rubricIds = new Set(rubric.map((c) => c.id));

  const system = `Score the human AGENT only (transcript role "user") for Cornerman real-estate coaching.
Return ONLY JSON:
{"overall":0-100,"heldFee":true|false,"feeOfferedPct":number|null,"criteria":[{"id":string,"score":0|0.5|1,"notes":string}],"feedback":string[2-4],"suggestedResponse":string}
Rules: one criteria row per rubric id; notes ≤120 chars; never invent policy or a fee below floor ${playbook.feeFloorPct}%; suggestedResponse = one better next line from the playbook.`;

  const user = JSON.stringify({
    scenarioId: scenario.id,
    objectionType: scenario.objectionType,
    firm: {
      listPct: playbook.standardPermFeePct,
      floorPct: playbook.feeFloorPct,
      anchors: playbook.valueAnchors.slice(0, 4),
    },
    play: {
      approvedPlay: talkTrack.approvedPlay,
      anchorPoints: talkTrack.anchorPoints.slice(0, 4),
      neverDo: talkTrack.neverDo.slice(0, 4),
    },
    rubric: rubric.map((c) => ({
      id: c.id,
      label: c.label,
      weight: c.weight,
    })),
    transcript: turns
      .filter((t) => t.role !== "system")
      .map((t) => ({
        role: t.role,
        text: t.text.length > 500 ? `${t.text.slice(0, 500)}…` : t.text,
      })),
  });

  // Prefer a fast model; if that account can't use it (404/403), try fallbacks.
  let llmResult: Awaited<ReturnType<typeof xaiChatJsonResult>> | null = null;
  for (const model of scoringModelFallbackChain()) {
    llmResult = await xaiChatJsonResult({
      system,
      user,
      temperature: 0,
      timeoutMs: 20_000,
      jsonMode: true,
      model,
    });
    if (llmResult.ok) break;
    // Only rotate on HTTP/model errors — don't burn retries on timeouts/bad JSON.
    if (
      llmResult.reason !== "llm_http_error" &&
      llmResult.reason !== "xai_key_missing"
    ) {
      break;
    }
    console.warn("[score-llm] model failed, trying next", model, llmResult.detail);
  }
  if (!llmResult || !llmResult.ok) {
    return {
      score: null,
      reason: llmResult?.reason ?? "llm_http_error",
      detail: llmResult && !llmResult.ok ? llmResult.detail : undefined,
      model: llmResult && !llmResult.ok ? llmResult.model : undefined,
    };
  }
  const parsed = llmResult.value as LlmScorePayload;
  if (!parsed || typeof parsed !== "object") {
    return { score: null, reason: "llm_invalid_json", model: llmResult.model };
  }

  const byId = new Map<string, LlmCriterion>();
  for (const row of Array.isArray(parsed.criteria) ? parsed.criteria : []) {
    if (row && typeof row.id === "string" && rubricIds.has(row.id as RubricCriterionId)) {
      byId.set(row.id, row);
    }
  }
  // Require a complete rubric — otherwise fall back to heuristic.
  if (byId.size !== rubric.length) {
    return { score: null, reason: "llm_incomplete_rubric" };
  }

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
    score: {
      overall,
      heldFee:
        typeof parsed.heldFee === "boolean"
          ? parsed.heldFee
          : feeOfferedPct === null,
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
    },
    reason: "ok",
    model: llmResult.model,
  };
}
