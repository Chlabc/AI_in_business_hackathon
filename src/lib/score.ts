import { getScenario } from "@/data/scenarios";
import {
  overallFromCriteria,
  rubricForScenario,
  type CriterionScore,
  type PracticeScore,
  type RubricCriterionId,
} from "@/lib/rubric";
import {
  resolveScoringMode,
  scoreTranscriptWithLlm,
} from "@/lib/score-llm";
import type { ScoringMeta } from "@/lib/scoring-meta";
import { applyAgencyStandards } from "@/lib/scoring-standards";
import { readScoringModel, xaiConfigured } from "@/lib/xai";

export type ScoreTranscriptResult = {
  score: PracticeScore;
  meta: ScoringMeta;
};
import {
  defaultPlaybook,
  getPlaybook,
  getPlaybookTalkTrack,
  type FirmPlaybook,
} from "@/lib/playbook";

export type TranscriptTurn = {
  role: "user" | "agent" | "system";
  text: string;
};

function suggestedForScenario(
  scenarioId: string,
  talkTrackPlay: string,
  playbook: FirmPlaybook,
  exampleLine?: string,
): string {
  if (exampleLine?.trim()) return exampleLine.trim();
  switch (scenarioId) {
    case "competitor":
      return "I respect that relationship, what else do you need from your selling plan? If useful, we can arrange a no-obligation appraisal to compare approaches.";
    case "not-interested":
      return "Totally fair. If helpful I’ll leave one market note and book a 10-minute check-in next month, only if a local property update would be useful.";
    case "need-to-think":
      return "Makes sense. Shall I send a one-pager and we lock 15 minutes Thursday to decide go / no-go with your partner on the call?";
    case "price-objection":
    default: {
      const anchor =
        playbook.valueAnchors.find((a) => /comparable|market|negotiation|appraisal/i.test(a)) ??
        playbook.valueAnchors[0] ??
        "local market evidence";
      return `Before we discuss commission, what matters most in choosing your agent? Let’s compare the service, including ${anchor}. ${talkTrackPlay}`;
    }
  }
}

function userText(turns: TranscriptTurn[]): string {
  return turns
    .filter((t) => t.role === "user")
    .map((t) => t.text)
    .join("\n")
    .toLowerCase();
}

function firstUserText(turns: TranscriptTurn[]): string {
  const first = turns.find((t) => t.role === "user");
  return (first?.text ?? "").toLowerCase();
}

/**
 * Detect commission percentages the agent offers/concedes  - 
 * not competitor quotes they only mention.
 */
function extractOfferedFees(text: string): number[] {
  const digits: Record<string, string> = {
    zero: "0", one: "1", two: "2", three: "3", four: "4",
    five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  };
  const normalized = text.replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)(?: point ((?:(?:zero|one|two|three|four|five|six|seven|eight|nine)\s*)+))?\s*(percent|per cent)\b/gi,
    (_, whole: string, fraction: string | undefined) =>
      `${digits[whole.toLowerCase()]}${fraction ? `.${fraction.trim().toLowerCase().split(/\s+/).map((word) => digits[word]).join("")}` : ""}%`,
  );
  const found: number[] = [];
  const offerPatterns = [
    /(?:we can do|i can do|how about|let'?s say|drop(?:ping)?(?: it)? to|come down to|meet you at|offer(?:ing)?|reduce (?:our |the )?(?:fee|commission) to)\s*(\d{1,3}(?:\.\d+)?)\s*(?:%|percent\b|per cent\b)/gi,
  ];
  for (const re of offerPatterns) {
    for (const m of normalized.matchAll(re)) {
      const n = Number(m[1]);
      if (n > 0 && n <= 100) found.push(n);
    }
  }
  return found;
}

function softHoldBar(playbook: FirmPlaybook): number {
  // Retain the existing 85% soft-hold threshold in commission units.
  return Math.max(playbook.feeFloorPct, playbook.standardPermFeePct * 0.85);
}

