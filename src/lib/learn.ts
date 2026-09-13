import type { FirmPlaybook } from "@/lib/playbook";

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  tag: string;
};

export type QuizOption = {
  id: string;
  label: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
  /** Correct option id */
  correctId: string;
  explain: string;
};

function money(n: number): string {
  return `${n}%`;
}

/** Study cards derived from the current firm playbook. */
export function buildFlashcards(playbook: FirmPlaybook): Flashcard[] {
  const cards: Flashcard[] = [
    {
      id: "list",
      front: "What is our standard commission?",
      back: money(playbook.standardPermFeePct),
      tag: "Pricing",
    },
    {
      id: "floor",
      front: "What is the approval floor (never go below without approval)?",
      back: money(playbook.feeFloorPct),
      tag: "Pricing",
    },
    {
      id: "competitor",
      front: "What competing commission might the seller quote?",
      back: money(playbook.competitorQuotePct),
      tag: "Competitive",
    },
  ];

  playbook.valueAnchors.slice(0, 3).forEach((anchor, i) => {
    cards.push({
      id: `anchor_${i}`,
      front: `Name value anchor ${i + 1}, what do you point to instead of cutting price?`,
      back: anchor,
      tag: "Value",
    });
  });

  const feeTrack =
    playbook.talkTracks.find((t) => t.objectionType === "fee") ??
    playbook.talkTracks[0];
  if (feeTrack) {
    cards.push({
      id: "fee_play",
      front: `What is the approved way to handle "${feeTrack.title}"?`,
      back: feeTrack.approvedPlay,
      tag: "Talk-track",
    });
    if (feeTrack.neverDo[0]) {
      cards.push({
        id: "fee_never",
        front:
          "A client pushes back on price. What is the one thing you must never do?",
        back: feeTrack.neverDo[0],
        tag: "Guardrail",
      });
    }
  }

  const faqLine = playbook.faqNotes
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 20);
  if (faqLine) {
    cards.push({
      id: "faq",
      front: "What does the firm's playbook FAQ tell you here?",
      back: faqLine.replace(/^[-*•]\s*/, ""),
      tag: "FAQ",
    });
  }

  return cards;
}

/**
 * Build four DISTINCT priced options.
 *
 * The distractors used to be arithmetic on the playbook numbers (list - 0.5,
 * floor - 0.25) with nothing checking the results differed. At the seeded values
 * list - 0.5 and floor are both 2, and floor - 0.25 and competitor are both 1.75,
 * so two questions rendered the same option twice. Candidates are now deduped
 * and topped up until four genuinely different prices exist.
 */
function pricedOptions(correct: number, candidates: number[], slot = 2) {
  const seen = new Set<number>([correct]);
  const values = [correct];

  for (const c of candidates) {
    if (values.length >= 4) break;
    if (c > 0 && !seen.has(c)) {
      seen.add(c);
      values.push(c);
    }
  }
  // Top up from a widening spread if the playbook's own numbers collide.
  for (let step = 0.25; values.length < 4 && step <= 5; step += 0.25) {
    for (const candidate of [correct + step, correct - step]) {
      if (values.length >= 4) break;
      if (candidate > 0 && !seen.has(candidate)) {
        seen.add(candidate);
        values.push(candidate);
      }
    }
  }

  const ids = ["a", "b", "c", "d"] as const;
  // Deterministic placement (no Math.random, so demos stay stable), but each
  // question puts the answer in a different slot, always-first is guessable,
  // and so is always-third.
  const others = values.filter((v) => v !== correct);
  const placed = [
    ...others.slice(0, slot),
    correct,
    ...others.slice(slot),
  ].slice(0, 4);
  return {
    options: placed.map((v, i) => ({ id: ids[i], label: money(v) })),
    correctId: ids[placed.indexOf(correct)],
  };
}

export function buildQuiz(playbook: FirmPlaybook): QuizQuestion[] {
  const list = playbook.standardPermFeePct;
  const floor = playbook.feeFloorPct;
  const competitor = playbook.competitorQuotePct;
  const anchor = playbook.valueAnchors[0] ?? "local comparable sales";
  const feeTrack =
    playbook.talkTracks.find((t) => t.objectionType === "fee") ??
    playbook.talkTracks[0];
  const neverDo =
    feeTrack?.neverDo[0] ?? "Immediate discount without a question";

  const wrongNever =
    feeTrack?.anchorPoints[0] ?? "Clarify the comparison before discounting";

  return [
    {
      id: "q_list",
      prompt: `What is ${playbook.firmName}’s standard commission in the playbook?`,
      ...pricedOptions(list, [floor, competitor, list - 0.5], 3),
      explain: `List is ${money(list)}. Floor is ${money(floor)}, different number.`,
    },
    {
      id: "q_floor",
      prompt: "What is the price floor you must not break without approval?",
      ...pricedOptions(floor, [list, competitor, floor - 0.25], 1),
      explain: `Floor is ${money(floor)}. Going below invents pricing the firm didn’t approve.`,
    },
    {
      id: "q_competitor",
      prompt:
        "If the seller cites a competing commission, which figure is in our playbook?",
      ...pricedOptions(competitor, [list, floor, competitor + 0.375], 2),
      explain: `Playbook competitor quote is ${money(competitor)}, explore before matching.`,
    },
    {
      id: "q_anchor",
      prompt: "Which of these is a firm value anchor?",
      options: [
        { id: "a", label: anchor },
        { id: "b", label: "We always discount 30% to close this week" },
        { id: "c", label: "Apologise for list price as unjustified" },
        {
          id: "d",
          label: "Ignore the marketing plan and only talk commission",
        },
      ],
      correctId: "a",
      explain: `Stand on approved anchors like “${anchor}”.`,
    },
    {
      id: "q_never",
      prompt: "On price pushback, which move is on the never-do list?",
      options: [
        { id: "a", label: wrongNever },
        { id: "b", label: neverDo },
        {
          id: "c",
          label: "Clarify what ‘too expensive’ is measured against",
        },
        {
          id: "d",
          label: "Review campaign scope before cutting commission",
        },
      ],
      correctId: "b",
      explain: `Never: ${neverDo}`,
    },
  ];
}
