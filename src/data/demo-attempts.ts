import type { PracticeAttempt } from "@/lib/attempts";
import { DEMO_REP_ID } from "@/data/seed";
import type { CriterionScore, RubricCriterionId } from "@/lib/rubric";

const APPROVED =
  "Ask what ‘too expensive’ is measured against, restate time-to-value / security / CSM, then hold near list. Do not discount in the first response.";

const SUGGESTED =
  "Before we talk discount — what does a failed rollout cost you in the next quarter? That’s what our time-to-value and CSM cover. Happy to trade annual prepay before we touch list price.";

function criteria(partial: {
  explored: number;
  clarify: number;
  value: number;
  held: number;
  play: number;
  cave: number;
  notes?: Partial<Record<RubricCriterionId, string>>;
}): CriterionScore[] {
  const n = partial.notes ?? {};
  const rows: CriterionScore[] = [
    {
      id: "explored_objection",
      label: "Explored the objection",
      score: partial.explored,
      max: 20,
      notes: n.explored_objection ?? "",
    },
    {
      id: "asked_clarifying_q",
      label: "Asked clarifying questions",
      score: partial.clarify,
      max: 15,
      notes: n.asked_clarifying_q ?? "",
    },
    {
      id: "anchored_value",
      label: "Anchored on value",
      score: partial.value,
      max: 20,
      notes: n.anchored_value ?? "",
    },
    {
      id: "held_fee",
      label: "Held near standard fee",
      score: partial.held,
      max: 25,
      notes: n.held_fee ?? "",
    },
    {
      id: "used_approved_play",
      label: "Used approved play ideas",
      score: partial.play,
      max: 10,
      notes: n.used_approved_play ?? "",
    },
    {
      id: "no_early_cave",
      label: "No early cave",
      score: partial.cave,
      max: 10,
      notes: n.no_early_cave ?? "",
    },
  ];
  return rows;
}

function overallFrom(c: CriterionScore[]): number {
  const earned = c.reduce((s, x) => s + x.score * x.max, 0);
  const max = c.reduce((s, x) => s + x.max, 0);
  return Math.round((earned / max) * 100);
}

/**
 * Seeded practice history for Alex — clear before→after for the Progress page.
 * Early drills cave on price; later drills explore, anchor, and hold list.
 */
