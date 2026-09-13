import type { PracticeAttempt } from "@/lib/attempts";
import { DEMO_REP_ID } from "@/data/seed";
import type { CriterionScore, RubricCriterionId } from "@/lib/rubric";

const APPROVED =
  "Ask what the lower commission includes, explain the appraisal, marketing and negotiation service, then hold the approved fee. Do not discount in the first response.";

const SUGGESTED =
  "Before we discuss commission, what matters most when choosing your agent? Let’s compare the local market evidence, marketing plan and negotiation support included in our service.";

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
 * Seeded practice history for Alex - clear before→after for the Progress page.
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
      feeOfferedPct: 1.875,
      partial: {
        explored: 0.2,
        clarify: 0.2,
        value: 0.1,
        held: 0,
        play: 0.2,
        cave: 0,
        notes: {
          explored_objection:
            "Jumped to discount without exploring the 1.75% quote.",
          held_fee: "Offered 1.875%, below list.",
          no_early_cave: "Conceded in the opening turn.",
        },
      },
      feedback: [
        "Held near standard fee: Offered a cut too early.",
        "No early cave: Discounted before clarifying.",
      ],
      userLine: "We can do 1.875% if that helps you move forward today.",
    },
    {
      id: "demo_alex_02",
      createdAt: "2026-09-03T11:00:00.000Z",
      heldFee: false,
      feeOfferedPct: 2,
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
        "Explored a little, then dropped to 2%.",
        "Missed local market evidence / negotiation support anchors.",
      ],
      userLine: "Okay, 2% is our floor if you sign this quarter.",
    },
    {
      id: "demo_alex_03",
      createdAt: "2026-09-05T14:00:00.000Z",
      heldFee: false,
      feeOfferedPct: 2.25,
      partial: {
        explored: 0.6,
        clarify: 0.6,
        value: 0.5,
        held: 0.4,
        play: 0.5,
        cave: 0.6,
        notes: {
          anchored_value: "Mentioned negotiation support once; still traded price.",
          held_fee: "Moved to 2.25% after pushback.",
        },
      },
      feedback: [
        "Better questions, still gave ground on price.",
        "Approved play only partly used.",
      ],
      userLine:
        "What is the 1.75% quote covering? We can meet at 2.25% after reviewing campaign scope.",
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
          anchored_value: "Anchored on local market evidence and the marketing plan.",
        },
      },
      feedback: [
        "Strength: Held near standard fee.",
        "Strength: No early cave.",
        "Used approved play structure.",
      ],
      userLine:
        "Before discussing commission, what matters most in your sale? Let’s review comparable sales and the campaign scope first.",
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
          held_fee: "Held 2.5% list throughout.",
        },
      },
      feedback: [
        "Strength: Anchored on value.",
        "Strength: Held near standard fee.",
        "Clean approved-play structure.",
      ],
      userLine:
        "Does the 1.75% include the same marketing and negotiation support? Our commission stays at 2.5%; let’s review the campaign plan together.",
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
          held_fee: "Held the commission; reviewed campaign scope.",
        },
      },
      feedback: [
        "Strength: Explored the objection.",
        "Strength: Held near standard fee.",
        "Strength: Used approved play ideas.",
      ],
      userLine:
        "What does the 1.75% include, the same marketing plan and negotiation support? Our commission is 2.5%. Let’s compare the service before deciding.",
    },
  ];

  const feeAttempts = specs.map((s) => {
    const c = criteria(s.partial);
    return {
      id: s.id,
      createdAt: s.createdAt,
      repId: DEMO_REP_ID,
      conversationId: null,
      turns: [
        {
          role: "agent" as const,
          text: "Look, I'll be straight with you, 2.5% is too high. Another agency already quoted us 1.75%. Why should I pay more?",
        },
        { role: "user" as const, text: s.userLine },
        {
          role: "agent" as const,
          text: "I still need to understand the fee before discussing it with my partner.",
        },
        {
          role: "user" as const,
          text: s.heldFee
            ? "Our commission stays at 2.5%. We can review the campaign scope together before making any decision."
            : "I hear you, let me see what I can do on the number.",
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

  /** Seeded calibrate target: low "next step" so principals can disagree. */
  const refusalCriteria: CriterionScore[] = [
    {
      id: "respected_refusal",
      label: "Respected the refusal",
      score: 0.9,
      max: 30,
      notes: "Stopped pitching after the clear no.",
    },
    {
      id: "asked_clarifying_q",
      label: "Asked one useful question",
      score: 0.7,
      max: 20,
      notes: "Asked about timing.",
    },
    {
      id: "agreed_next_step",
      label: "Agreed an appropriate next step",
      score: 0.3,
      max: 25,
      notes: "Coach treated follow-up permission as weak, calibrate candidate.",
    },
    {
      id: "used_approved_play",
      label: "Used approved play ideas",
      score: 0.6,
      max: 15,
      notes: "Partial overlap with re-engagement track.",
    },
    {
      id: "anchored_value",
      label: "Left something of value",
      score: 0.5,
      max: 10,
      notes: "Light market note only.",
    },
  ];

  const calibrateTarget: PracticeAttempt = {
    id: "demo_alex_calibrate_refusal",
    createdAt: "2026-03-18T10:00:00.000Z",
    repId: DEMO_REP_ID,
    conversationId: null,
    cueMode: "soft",
    turns: [
      {
        role: "agent",
        text: "Thanks, but we're not thinking of selling right now.",
      },
      {
        role: "user",
        text: "Understood, I won't push. Would it be okay if I checked in later with a local market update when timing is better?",
      },
      {
        role: "agent",
        text: "Sure, a later check-in is fine.",
      },
    ],
    score: {
      overall: overallFrom(refusalCriteria),
      heldFee: true,
      feeOfferedPct: null,
      criteria: refusalCriteria,
      feedback: [
        "Strength: Respected the refusal.",
        "Agreed an appropriate next step: coach treated follow-up permission as weak.",
      ],
      approvedPlayReminder:
        "Ask about their selling timeframe, offer one local market insight, and seek permission for a later check-in.",
      suggestedResponse:
        "Totally fair. Mind if I leave a brief suburb update and ask permission to check in when you're ready?",
      method: "heuristic",
      talkTrackId: "tt_timing",
      scenarioId: "not-interested",
    },
  };

  return [...feeAttempts, calibrateTarget];
}

const PRIYA_ID = "rep_demo_priya";
const MARCUS_ID = "rep_demo_marcus";

/**
 * Priya - on-track closer story: exclusivity / next-step drills improving.
 */
export function buildPriyaDemoAttempts(): PracticeAttempt[] {
  const specs = [
    {
      id: "demo_priya_01",
      createdAt: "2026-09-04T09:00:00.000Z",
      heldFee: true,
      feeOfferedPct: null as number | null,
      partial: {
        explored: 0.5,
        clarify: 0.4,
        value: 0.5,
        held: 0.8,
        play: 0.3,
        cave: 0.7,
        notes: {
          used_approved_play: "Rushed toward paperwork.",
          asked_clarifying_q: "Skipped how long they wanted exclusivity.",
        },
      },
      feedback: [
        "Held commission, but next-step agreement was vague.",
        "Slow down before asking for the authority.",
      ],
      userLine:
        "Our fee is 2.5%. Shall we just get the sales authority signed today?",
      scenarioId: "need-to-think",
      talkTrackId: "tt_exclusivity",
      opening:
        "I'm not ready to sign an exclusive authority until I understand the term.",
    },
    {
      id: "demo_priya_02",
      createdAt: "2026-09-09T11:30:00.000Z",
      heldFee: true,
      feeOfferedPct: null as number | null,
      partial: {
        explored: 0.7,
        clarify: 0.8,
        value: 0.7,
        held: 0.9,
        play: 0.7,
        cave: 1,
        notes: {
          asked_clarifying_q: "Asked about preferred term length.",
          used_approved_play: "Walked through reporting expectations.",
        },
      },
      feedback: [
        "Strength: Clarified term and reporting.",
        "Strength: Held list without rushing the signature.",
      ],
      userLine:
        "Before any paperwork, want a plain-English walkthrough of the authority and what you can change later?",
      scenarioId: "need-to-think",
      talkTrackId: "tt_exclusivity",
      opening:
        "I'm worried about locking into a long exclusive authority.",
    },
    {
      id: "demo_priya_03",
      createdAt: "2026-09-12T15:00:00.000Z",
      heldFee: true,
      feeOfferedPct: null as number | null,
      partial: {
        explored: 0.85,
        clarify: 0.9,
        value: 0.85,
        held: 0.95,
        play: 0.85,
        cave: 1,
        notes: {
          used_approved_play: "Clear next step with permission to follow up.",
        },
      },
      feedback: [
        "Strength: Agreed an appropriate next step.",
        "Clean exclusivity conversation.",
      ],
      userLine:
        "Let's leave the authority unsigned today. I'll email a one-pager on term options and check in Thursday, does that work?",
      scenarioId: "need-to-think",
      talkTrackId: "tt_exclusivity",
      opening: "Can we pause on the exclusive and think overnight?",
    },
  ];

  return specs.map((s) => {
    const c = criteria(s.partial);
    return {
      id: s.id,
      createdAt: s.createdAt,
      repId: PRIYA_ID,
      conversationId: null,
      cueMode: "soft" as const,
      turns: [
        { role: "agent" as const, text: s.opening },
        { role: "user" as const, text: s.userLine },
        {
          role: "agent" as const,
          text: "That helps, thanks for not pressuring me.",
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
        talkTrackId: s.talkTrackId,
        scenarioId: s.scenarioId,
      },
    };
  });
}

/**
 * Marcus - competitive positioning struggle: other-agency drills, softer scores.
 */
export function buildMarcusDemoAttempts(): PracticeAttempt[] {
  const specs = [
    {
      id: "demo_marcus_01",
      createdAt: "2026-09-02T10:00:00.000Z",
      heldFee: false,
      feeOfferedPct: 2,
      partial: {
        explored: 0.3,
        clarify: 0.3,
        value: 0.2,
        held: 0.2,
        play: 0.2,
        cave: 0.2,
        notes: {
          explored_objection: "Badmouthed the other agency.",
          held_fee: "Matched toward their quote too fast.",
        },
      },
      feedback: [
        "Don't trash the other agent.",
        "Ask what they're still missing before talking fee.",
      ],
      userLine:
        "They're cheaper because they cut corners, we can do 2% to keep you.",
      scenarioId: "competitor",
      talkTrackId: "tt_other_agency",
      opening:
        "We've already spoken to another agency who quoted a lower fee.",
    },
    {
      id: "demo_marcus_02",
      createdAt: "2026-09-07T13:00:00.000Z",
      heldFee: false,
      feeOfferedPct: 2.25,
      partial: {
        explored: 0.5,
        clarify: 0.5,
        value: 0.4,
        held: 0.4,
        play: 0.4,
        cave: 0.5,
        notes: {
          explored_objection: "Asked one question, then discounted.",
        },
      },
      feedback: [
        "Better discovery, still softened on commission.",
        "Contrast the plan before the number.",
      ],
      userLine:
        "What aren't they covering in marketing? We could meet at 2.25%.",
      scenarioId: "competitor",
      talkTrackId: "tt_other_agency",
      opening: "The other agency feels more flexible on fees.",
    },
    {
      id: "demo_marcus_03",
      createdAt: "2026-09-11T16:30:00.000Z",
      heldFee: true,
      feeOfferedPct: null as number | null,
      partial: {
        explored: 0.7,
        clarify: 0.7,
        value: 0.65,
        held: 0.85,
        play: 0.6,
        cave: 0.8,
        notes: {
          held_fee: "Held 2.5% and contrasted the campaign plan.",
        },
      },
      feedback: [
        "Strength: Held list.",
        "Keep asking what outcome the other pitch won't deliver.",
      ],
      userLine:
        "Totally fair you've spoken to someone else, what's the one outcome you're not sure they'll deliver? Our commission stays 2.5%.",
      scenarioId: "competitor",
      talkTrackId: "tt_other_agency",
      opening: "I'm comparing two agencies and fee is the main gap.",
    },
  ];

  return specs.map((s) => {
    const c = criteria(s.partial);
    return {
      id: s.id,
      createdAt: s.createdAt,
      repId: MARCUS_ID,
      conversationId: null,
      cueMode: "full" as const,
      turns: [
        { role: "agent" as const, text: s.opening },
        { role: "user" as const, text: s.userLine },
        {
          role: "agent" as const,
          text: "I'll think about it and compare notes with my partner.",
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
        talkTrackId: s.talkTrackId,
        scenarioId: s.scenarioId,
      },
    };
  });
}

export function buildTeamDemoAttempts(): PracticeAttempt[] {
  return [
    ...buildAlexDemoAttempts(),
    ...buildPriyaDemoAttempts(),
    ...buildMarcusDemoAttempts(),
  ];
}