function scoreCriterion(
  id: RubricCriterionId,
  turns: TranscriptTurn[],
  playbook: FirmPlaybook,
): Omit<CriterionScore, "label" | "max"> {
  const all = userText(turns);
  const first = firstUserText(turns);
  const offered = extractOfferedFees(all);
  const firstOffered = extractOfferedFees(first);
  const minOffered = offered.length ? Math.min(...offered) : null;
  const std = playbook.standardPermFeePct;
  const floor = playbook.feeFloorPct;
  const soft = softHoldBar(playbook);

  switch (id) {
    case "respected_refusal": {
      // Pitch language appearing repeatedly AFTER the first turn is the tell:
      // one pitch is the job, three is not hearing the word no.
      const laterTurns = turns.filter((t) => t.role === "user").slice(1);
      const pushes = laterTurns.filter((t) =>
        /\b(but|however|just|quick|before you go|hear me out|one more|let me|worth|only take)\b/i.test(
          t.text,
        ),
      ).length;
      const acknowledged =
        /\b(understood|no problem|totally fair|fair enough|of course|appreciate|respect that|no worries|that's fine|thanks for)\b/i.test(
          all,
        );
      if (pushes >= 2) {
        return {
          id,
          score: 0,
          notes: `Kept pitching after the no (${pushes} further attempts). A refusal is an answer, not an objection to overcome.`,
        };
      }
      if (acknowledged && pushes === 0) {
        return {
          id,
          score: 1,
          notes: "Accepted the no and stopped pitching. That's the right call.",
        };
      }
      return {
        id,
        score: acknowledged ? 0.7 : 0.4,
        notes: acknowledged
          ? "Acknowledged the no, but still pushed once more."
          : "Didn't clearly acknowledge the refusal.",
      };
    }
    case "agreed_next_step": {
      const permission =
        /\b(check back|follow up|get in touch|reach out|next month|next quarter|later in the year|keep in touch|send you|drop you|would it be ok|is it ok if|mind if)\b/i.test(
          all,
        );
      const cleanClose =
        /\b(thanks for your time|all the best|good luck|won't take any more|leave it there|appreciate you)\b/i.test(
          all,
        );
      if (permission) {
        return {
          id,
          score: 1,
          notes: "Asked permission to follow up later, a good outcome here.",
        };
      }
      if (cleanClose) {
        return {
          id,
          score: 0.8,
          notes: "Closed the call cleanly without pressure. Also a pass.",
        };
      }
      return {
        id,
        score: 0.3,
        notes:
          "No agreed next step. Even a no should end with permission to reconnect, or a clean close.",
      };
    }
    case "explored_objection": {
      const hits =
        /what.*(too high|too expensive|mean|against|compar)|compar|competitor|quoted|based on|relative to|include/.test(
          all,
        );
      return {
        id,
        score: hits ? 1 : /why|how come|help me understand/.test(all) ? 0.5 : 0,
        notes: hits
          ? "You probed what ‘too expensive’ referred to."
          : "Little exploration of the competing quote before defending.",
      };
    }
    case "asked_clarifying_q": {
      const qs = (all.match(/\?/g) ?? []).length;
      return {
        id,
        score: qs >= 2 ? 1 : qs === 1 ? 0.6 : 0,
        notes:
          qs >= 1
            ? `Asked ${qs} clarifying question(s).`
            : "No clear clarifying questions detected.",
      };
    }
    case "anchored_value": {
      const hits =
        /comparable sales|local market|appraisal|marketing|inspection|buyer qualification|negotiation|seller updates/.test(
          all,
        );
      return {
        id,
        score: hits ? 1 : /value|worth|invest/.test(all) ? 0.4 : 0,
        notes: hits
          ? "Anchored on approved value themes."
          : "Missed firm anchors (local market evidence / marketing / negotiation support).",
      };
    }
    case "held_fee": {
      if (minOffered === null) {
        const cave =
          /we can do|i can do|how about|let.?s say|drop|discount|lower/.test(
            all,
          );
        return {
          id,
          score: cave ? 0.3 : 0.85,
          notes: cave
            ? "Sounded open to dropping fee without a clear held number."
            : "No explicit fee drop detected, treated as holding the ask.",
        };
      }
      if (minOffered < floor) {
        return {
          id,
          score: 0,
          notes: `Offered ${minOffered}%, below firm floor (${floor}%).`,
        };
      }
      if (minOffered < soft) {
        return {
          id,
          score: 0.35,
          notes: `Moved to ${minOffered}%, above floor but soft vs ${std}% list.`,
        };
      }
      if (minOffered < std) {
        return {
          id,
          score: 0.7,
          notes: `Held near list at ${minOffered}%.`,
        };
      }
      return {
        id,
        score: 1,
        notes: `Held the ${std}% list ask.`,
      };
    }
    case "used_approved_play": {
      const hits =
        /appraisal|campaign|scope|sales authority|follow-up|follow up|permission|anchor/.test(
          all,
        ) || /comparable sales|marketing|negotiation/.test(all);
      return {
        id,
        score: hits ? 1 : 0.2,
        notes: hits
          ? "Language overlaps the approved pricing play."
          : "Little overlap with approved play structure.",
      };
    }
    case "no_early_cave": {
      const early =
        firstOffered.some((n) => n < std) ||
        /we can do \d+|i can do \d+|how about \d+/.test(first);
      return {
        id,
        score: early ? 0 : 1,
        notes: early
          ? "Conceded (or offered lower) in the first turn."
          : "Did not cave in the opening turn.",
      };
    }
  }
}

