export type RubricCriterionId =
  | "explored_objection"
  | "asked_clarifying_q"
  | "anchored_value"
  | "held_fee"
  | "used_approved_play"
  | "no_early_cave"
  | "respected_refusal"
  | "agreed_next_step";

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

/**
 * Rubric for a scenario where the buyer is not interested.
 *
 * Booking the appointment is deliberately NOT the only way to win. A rep who
 * keeps pitching after a clear refusal is behaving badly even if they get a
 * meeting, and a rep who accepts the no and secures permission to follow up
 * later has done the professional thing. Scoring only conversions rewards
 * pressure; this rewards judgement.
 *
 * Kept separate from FEE_RUBRIC rather than added to it, so the fee scenarios
 * the eval fixtures grade are scored by exactly the same six criteria as
 * before and their human-agreement numbers still mean what they meant.
 */
export const REFUSAL_RUBRIC: RubricCriterion[] = [
  {
    id: "respected_refusal",
    label: "Respected the refusal",
    weight: 30,
    description:
      "Acknowledged the no and stopped pitching, rather than pushing a second or third time.",
  },
  {
    id: "asked_clarifying_q",
    label: "Asked one useful question",
    weight: 20,
    description:
      "Established timing or circumstance before accepting or closing out.",
  },
  {
    id: "agreed_next_step",
    label: "Agreed an appropriate next step",
    weight: 25,
    description:
      "Secured permission for a later follow-up, or closed the call cleanly. Either is a pass.",
  },
  {
    id: "used_approved_play",
    label: "Used approved play ideas",
    weight: 15,
    description: "Language overlaps the firm's approved re-engagement track.",
  },
  {
    id: "anchored_value",
    label: "Left something of value",
    weight: 10,
    description: "Offered a useful reason to reconnect, not a generic pitch.",
  },
];

/** Which rubric applies to a scenario. Fee scenarios are unchanged. */
export function rubricForScenario(scenarioId: string): RubricCriterion[] {
  return scenarioId === "not-interested" ? REFUSAL_RUBRIC : FEE_RUBRIC;
}

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
  /**
   * Agency standards the principal set that changed this score.
   *
   * Shown to the rep so a corrected verdict is attributable — "your principal
   * decided this" rather than an unexplained difference from last time.
   */
  appliedGuidance?: {
    criterionLabel: string;
    reason: string;
    byName: string;
  }[];
};
