export type CallOutcome = "won" | "lost" | "conceded" | "no_decision";

export type ObjectionType =
  | "fee"
  | "other_agency"
  | "just_cvs"
  | "timing"
  | "exclusivity"
  | "other";

export type DealStage =
  | "intro"
  | "needs"
  | "proposal"
  | "fee"
  | "close";

export type TalkTrack = {
  id: string;
  objectionType: ObjectionType;
  title: string;
  approvedPlay: string;
  anchorPoints: string[];
  neverDo: string[];
};

export type CallRecord = {
  id: string;
  repId: string;
  date: string;
  client: string;
  role: string;
  stage: DealStage;
  objectionType: ObjectionType;
  outcome: CallOutcome;
  feeAskedPct: number;
  feeEndedPct: number | null;
  transcriptSnippet: string;
  notes: string;
};

export type Rep = {
  id: string;
  name: string;
  title: string;
  agency: string;
  weeksInRole: number;
};

export type Firm = {
  id: string;
  name: string;
  vertical: string;
  standardPermFeePct: number;
  feeFloorPct: number;
  valueAnchors: string[];
};

export type StageStat = {
  stage: DealStage;
  total: number;
  lostOrConceded: number;
  lossRate: number;
};

export type ObjectionStat = {
  objectionType: ObjectionType;
  total: number;
  lostOrConceded: number;
  lossRate: number;
  avgConcessionPts: number | null;
};

export type Diagnosis = {
  repId: string;
  primaryStage: DealStage;
  primaryObjection: ObjectionType;
  headline: string;
  evidence: string[];
  lossRateAtWeakSpot: number;
  supportingCallIds: string[];
  recommendedDrillId: string;
  confidence: "high" | "medium" | "low";
};

export type RepKpis = {
  callsAnalysed: number;
  winRate: number;
  feeConcessionRate: number;
  avgFeeAskedPct: number;
  avgFeeEndedPct: number | null;
  byStage: StageStat[];
  byObjection: ObjectionStat[];
  /** Practice KPIs - filled from Phase 3+ attempts; zeroed until then */
  practice: {
    attempts: number;
    lastScore: number | null;
    feeHoldRate: number | null;
    trendLabel: string;
  };
};

export type RepDashboard = {
  rep: Rep;
  firm: Firm;
  kpis: RepKpis;
  diagnosis: Diagnosis;
  talkTrack: TalkTrack;
  recentCalls: CallRecord[];
};