export function scoreTranscriptHeuristic(
  turns: TranscriptTurn[],
  scenarioId = "price-objection",
  playbook: FirmPlaybook = defaultPlaybook(),
): PracticeScore {
  const scenario = getScenario(scenarioId);
  const talkTrack = getPlaybookTalkTrack(playbook, scenario.objectionType);
  // Fee scenarios keep the original six criteria, so the eval fixtures graded
  // against them still mean the same thing.
  const rubric = rubricForScenario(scenario.id);
  const criteria: CriterionScore[] = rubric.map((c) => {
    const raw = scoreCriterion(c.id, turns, playbook);
    return {
      id: c.id,
      label: c.label,
      score: raw.score,
      max: c.weight,
      notes: raw.notes,
    };
  });

  const earned = criteria.reduce((sum, c) => sum + c.score * c.max, 0);
  const max = criteria.reduce((sum, c) => sum + c.max, 0);
  const overall = Math.round((earned / max) * 100);

  const all = userText(turns);
  const offered = extractOfferedFees(all);
  const feeOfferedPct = offered.length ? Math.min(...offered) : null;
  const holdBar = softHoldBar(playbook);
  const heldFee =
    feeOfferedPct === null
      ? !/we can do|drop to|discount to/.test(all)
      : feeOfferedPct >= holdBar;

  const feedback: string[] = [];
  const weak = [...criteria].sort((a, b) => a.score - b.score).slice(0, 3);
  for (const w of weak) {
    if (w.score < 0.75) feedback.push(`${w.label}: ${w.notes}`);
  }
  const strong = criteria.filter((c) => c.score >= 0.8);
  if (strong[0]) {
    feedback.unshift(`Strength: ${strong[0].label}: ${strong[0].notes}`);
  }
  feedback.push(`Approved play: ${talkTrack.approvedPlay}`);
  feedback.push(
    `Firm pricing (approved): list ${playbook.standardPermFeePct}%, floor ${playbook.feeFloorPct}%.`,
  );

  return {
    overall,
    heldFee,
    feeOfferedPct,
    criteria,
    feedback: feedback.slice(0, 5),
    approvedPlayReminder: talkTrack.approvedPlay,
    suggestedResponse: suggestedForScenario(
      scenario.id,
      talkTrack.approvedPlay,
      playbook,
      talkTrack.exampleLine,
    ),
    method: "heuristic",
    talkTrackId: talkTrack.id,
    scenarioId: scenario.id,
  };
}

/**
 * Apply rule-based fee/floor clamps on top of an LLM rubric score.
 * Keeps offered-% detection deterministic so the model cannot invent policy.
 */