export function buildAlexDemoAttempts(): PracticeAttempt[] {
  const specs: {
    id: string;
    createdAt: string;
    heldFee: boolean;
    feeOfferedPct: number | null;
    partial: Parameters<typeof criteria>[0];
    feedback: string[];
    userLine: string;
  }[] = [
    {
      id: "demo_alex_01",
      createdAt: "2026-09-01T10:00:00.000Z",
      heldFee: false,
      feeOfferedPct: 75,
      partial: {
        explored: 0.2,
        clarify: 0.2,
        value: 0.1,
        held: 0,
        play: 0.2,
        cave: 0,
        notes: {
          explored_objection:
            "Jumped to discount without exploring the $70 quote.",
          held_fee: "Offered $75 — below list.",
          no_early_cave: "Conceded in the opening turn.",
        },
      },
      feedback: [
        "Held near standard fee: Offered a cut too early.",
        "No early cave: Discounted before clarifying.",
      ],
      userLine: "We can do $75 if that helps you move forward today.",
    },
    {
      id: "demo_alex_02",
      createdAt: "2026-09-03T11:00:00.000Z",
      heldFee: false,
      feeOfferedPct: 80,
      partial: {
        explored: 0.4,
        clarify: 0.4,
        value: 0.3,
        held: 0.2,
        play: 0.3,
        cave: 0.3,
        notes: {
          explored_objection:
            "Asked once about the competitor, then softened.",
          held_fee: "Settled at floor under pressure.",
        },
      },
      feedback: [
        "Explored a little, then dropped to $80.",
        "Missed time-to-value / CSM anchors.",
      ],
      userLine: "Okay — $80 is our floor if you sign this quarter.",
    },
    {
      id: "demo_alex_03",
      createdAt: "2026-09-05T14:00:00.000Z",
      heldFee: false,
      feeOfferedPct: 90,
      partial: {
        explored: 0.6,
        clarify: 0.6,
        value: 0.5,
        held: 0.4,
        play: 0.5,
        cave: 0.6,
        notes: {
          anchored_value: "Mentioned CSM once; still traded price.",
          held_fee: "Moved to $90 after pushback.",
        },
      },
      feedback: [
        "Better questions, still gave ground on price.",
        "Approved play only partly used.",
      ],
      userLine:
        "What is the $70 quote covering? We can meet at $90 with annual prepay.",
    },
    {
      id: "demo_alex_04",
      createdAt: "2026-09-08T09:30:00.000Z",
      heldFee: true,
      feeOfferedPct: null,
      partial: {
        explored: 0.8,
        clarify: 0.8,
        value: 0.7,
        held: 0.85,
        play: 0.7,
        cave: 1,
        notes: {
          explored_objection: "Clarified what ‘too expensive’ meant.",
          held_fee: "Held list; offered scope trade instead.",
          anchored_value: "Anchored on time-to-value and SOC2.",
        },
      },
      feedback: [
        "Strength — Held near standard fee.",
        "Strength — No early cave.",
        "Used approved play structure.",
      ],
      userLine:
        "Before we talk discount — what does a failed rollout cost you next quarter? Happy to trade annual prepay, not list price.",
    },
    {
      id: "demo_alex_05",
      createdAt: "2026-09-10T16:00:00.000Z",
      heldFee: true,
      feeOfferedPct: null,
      partial: {
        explored: 0.9,
        clarify: 0.85,
        value: 0.85,
        held: 0.9,
        play: 0.85,
        cave: 1,
        notes: {
          used_approved_play: "Followed explore → value → hold.",
          held_fee: "Held $100 list throughout.",
        },
      },
      feedback: [
        "Strength — Anchored on value.",
        "Strength — Held near standard fee.",
        "Clean approved-play structure.",
      ],
      userLine:
        "CompetitorX at $70 skips our CSM and SLA. List stays $100; we can start one team on annual to de-risk.",
    },
    {
      id: "demo_alex_06",
      createdAt: "2026-09-12T13:00:00.000Z",
      heldFee: true,
      feeOfferedPct: null,
      partial: {
        explored: 1,
        clarify: 0.9,
        value: 0.9,
        held: 0.95,
        play: 0.9,
        cave: 1,
        notes: {
          explored_objection: "Fully explored the competing quote.",
          held_fee: "Held list; traded seats minimum only.",
        },
      },
      feedback: [
        "Strength — Explored the objection.",
        "Strength — Held near standard fee.",
        "Strength — Used approved play ideas.",
      ],
      userLine:
        "What is $70 measured against — same security pack and CSM? We hold $100. I can lock a seat minimum so finance sees a clear path.",
    },
  ];

  return specs.map((s) => {
    const c = criteria(s.partial);
    return {
      id: s.id,
      createdAt: s.createdAt,
      repId: DEMO_REP_ID,
      conversationId: null,
      turns: [
        {
          role: "agent" as const,
          text: "Look, I'll be straight with you — $100/seat is too high. CompetitorX already quoted us $70. Why should I pay more?",
        },
        { role: "user" as const, text: s.userLine },
        {
          role: "agent" as const,
          text: "Still need to see movement on price if we're going to take this to finance.",
        },
        {
          role: "user" as const,
          text: s.heldFee
            ? "List stays $100. Scope or commercial structure is what we can move — not panic discounting."
            : "I hear you — let me see what I can do on the number.",
        },
      ],
      score: {
        overall: overallFrom(c),
        heldFee: s.heldFee,
        feeOfferedPct: s.feeOfferedPct,
        criteria: c,
        feedback: s.feedback,
        approvedPlayReminder: APPROVED,
        suggestedResponse: SUGGESTED,
        method: "heuristic" as const,
        talkTrackId: "tt_price_anchor",
        scenarioId: "price-objection",
      },
    };
  });
}
