import {
  FIRM,
  getCallsForRep,
  getRep,
  getTalkTrackForObjection,
} from "@/data/seed";
import { computeKpis } from "@/lib/kpis";
import { seatPrice } from "@/lib/money";
import type {
  CallRecord,
  Diagnosis,
  ObjectionType,
  DealStage,
  RepDashboard,
} from "@/lib/types";

const NEGATIVE = new Set(["lost", "conceded"]);

function lossRate(calls: CallRecord[]): number {
  if (calls.length === 0) return 0;
  const bad = calls.filter((c) => NEGATIVE.has(c.outcome)).length;
  return Math.round((bad / calls.length) * 1000) / 10;
}

type Bucket = {
  stage: DealStage;
  objection: ObjectionType;
  calls: CallRecord[];
};

/**
 * Deterministic diagnosis from an arbitrary call history.
 * Prefers high-volume weak spots (stage × objection) with elevated loss/concede rate.
 * Used by the product path and by the Phase 5 eval harness.
 */
export function diagnoseCalls(
  calls: CallRecord[],
  repId: string,
): Diagnosis | null {
  if (calls.length === 0) return null;

  const map = new Map<string, Bucket>();
  for (const call of calls) {
    const key = `${call.stage}::${call.objectionType}`;
    const bucket = map.get(key) ?? {
      stage: call.stage,
      objection: call.objectionType,
      calls: [],
    };
    bucket.calls.push(call);
    map.set(key, bucket);
  }

  const ranked = Array.from(map.values())
    .map((b) => ({
      ...b,
      rate: lossRate(b.calls),
      bad: b.calls.filter((c) => NEGATIVE.has(c.outcome)).length,
    }))
    .filter((b) => b.calls.length >= 2)
    .sort(
      (a, b) =>
        b.rate - a.rate ||
        b.bad - a.bad ||
        b.calls.length - a.calls.length,
    );

  const top =
    ranked[0] ??
    (() => {
      const fee = calls.filter((c) => c.objectionType === "fee");
      return {
        stage: "fee" as DealStage,
        objection: "fee" as ObjectionType,
        calls: fee.length ? fee : calls.slice(0, 3),
        rate: lossRate(fee.length ? fee : calls),
        bad: 0,
      };
    })();

  const supporting = [...top.calls]
    .filter((c) => NEGATIVE.has(c.outcome))
    .sort((a, b) => b.date.localeCompare(a.date));

  const evidence = supporting.slice(0, 4).map((c) => {
    const drop =
      c.feeEndedPct !== null
        ? ` (${seatPrice(c.feeAskedPct)} → ${seatPrice(c.feeEndedPct)} commission)`
        : "";
    return `${c.date} · ${c.client}: ${c.notes}${drop}`;
  });

  const talkTrack = getTalkTrackForObjection(top.objection);
  const rate = top.rate;
  const confidence: Diagnosis["confidence"] =
    supporting.length >= 4 && rate >= 60
      ? "high"
      : supporting.length >= 2
        ? "medium"
        : "low";

  // "rate" counts lost AND conceded calls together, so the copy must say both.
  // Saying "you discount in {rate}%" would contradict the concession-rate KPI,
  // which counts only the discounted ones.
  const headline =
    top.objection === "fee"
      ? `${rate}% of your price conversations end in a discount or a lost deal, you move on price before asking what the objection really is.`
      : `${rate}% of your calls hitting the ${top.objection.replaceAll("_", " ")} objection end lost or discounted, that's your weakest moment.`;

  return {
    repId,
    primaryStage: top.stage,
    primaryObjection: top.objection,
    headline,
    evidence,
    lossRateAtWeakSpot: rate,
    supportingCallIds: supporting.map((c) => c.id),
    recommendedDrillId: talkTrack.id,
    confidence,
  };
}

/** Product path: diagnose the seeded rep history. */
export function diagnoseRep(repId: string): Diagnosis | null {
  return diagnoseCalls(getCallsForRep(repId), repId);
}

export function getRepDashboard(repId: string): RepDashboard | null {
  const rep = getRep(repId);
  if (!rep) return null;
  const calls = getCallsForRep(repId);
  const diagnosis = diagnoseRep(repId);
  if (!diagnosis) return null;
  const talkTrack = getTalkTrackForObjection(diagnosis.primaryObjection);
  const kpis = computeKpis(calls);

  return {
    rep,
    firm: FIRM,
    kpis,
    diagnosis,
    talkTrack,
    recentCalls: [...calls].reverse(),
  };
}