function applyFeeGuardrails(
  llm: PracticeScore,
  turns: TranscriptTurn[],
  playbook: FirmPlaybook,
  heuristicFallback: PracticeScore,
): PracticeScore {
  const all = userText(turns);
  const detected = extractOfferedFees(all);
  const feeOfferedPct = detected.length
    ? Math.min(...detected)
    : llm.feeOfferedPct;

  const holdBar = softHoldBar(playbook);
  const floor = playbook.feeFloorPct;

  let criteria = llm.criteria.map((c) => ({ ...c }));
  let heldFee = llm.heldFee;

  if (feeOfferedPct !== null) {
    heldFee = feeOfferedPct >= holdBar;
    const heldIdx = criteria.findIndex((c) => c.id === "held_fee");
    if (heldIdx >= 0) {
      const row = criteria[heldIdx]!;
      if (feeOfferedPct < floor) {
        criteria[heldIdx] = {
          ...row,
          score: 0,
          notes: `Offered ${feeOfferedPct}%, below firm floor (${floor}%).`,
        };
        heldFee = false;
      } else if (feeOfferedPct < holdBar && row.score > 0.35) {
        criteria[heldIdx] = {
          ...row,
          score: 0.5,
          notes: `Moved to ${feeOfferedPct}% — above floor but soft vs ${playbook.standardPermFeePct}% list.`,
        };
      }
    }
  } else if (/we can do|drop to|discount to/.test(all)) {
    heldFee = false;
  }

  return {
    ...llm,
    feeOfferedPct,
    heldFee,
    criteria,
    suggestedResponse:
      llm.suggestedResponse || heuristicFallback.suggestedResponse,
    feedback:
      llm.feedback.length > 0 ? llm.feedback : heuristicFallback.feedback,
    method: "llm+heuristic",
  };
}

/**
 * AI-forward live scoring via SpaceXAI (full rubric), with heuristic fallback.
 * Hybrid guardrails keep fee-offer / floor detection rule-based.
 * Agency scoring standards (manager calibration) apply last.
 */
export async function scoreTranscript(
  turns: TranscriptTurn[],
  scenarioId = "price-objection",
): Promise<ScoreTranscriptResult> {
  const playbook = await getPlaybook();
  const base = scoreTranscriptHeuristic(turns, scenarioId, playbook);
  const mode = resolveScoringMode();
  const keyPresent = xaiConfigured();
  const baseMeta = {
    mode,
    xaiKeyPresent: keyPresent,
    model: readScoringModel(),
    vercelEnv: process.env["VERCEL_ENV"] ?? null,
  } as const;

  if (mode === "heuristic") {
    return {
      score: await applyAgencyStandards(base, turns),
      meta: { ...baseMeta, llmUsed: false, fallbackReason: "mode_heuristic" },
    };
  }

  if (!keyPresent) {
    return {
      score: await applyAgencyStandards(base, turns),
      meta: { ...baseMeta, llmUsed: false, fallbackReason: "xai_key_missing" },
    };
  }

  // Never let the LLM path block scoring indefinitely (client aborts ~35s).
  const attempt = await Promise.race([
    scoreTranscriptWithLlm(turns, scenarioId, playbook),
    new Promise<{ score: null; reason: "llm_timeout_or_null" }>((resolve) =>
      setTimeout(
        () => resolve({ score: null, reason: "llm_timeout_or_null" }),
        30_000,
      ),
    ),
  ]);

  if (!attempt.score) {
    return {
      score: await applyAgencyStandards(base, turns),
      meta: {
        ...baseMeta,
        llmUsed: false,
        fallbackReason: attempt.reason,
      },
    };
  }

  const llm = attempt.score;
  const guarded = applyFeeGuardrails(llm, turns, playbook, base);
  const recomputed = overallFromCriteria(guarded.criteria);
  // Keep model overall only when still close after guardrail edits.
  const finalOverall =
    Math.abs(llm.overall - recomputed) <= 15 ? llm.overall : recomputed;

  return {
    score: await applyAgencyStandards(
      { ...guarded, overall: finalOverall },
      turns,
    ),
    meta: { ...baseMeta, llmUsed: true, fallbackReason: "ok" },
  };
}
