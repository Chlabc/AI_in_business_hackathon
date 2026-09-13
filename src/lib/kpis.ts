import type {
  CallOutcome,
  CallRecord,
  ObjectionStat,
  ObjectionType,
  RepKpis,
  StageStat,
  DealStage,
} from "@/lib/types";

const NEGATIVE: CallOutcome[] = ["lost", "conceded"];

function rate(num: number, den: number): number {
  if (den === 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

export function computeKpis(calls: CallRecord[]): RepKpis {
  const callsAnalysed = calls.length;
  const wins = calls.filter((c) => c.outcome === "won").length;
  const feeCalls = calls.filter((c) => c.objectionType === "fee");
  const feeConcessions = feeCalls.filter((c) => c.outcome === "conceded").length;

  const asked = calls.map((c) => c.feeAskedPct);
  const ended = calls
    .map((c) => c.feeEndedPct)
    .filter((v): v is number => v !== null);

  const stages = Array.from(new Set(calls.map((c) => c.stage))) as DealStage[];
  const byStage: StageStat[] = stages
    .map((stage) => {
      const subset = calls.filter((c) => c.stage === stage);
      const lostOrConceded = subset.filter((c) =>
        NEGATIVE.includes(c.outcome),
      ).length;
      return {
        stage,
        total: subset.length,
        lostOrConceded,
        lossRate: rate(lostOrConceded, subset.length),
      };
    })
    .sort((a, b) => b.lossRate - a.lossRate || b.total - a.total);

  const objections = Array.from(
    new Set(calls.map((c) => c.objectionType)),
  ) as ObjectionType[];
  const byObjection: ObjectionStat[] = objections
    .map((objectionType) => {
      const subset = calls.filter((c) => c.objectionType === objectionType);
      const lostOrConceded = subset.filter((c) =>
        NEGATIVE.includes(c.outcome),
      ).length;
      const drops = subset
        .filter((c) => c.feeEndedPct !== null)
        .map((c) => (c.feeAskedPct as number) - (c.feeEndedPct as number));
      const avgConcessionPts =
        drops.length === 0
          ? null
          : Math.round(
              (drops.reduce((a, b) => a + b, 0) / drops.length) * 10,
            ) / 10;
      return {
        objectionType,
        total: subset.length,
        lostOrConceded,
        lossRate: rate(lostOrConceded, subset.length),
        avgConcessionPts,
      };
    })
    .sort((a, b) => b.lossRate - a.lossRate || b.total - a.total);

  return {
    callsAnalysed,
    winRate: rate(wins, callsAnalysed),
    feeConcessionRate: rate(feeConcessions, feeCalls.length || 1),
    avgFeeAskedPct:
      asked.length === 0
        ? 0
        : Math.round((asked.reduce((a, b) => a + b, 0) / asked.length) * 10) /
          10,
    avgFeeEndedPct:
      ended.length === 0
        ? null
        : Math.round((ended.reduce((a, b) => a + b, 0) / ended.length) * 10) /
          10,
    byStage,
    byObjection,
    practice: {
      attempts: 0,
      lastScore: null,
      feeHoldRate: null,
      trendLabel: "No practice attempts yet, start a drill to track KPIs",
    },
  };
}
