import { getScenario } from "@/data/scenarios";
import {
  rubricForScenario,
  type CriterionScore,
  type PracticeScore,
  type RubricCriterionId,
} from "@/lib/rubric";
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
      return "I respect that relationship — where are they still leaving gaps? Happy to run a parallel shortlist on one hard-to-fill seat so you can compare without ripping anything up.";
    case "not-interested":
      return "Totally fair. If helpful I’ll leave one market note and book a 10-minute check-in next month — no pitch deck, just signal on roles like yours.";
    case "need-to-think":
      return "Makes sense. Shall I send a one-pager and we lock 15 minutes Thursday to decide go / no-go with your co-founder on the call?";
    case "price-objection":
    default: {
      const anchor =
        playbook.valueAnchors.find((a) => /time-to-value|SOC2|CSM|SLA/i.test(a)) ??
        playbook.valueAnchors[0] ??
        "time-to-value";
      return `Before we talk discount — what does a failed rollout cost next quarter? That’s what ${anchor} protects. ${talkTrackPlay}`;
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
 * Detect seat prices ($) or legacy % the rep offers/concedes —
 * not competitor quotes they only mention.
 */
function extractOfferedFees(text: string): number[] {
  const found: number[] = [];
  const offerPatterns = [
    /(?:we can do|i can do|how about|let'?s say|drop(?:ping)?(?: it)? to|come down to|meet you at|offer(?:ing)?)\s*\$?\s*(\d{2,3}(?:\.\d+)?)\s*(?:\/\s*(?:user|seat|mo|month))?/gi,
    /(?:we can do|i can do|how about|let'?s say|drop(?:ping)?(?: it)? to|come down to|meet you at|offer(?:ing)?)\s*(\d{1,2}(?:\.\d+)?)\s*%/g,
    /(?:we can do|i can do|how about|let'?s say|drop(?:ping)?(?: it)? to|come down to|meet you at|offer(?:ing)?)\s*(\d{1,2}(?:\.\d+)?)\s*percent/g,
  ];
  for (const re of offerPatterns) {
    for (const m of text.matchAll(re)) {
      const n = Number(m[1]);
      // SaaS seat $ (50–200) or legacy recruitment % (10–30)
      if ((n >= 50 && n <= 200) || (n >= 10 && n <= 30)) found.push(n);
    }
  }
  return found;
}

function softHoldBar(playbook: FirmPlaybook): number {
  // Seat $ model: soft hold within ~15 of list; legacy % used −2.
  const list = playbook.standardPermFeePct;
  const delta = list >= 50 ? 15 : 2;
  return Math.max(playbook.feeFloorPct, list - delta);
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
          notes: "Asked permission to follow up later — a good outcome here.",
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
        /time[- ]to[- ]value|soc\s*2|sso|scim|csm|uptime|sla|onboard|integrat|roi|14 days|security/.test(
          all,
        );
      return {
        id,
        score: hits ? 1 : /value|worth|invest/.test(all) ? 0.4 : 0,
        notes: hits
          ? "Anchored on approved value themes."
          : "Missed firm anchors (time-to-value / SOC2 / CSM / SLA).",
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
            : "No explicit fee drop detected — treated as holding the ask.",
        };
      }
      if (minOffered < floor) {
        return {
          id,
          score: 0,
          notes: `Offered $${minOffered} — below firm floor ($${floor}).`,
        };
      }
      if (minOffered < soft) {
        return {
          id,
          score: 0.35,
          notes: `Moved to $${minOffered} — above floor but soft vs $${std} list.`,
        };
      }
      if (minOffered < std) {
        return {
          id,
          score: 0.7,
          notes: `Held near list at $${minOffered}.`,
        };
      }
      return {
        id,
        score: 1,
        notes: `Held the $${std} list ask.`,
      };
    }
    case "used_approved_play": {
      const hits =
        /pilot|annual|prepay|scope|trial|nda|security pack|must-have|sla|anchor/.test(
          all,
        ) || /time[- ]to[- ]value|soc\s*2|csm/.test(all);
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
    feedback.unshift(`Strength — ${strong[0].label}: ${strong[0].notes}`);
  }
  feedback.push(`Approved play: ${talkTrack.approvedPlay}`);
  feedback.push(
    `Firm pricing (approved): list $${playbook.standardPermFeePct}/seat/mo, floor $${playbook.feeFloorPct}.`,
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
 * Optional SpaceXAI refinement. Falls back to heuristic if no key / failure.
 */
export async function scoreTranscript(
  turns: TranscriptTurn[],
  scenarioId = "price-objection",
): Promise<PracticeScore> {
  const playbook = await getPlaybook();
  const base = scoreTranscriptHeuristic(turns, scenarioId, playbook);
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return base;

  try {
    const talkTrack = getPlaybookTalkTrack(playbook, "fee");
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You score a B2B SaaS price-objection roleplay. Return ONLY JSON:
{"overall":0-100,"feedback":["bullet1","bullet2","bullet3"],"heldFee":true|false}
Rules: feedback must be behavioural and grounded in the approved talk-track. Never invent seat prices below $${playbook.feeFloorPct}. Never invent policies.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              approvedPlay: talkTrack.approvedPlay,
              firm: {
                listSeatUsd: playbook.standardPermFeePct,
                floorSeatUsd: playbook.feeFloorPct,
              },
              heuristic: base,
              transcript: turns.filter((t) => t.role !== "system"),
            }),
          },
        ],
      }),
    });
    if (!res.ok) return base;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return base;
    const parsed = JSON.parse(match[0]) as {
      overall?: number;
      feedback?: string[];
      heldFee?: boolean;
    };
    return {
      ...base,
      overall:
        typeof parsed.overall === "number"
          ? Math.max(0, Math.min(100, Math.round(parsed.overall)))
          : base.overall,
      heldFee:
        typeof parsed.heldFee === "boolean" ? parsed.heldFee : base.heldFee,
      feedback: Array.isArray(parsed.feedback)
        ? parsed.feedback.slice(0, 5)
        : base.feedback,
      method: "llm+heuristic",
    };
  } catch {
    return base;
  }
}
