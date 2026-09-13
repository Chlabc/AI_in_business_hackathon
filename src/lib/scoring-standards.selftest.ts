/**
 * Run: npx tsx --tsconfig tsconfig.json src/lib/scoring-standards.selftest.ts
 */
import { overallFromCriteria, type PracticeScore } from "@/lib/rubric";
import { criterionInPlay } from "@/lib/scoring-standards";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(
  criterionInPlay(
    "agreed_next_step",
    0,
    [
      {
        role: "user",
        text: "Would it be okay if I checked in later with a market update?",
      },
    ],
  ),
  "follow-up language should put agreed_next_step in play",
);

assert(
  !criterionInPlay("agreed_next_step", 0, [
    { role: "user", text: "Okay thanks bye." },
  ]),
  "empty signal should not free-mark",
);

const criteria = [
  {
    id: "agreed_next_step" as const,
    label: "Agreed an appropriate next step",
    score: 0.3,
    max: 25,
    notes: "weak",
  },
  {
    id: "respected_refusal" as const,
    label: "Respected the refusal",
    score: 0.9,
    max: 30,
    notes: "ok",
  },
];
const before = overallFromCriteria(criteria);
const after = overallFromCriteria(
  criteria.map((c) =>
    c.id === "agreed_next_step" ? { ...c, score: 1 } : c,
  ),
);
assert(after > before, "full marks on next step should raise overall");

const _scoreShape: PracticeScore = {
  overall: after,
  heldFee: true,
  feeOfferedPct: null,
  criteria,
  feedback: [],
  approvedPlayReminder: "",
  suggestedResponse: "",
  method: "heuristic",
  talkTrackId: "tt_timing",
  scenarioId: "not-interested",
};
void _scoreShape;

console.log("scoring-standards.selftest: ok");
