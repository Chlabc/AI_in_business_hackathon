export type PhaseStatus = "done" | "active" | "pending";

export type Phase = {
  id: number;
  title: string;
  hours: string;
  status: PhaseStatus;
  summary: string;
};

/** Update statuses as stages complete. */
export const PHASES: Phase[] = [
  {
    id: 0,
    title: "Scaffold & scope lock",
    hours: "0 to 2",
    status: "done",
    summary: "Next.js app, README scope, env template, landing page",
  },
  {
    id: 1,
    title: "Seed data & diagnosis",
    hours: "2 to 6",
    status: "done",
    summary: "Call histories, talk-tracks, diagnosis API + KPI coach UI",
  },
  {
    id: 2,
    title: "Voice client persona",
    hours: "6 to 12",
    status: "done",
    summary: "ElevenLabs fee-objection roleplay + transcript UI",
  },
  {
    id: 3,
    title: "Scoring & feedback",
    hours: "12 to 18",
    status: "done",
    summary: "Rubric scores + feedback card + practice KPIs",
  },
  {
    id: 4,
    title: "Close the loop",
    hours: "18 to 24",
    status: "done",
    summary: "Re-practice, progress view, rep-owned sharing",
  },
  {
    id: 5,
    title: "Eval harness",
    hours: "24 to 30",
    status: "done",
    summary: "Diagnosis accuracy + scoring vs human agreement (`npm run eval`)",
  },
  {
    id: 6,
    title: "User tests & value",
    hours: "30 to 36",
    status: "done",
    summary:
      "Value page: before/after, ROI blurb, 3 to 5 labeled user-test sessions",
  },
  {
    id: 7,
    title: "Harden & document",
    hours: "36 to 42",
    status: "active",
    summary: "Stress cases, README, architecture diagram",
  },
  {
    id: 8,
    title: "Demo & submit",
    hours: "42 to 48",
    status: "pending",
    summary: "Video, Devpost, freeze with spare time",
  },
];

export const SCOPE_SENTENCE =
  "Cornerman diagnoses a real estate agent’s losing pattern from seeded call outcomes, runs a live ElevenLabs commission-objection roleplay, scores against approved talk-tracks, and shows progress, rep-owned, not surveillance.";

export const KILL_LIST = [
  "Live CRM / call-recording integration",
  "Multi-vertical generic sales coaching (demo is real estate-focused)",
  "Manager “who’s failing” leaderboard or raw transcript surveillance",
  "Mobile apps, payments, full enterprise SSO",
  "Invented prices or ungrounded best-practice advice",
] as const;
