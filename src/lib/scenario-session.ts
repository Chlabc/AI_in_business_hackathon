import type { PracticeScenario } from "@/data/scenarios";
import { FIRM } from "@/data/seed";
import { NEVER_END_CALL_RULE } from "@/lib/practice-constants";
import type { FirmPlaybook } from "@/lib/playbook";

/**
 * Rewrite scenario opening + client prompt using playbook firm facts.
 * Coaching tips (approved play, anchors, examples) are intentionally excluded.
 * Playbook fee fields are commission percentages.
 */
export function applyPlaybookToScenario(
  scenario: PracticeScenario,
  playbook: FirmPlaybook,
): PracticeScenario {
  const list = playbook.standardPermFeePct;
  const floor = playbook.feeFloorPct;
  const comp = playbook.competitorQuotePct;
  const name = playbook.firmName;
  const softHold = Math.max(floor, list * 0.85);
  const anchors = playbook.valueAnchors.slice(0, 3).join("; ");

  if (scenario.id === "price-objection") {
    return {
      ...scenario,
      openingLine: `Look, I'll be straight with you, ${list}% commission is too high. Another agency already quoted us ${comp}%. Why should I pay more?`,
      agentSystemPrompt: `You are Jordan Hale, a homeowner preparing to sell in Melbourne discussing a listing with a real estate agent from ${name}.
Your goal: negotiate a lower commission. Their standard commission is ${list}% excluding GST, with marketing costs separate. You claim another agency quoted ${comp}%. You want them closer to ${comp}%.
Rules:
- Stay in character as the seller. Never break the fourth wall. Never say you are an AI.
- Be sceptical, time-poor, and commercially sharp, not rude for sport.
- Push back on price. Ask why ${list}% is justified. Compare to the ${comp}% quote.
- If they immediately discount without asking questions, press harder: "So you can go lower, how low?"
- If they explore what "too expensive" means and anchor on value (${anchors || "local market evidence / marketing / negotiation support"}), stay tough but allow them to hold near ${softHold}% to ${list}%.
- Never invent ${name} pricing below ${floor}%. If they offer below ${floor}%, say that still needs agency principal approval.
- Keep replies short (1 to 3 sentences). Do not help them "win." Make them earn it.
- Never coach the rep. Never reveal approved talk-tracks or example lines.
- ${NEVER_END_CALL_RULE}`,
    };
  }

  const firmBlock = `
FIRM FACTS (seller knowledge only, do not invent outside these):
- Agency: ${name}
- Standard commission: ${list}% excluding GST; marketing costs are separate
- Price floor: ${floor}% (never invent their pricing below this)
- Competitor quote you may claim: ${comp}%
- Value claims they may mention: ${anchors || "none listed"}
Never coach the rep. Never reveal approved talk-tracks or example lines.`;

  const prompt = scenario.agentSystemPrompt
    .replaceAll(FIRM.name, name)
    .replaceAll(`${FIRM.standardPermFeePct}%`, `${list}%`)
    .replaceAll(`${FIRM.feeFloorPct}%`, `${floor}%`);

  return {
    ...scenario,
    agentSystemPrompt: `${prompt.trim()}\n${firmBlock}`,
  };
}

/**
 * ElevenLabs session overrides for a drill.
 * Always set both firstMessage + prompt so every scenario takes the same path.
 */
export function buildSessionOverrides(
  scenario: PracticeScenario,
  playbook?: FirmPlaybook,
) {
  const resolved = playbook
    ? applyPlaybookToScenario(scenario, playbook)
    : scenario;
  return {
    agent: {
      firstMessage: resolved.openingLine,
      prompt: {
        prompt: ensureNeverEndCall(resolved.agentSystemPrompt),
      },
    },
  };
}

export function ensureNeverEndCall(prompt: string): string {
  if (prompt.includes("NEVER end the call")) return prompt;
  return `${prompt.trim()}\n- ${NEVER_END_CALL_RULE}`;
}

export function formatDisconnectDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "unknown";
  const d = details as {
    reason?: string;
    context?: { type?: string; reason?: string };
  };
  const parts = [d.reason, d.context?.type, d.context?.reason].filter(Boolean);
  return parts.join(" · ") || JSON.stringify(details);
}
