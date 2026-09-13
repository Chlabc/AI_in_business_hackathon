import type { PracticeAttempt } from "@/lib/attempts";

export type BeforeAfterEvidence = {
  attemptCount: number;
  firstScore: number | null;
  latestScore: number | null;
  firstHeld: boolean | null;
  latestHeld: boolean | null;
  /** Hold rate on the earliest half of attempts (chronological). */
  holdRateEarlyPct: number | null;
  /** Hold rate on the latest half of attempts. */
  holdRateLatePct: number | null;
  scoreDelta: number | null;
  /** Grounded blurb — never invents pipeline / conversion %. */
  roiBlurb: string;
  summaryLine: string;
};

function holdRate(slice: PracticeAttempt[]): number | null {
  if (slice.length === 0) return null;
  const holds = slice.filter((a) => a.score.heldFee).length;
  return Math.round((holds / slice.length) * 1000) / 10;
}

/**
 * Before/after from scored practice attempts only.
 * Judges get behavioural ROI (hold rate / score), not invented CRM conversion.
 */
export function beforeAfterFromAttempts(
  attempts: PracticeAttempt[],
): BeforeAfterEvidence {
  const chronological = [...attempts].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const n = chronological.length;

  if (n === 0) {
    return {
      attemptCount: 0,
      firstScore: null,
      latestScore: null,
      firstHeld: null,
      latestHeld: null,
      holdRateEarlyPct: null,
      holdRateLatePct: null,
      scoreDelta: null,
      summaryLine: "No scored drills yet — run 2–3 price drills to generate evidence.",
      roiBlurb:
        "Cornerman’s value claim is behavioural: diagnose the weak spot, drill it live, and measure hold-rate / score change across attempts. We do not invent pipeline conversion lifts. After a few drills, this page fills with before/after from real practice scores.",
    };
  }

  const first = chronological[0];
  const latest = chronological[n - 1];
  const mid = Math.max(1, Math.floor(n / 2));
  const early = chronological.slice(0, mid);
  const late = chronological.slice(mid);
  const earlyHold = holdRate(early);
  const lateHold = holdRate(late.length ? late : early);
  const scoreDelta = latest.score.overall - first.score.overall;

  const holdPhrase =
    earlyHold !== null && lateHold !== null
      ? `Price-hold rate moved from ${earlyHold}% (early drills) to ${lateHold}% (later drills) across ${n} scored attempt${n === 1 ? "" : "s"}.`
      : `Across ${n} scored attempt${n === 1 ? "" : "s"}, latest score is ${latest.score.overall}/100.`;

  const scorePhrase =
    scoreDelta > 5
      ? `Overall score improved ${first.score.overall} → ${latest.score.overall} (Δ+${scoreDelta}).`
      : scoreDelta < -5
        ? `Overall score moved ${first.score.overall} → ${latest.score.overall} (Δ${scoreDelta}) — keep drilling the approved play.`
        : `Overall score stayed near ${latest.score.overall}/100 (first ${first.score.overall}).`;

  const behaviourPhrase =
    first.score.heldFee === false && latest.score.heldFee === true
      ? "First drill softened price; latest drill held list — the behaviour the coach targets."
      : first.score.heldFee && latest.score.heldFee
        ? "Hold behaviour stayed intact from first to latest drill."
        : "Latest drill still softened — use Soft/Full cues and Learn before the next attempt.";

  return {
    attemptCount: n,
    firstScore: first.score.overall,
    latestScore: latest.score.overall,
    firstHeld: first.score.heldFee,
    latestHeld: latest.score.heldFee,
    holdRateEarlyPct: earlyHold,
    holdRateLatePct: lateHold,
    scoreDelta,
    summaryLine: `${holdPhrase} ${scorePhrase}`,
    roiBlurb: [
      "Semi-quantified value (practice only — not CRM revenue):",
      holdPhrase,
      scorePhrase,
      behaviourPhrase,
      "If each avoided panic discount protects margin on a multi-seat deal, coaching payback is the retained list price on deals the AE would otherwise cave — measured here via hold rate, not invented win rates.",
    ].join(" "),
  };
}

export type UserTestSession = {
  id: string;
  participant: string;
  role: string;
  date: string;
  beforeNote: string;
  afterNote: string;
  quote: string;
  /** demo_labeled = pitch template; live = filled from a real test */
  source: "demo_labeled" | "live";
};

/** 3–5 labeled sessions for judges; replace quotes after real user tests. */
export const DEFAULT_USER_TEST_SESSIONS: UserTestSession[] = [
  {
    id: "ut_01",
    participant: "AE A",
    role: "Account Executive",
    date: "2026-09-10",
    beforeNote: "Opened with an immediate discount when buyer said “too expensive.”",
    afterNote: "Asked what “too expensive” meant; anchored SOC2 / time-to-value; held nearer list.",
    quote:
      "Having the cue cards mid-call stopped me from apologising for the price.",
    source: "demo_labeled",
  },
  {
    id: "ut_02",
    participant: "AE B",
    role: "Account Executive",
    date: "2026-09-11",
    beforeNote: "Matched competitor $ without clarifying what was included.",
    afterNote: "Clarified comparison; offered annual prepay trade instead of a deep cut.",
    quote:
      "The scorecard made it obvious I was conceding in the first 20 seconds.",
    source: "demo_labeled",
  },
  {
    id: "ut_03",
    participant: "AE C",
    role: "Account Executive",
    date: "2026-09-12",
    beforeNote: "Avoided price calls; low confidence on floor rules.",
    afterNote: "Completed Learn quiz + 2 drills; could state list/floor without opening the playbook.",
    quote:
      "Learn + drill in one loop is what I’d actually use between meetings.",
    source: "demo_labeled",
  },
  {
    id: "ut_04",
    participant: "Manager M",
    role: "Sales manager",
    date: "2026-09-12",
    beforeNote: "Only saw win/loss — not whether reps panic-discounted.",
    afterNote: "Progress share showed hold rate without raw transcripts.",
    quote:
      "I want the trend, not the tape. This stays on the right side of surveillance.",
    source: "demo_labeled",
  },
  {
    id: "ut_05",
    participant: "AE D",
    role: "Account Executive",
    date: "2026-09-13",
    beforeNote: "Robotic script reading when nervous.",
    afterNote: "Used Soft cues (bullets only); Full example collapsed unless stuck.",
    quote:
      "Soft mode feels like a coach, not a teleprompter.",
    source: "demo_labeled",
  },
];

export const USER_TEST_PROTOCOL: string[] = [
  "Pick one AE with a known price-cave habit (or use Alex).",
  "Record a baseline: one unscored or Soft-off drill — note if they discount in the first reply.",
  "Run Learn (facts) + Soft/Full cues for 2–3 drills on the same scenario.",
  "Capture before/after: first vs latest hold + score (this page auto-fills from attempts).",
  "Ask for one quote: what changed in how they handled “too expensive?”",
  "Do not invent CRM conversion % — only report practice hold/score deltas + quotes.",
];
