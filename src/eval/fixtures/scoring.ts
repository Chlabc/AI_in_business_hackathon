import type { TranscriptTurn } from "@/lib/score";

export type ScoringGold = {
  id: string;
  label: string;
  scenarioId: string;
  turns: TranscriptTurn[];
  /** Human overall score 0–100 (teammate rating on this fixed transcript). */
  humanOverall: number;
  /** Human judgment: did the rep hold near list (soft-hold bar)? */
  humanHeldFee: boolean;
};

/**
 * Fixed transcripts with teammate gold labels for scoring–human agreement.
 * Fictional real estate commission framing (list 2.5%, floor 2%).
 */
export const SCORING_CASES: ScoringGold[] = [
  {
    id: "early_cave",
    label: "Immediate 2.125% concession",
    scenarioId: "price-objection",
    turns: [
      {
        role: "agent",
        text: "Your 2.5% is too high. another agency quoted 1.75%.",
      },
      {
        role: "user",
        text: "Okay we can do 2.125% if you sign this week.",
      },
      {
        role: "agent",
        text: "So you can go lower — how low?",
      },
      {
        role: "user",
        text: "Fine, we can do 1.75% and we'll move fast.",
      },
    ],
    humanOverall: 10,
    humanHeldFee: false,
  },
  {
    id: "strong_hold",
    label: "Explore + value anchor, hold 2.5%",
    scenarioId: "price-objection",
    turns: [
      {
        role: "agent",
        text: "Your 2.5% is too high. another agency quoted 1.75%.",
      },
      {
        role: "user",
        text: "Help me understand — what is the 1.75% quote measured against? Does it include the marketing plan, inspections, and negotiation support?",
      },
      {
        role: "agent",
        text: "It's just a lower price. Why pay more?",
      },
      {
        role: "user",
        text: "Our service includes local comparable sales, a tailored marketing plan and dedicated negotiation support. Happy to trade campaign scope for a small concession later, but I hold the 2.5% list.",
      },
    ],
    humanOverall: 88,
    humanHeldFee: true,
  },
  {
    id: "soft_18",
    label: "Some exploration then soft to 2.25%",
    scenarioId: "price-objection",
    turns: [
      {
        role: "agent",
        text: "2.5% is steep versus 1.75%.",
      },
      {
        role: "user",
        text: "Compared to what — the marketing plan and service included, or just the commission rate?",
      },
      {
        role: "agent",
        text: "My partner wants under 2.25%.",
      },
      {
        role: "user",
        text: "We can do 2.25% if we get campaign scope and dedicated negotiation support throughout the campaign.",
      },
    ],
    humanOverall: 72,
    humanHeldFee: true,
  },
  {
    id: "no_questions_defend",
    label: "Defends price with no questions",
    scenarioId: "price-objection",
    turns: [
      {
        role: "agent",
        text: "Your price is too high.",
      },
      {
        role: "user",
        text: "Our price is fair. We're the best agency in the area and you should just pay 2.5%.",
      },
      {
        role: "agent",
        text: "That doesn't help me with my partner.",
      },
      {
        role: "user",
        text: "Well I can't go lower. Take it or leave it.",
      },
    ],
    humanOverall: 30,
    humanHeldFee: true,
  },
  {
    id: "floor_break",
    label: "Drops below firm floor to 1.75%",
    scenarioId: "price-objection",
    turns: [
      {
        role: "agent",
        text: "another agency said 1.75%. Match it.",
      },
      {
        role: "user",
        text: "What's driving the push for 1.75%?",
      },
      {
        role: "agent",
        text: "Budget. Match 1.75% or we're done.",
      },
      {
        role: "user",
        text: "Okay, how about I drop to 1.75% then.",
      },
    ],
    humanOverall: 28,
    humanHeldFee: false,
  },
  {
    id: "robotic_perfect",
    label: "Robotic perfect lines (known limit)",
    scenarioId: "price-objection",
    turns: [
      {
        role: "agent",
        text: "Your 2.5% is too high versus 1.75%.",
      },
      {
        role: "user",
        text: "What is too expensive measured against? We use local comparable sales, a tailored marketing plan and negotiation support. I can offer campaign scope before any discount. I hold 2.5%.",
      },
    ],
    humanOverall: 78,
    humanHeldFee: true,
  },
  {
    id: "competitor_ok",
    label: "Competitor scenario — appraisal offer",
    scenarioId: "competitor",
    turns: [
      {
        role: "agent",
        text: "We already have a great relationship with another agency.",
      },
      {
        role: "user",
        text: "Totally fair — where are they still leaving gaps? Happy to arrange a no-obligation appraisal so you can compare selling approaches.",
      },
    ],
    humanOverall: 78,
    humanHeldFee: true,
  },
  {
    id: "mention_competitor_pct",
    label: "Mentions 1.75% quote without offering it",
    scenarioId: "price-objection",
    turns: [
      {
        role: "agent",
        text: "another agency quoted 1.75%.",
      },
      {
        role: "user",
        text: "Interesting — what does that 1.75% include? Our list is 2.5% with the marketing plan and negotiation support. I am not matching 1.75%.",
      },
      {
        role: "agent",
        text: "So you won't move?",
      },
      {
        role: "user",
        text: "I'll trade scope — campaign scope — before discount. Holding 2.5%.",
      },
    ],
    humanOverall: 84,
    humanHeldFee: true,
  },
];

/** |aiOverall - humanOverall| ≤ this counts as agreement. */
export const OVERALL_AGREEMENT_BAND = 20;
