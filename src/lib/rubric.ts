export type RubricCriterionId =
  | "explored_objection"
  | "asked_clarifying_q"
  | "anchored_value"
  | "held_fee"
  | "used_approved_play"
  | "no_early_cave";

export type RubricCriterion = {
  id: RubricCriterionId;
  label: string;
  weight: number;
  description: string;
};

export const FEE_RUBRIC: RubricCriterion[] = [
  {
    id: "explored_objection",
    label: "Explored the objection",
    weight: 20,
    description:
      "Asked what ‘too high’ is measured against or clarified the competing quote.",
  },
  {
    id: "asked_clarifying_q",
    label: "Asked clarifying questions",
    weight: 15,
    description: "Used questions before conceding or defending.",
  },
  {
    id: "anchored_value",
    label: "Anchored on value",
    weight: 20,
    description:
      "Cited local comparable sales, the marketing plan, negotiation support, or similar approved agency anchors.",
  },
  {
    id: "held_fee",
    label: "Held near standard fee",
    weight: 25,
    description:
      "Did not drop below firm floor (2%). Preferred holding near list (2.5%).",
  },
  {
    id: "used_approved_play",
    label: "Used approved play ideas",
    weight: 10,
    description:
      "Language overlaps the approved fee talk-track (explore → anchor → trade scope before % cut).",
  },
  {
    id: "no_early_cave",
    label: "No early cave",
    weight: 10,
    description:
      "Did not concede percentage in the first user turn.",
  },
];

export type CriterionScore = {
  id: RubricCriterionId;
  label: string;
  score: number; // 0–1
  max: number; // weight
  notes: string;
};

export type PracticeScore = {
  overall: number; // 0–100
  heldFee: boolean;
  feeOfferedPct: number | null;
  criteria: CriterionScore[];
  feedback: string[];
  approvedPlayReminder: string;
  /** Huey-style model answer the rep can rehearse next */
  suggestedResponse: string;
  method: "heuristic" | "llm+heuristic";
  talkTrackId: string;
  scenarioId: string;
};
