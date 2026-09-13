import { promises as fs } from "fs";
import path from "path";
import { buildAlexDemoAttempts } from "@/data/demo-attempts";
import { DEMO_REP_ID } from "@/data/seed";
import type { CueMode } from "@/lib/cue-reactivity";
import { dataStorePath } from "@/lib/file-store";
import {
  overallFromCriteria,
  type PracticeScore,
  type RubricCriterionId,
} from "@/lib/rubric";
import type { TranscriptTurn } from "@/lib/score";

/** Rep-owned debrief after a scored drill — never sent to manager PDF. */
export type AttemptReflection = {
  whatWentWrong: string;
  nextTime: string;
  savedAt: string;
};

/** Manager override of one criterion on a scored attempt. */
export type AttemptCalibrationOverride = {
  criterionId: RubricCriterionId;
  originalScore: number;
  overriddenScore: number;
  originalOverall: number;
  reason: string;
  scope: "attempt" | "agency";
  byEmail: string;
  byName: string;
  createdAt: string;
};

export type PracticeAttempt = {
  id: string;
  repId: string;
  createdAt: string;
  conversationId: string | null;
  turns: TranscriptTurn[];
  score: PracticeScore;
  reflection?: AttemptReflection;
  /**
   * How much help was on screen during the drill.
   * Without this, a score can't be read as "earned unaided" rather than
   * "earned while reading the approved play off a cue card" — which is the
   * difference between practising and copying.
   */
  cueMode?: CueMode;
  calibration?: {
    overrides: AttemptCalibrationOverride[];
  };
};

const STORE = dataStorePath("practice-attempts.json");

async function readAll(): Promise<PracticeAttempt[]> {
  try {
    const raw = await fs.readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as PracticeAttempt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(attempts: PracticeAttempt[]): Promise<void> {
  await fs.mkdir(path.dirname(STORE), { recursive: true });
  await fs.writeFile(STORE, JSON.stringify(attempts, null, 2), "utf8");
}

export async function saveAttempt(
  attempt: Omit<PracticeAttempt, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): Promise<PracticeAttempt> {
  const all = await readAll();
  const row: PracticeAttempt = {
    id: attempt.id ?? `attempt_${Date.now()}`,
    createdAt: attempt.createdAt ?? new Date().toISOString(),
    repId: attempt.repId,
    conversationId: attempt.conversationId,
    turns: attempt.turns,
    score: attempt.score,
    ...(attempt.reflection ? { reflection: attempt.reflection } : {}),
    ...(attempt.cueMode ? { cueMode: attempt.cueMode } : {}),
  };
  all.push(row);
  await writeAll(all);
  return row;
}

export async function updateAttemptReflection(
  attemptId: string,
  repId: string,
  reflection: Omit<AttemptReflection, "savedAt"> & { savedAt?: string },
): Promise<PracticeAttempt | null> {
  const all = await readAll();
  const idx = all.findIndex((a) => a.id === attemptId && a.repId === repId);
  if (idx < 0) return null;
  const next: AttemptReflection = {
    whatWentWrong: reflection.whatWentWrong.trim(),
    nextTime: reflection.nextTime.trim(),
    savedAt: reflection.savedAt ?? new Date().toISOString(),
  };
  all[idx] = { ...all[idx], reflection: next };
  await writeAll(all);
  return all[idx];
}

async function hydrateAttemptFromSupabase(
  attemptId: string,
): Promise<PracticeAttempt | null> {
  try {
    const {
      getPracticeSession,
      practiceSessionsAvailable,
    } = await import("@/lib/practice-sessions");
    if (!practiceSessionsAvailable()) return null;
    const session = await getPracticeSession(attemptId);
    if (!session) return null;
    return {
      id: session.id,
      createdAt: session.createdAt,
      repId: session.repId,
      conversationId: session.conversationId,
      turns: session.turns,
      score: session.score,
      cueMode: (session.cueMode as CueMode | null) ?? undefined,
      reflection: session.reflection ?? undefined,
      calibration: session.calibration ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function getAttemptById(
  attemptId: string,
): Promise<PracticeAttempt | null> {
  let all = await readAll();
  all = await ensureAlexDemoAttempts(all);
  const local = all.find((a) => a.id === attemptId);
  if (local) return local;
  // Vercel /tmp is per-instance; manager logs often come from Supabase.
  return hydrateAttemptFromSupabase(attemptId);
}

/**
 * Manager calibration: override one criterion, recalc overall, append audit.
 */
export async function updateAttemptCalibration(
  attemptId: string,
  input: {
    criterionId: RubricCriterionId;
    overriddenScore: 0 | 0.5 | 1;
    reason: string;
    scope: "attempt" | "agency";
    byEmail: string;
    byName: string;
  },
): Promise<PracticeAttempt | null> {
  const reason = input.reason.trim();
  if (!reason) throw new Error("Reason is required.");
  if (reason.length > 500) throw new Error("Reason is too long (max 500).");

  const all = await readAll();
  // Ensure demo arc exists before calibrating seeded ids.
  const withDemo = await ensureAlexDemoAttempts(all);
  const idx = withDemo.findIndex((a) => a.id === attemptId);
  if (idx < 0) return null;

  const attempt = withDemo[idx]!;
  const criterion = attempt.score.criteria.find(
    (c) => c.id === input.criterionId,
  );
  if (!criterion) throw new Error("Criterion not found on this attempt.");

  const originalOverall = attempt.score.overall;
  const originalScore = criterion.score;
  const criteria = attempt.score.criteria.map((c) =>
    c.id === input.criterionId
      ? {
          ...c,
          score: input.overriddenScore,
          notes: `Manager override (${input.byName}): ${reason}`,
        }
      : c,
  );
  const overall = overallFromCriteria(criteria);
  const override: AttemptCalibrationOverride = {
    criterionId: input.criterionId,
    originalScore,
    overriddenScore: input.overriddenScore,
    originalOverall,
    reason,
    scope: input.scope,
    byEmail: input.byEmail,
    byName: input.byName,
    createdAt: new Date().toISOString(),
  };

  const prev = attempt.calibration?.overrides ?? [];
  withDemo[idx] = {
    ...attempt,
    score: {
      ...attempt.score,
      criteria,
      overall,
    },
    calibration: { overrides: [...prev, override] },
  };
  await writeAll(withDemo);
  return withDemo[idx]!;
}

/** Manager calibrate list — criteria yes, transcript/reflection no. */
export type CalibrateAttemptSummary = {
  id: string;
  repId: string;
  createdAt: string;
  scenarioId: string;
  overall: number;
  cueMode?: CueMode;
  criteria: PracticeScore["criteria"];
  calibrationCount: number;
};

export function toCalibrateSummary(
  attempt: PracticeAttempt,
): CalibrateAttemptSummary {
  return {
    id: attempt.id,
    repId: attempt.repId,
    createdAt: attempt.createdAt,
    scenarioId: attempt.score.scenarioId,
    overall: attempt.score.overall,
    cueMode: attempt.cueMode,
    criteria: attempt.score.criteria,
    calibrationCount: attempt.calibration?.overrides.length ?? 0,
  };
}

/**
 * Plant Alex’s demo improvement arc when missing (fresh /tmp on Vercel, or
 * only ad-hoc test drills). Idempotent once `demo_alex_*` ids exist.
 */
async function ensureAlexDemoAttempts(
  all: PracticeAttempt[],
): Promise<PracticeAttempt[]> {
  const hasDemoArc = all.some(
    (a) => a.repId === DEMO_REP_ID && a.id.startsWith("demo_alex_"),
  );
  const calibrateId = "demo_alex_calibrate_refusal";
  const hasCalibrate = all.some((a) => a.id === calibrateId);

  if (hasDemoArc && hasCalibrate) return all;

  const seeded = buildAlexDemoAttempts();
  if (!hasDemoArc) {
    const withoutAlex = all.filter((a) => a.repId !== DEMO_REP_ID);
    const next = [...withoutAlex, ...seeded];
    await writeAll(next);
    return next;
  }

  // Existing demo arc but missing calibrate seed — append only that row.
  const calibrate = seeded.find((a) => a.id === calibrateId);
  if (!calibrate) return all;
  const next = [...all, calibrate];
  await writeAll(next);
  return next;
}

export async function listAttempts(repId: string): Promise<PracticeAttempt[]> {
  let all = await readAll();
  all = await ensureAlexDemoAttempts(all);
  return all
    .filter((a) => a.repId === repId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function practiceKpisFromAttempts(attempts: PracticeAttempt[]) {
  if (attempts.length === 0) {
    return {
      attempts: 0,
      lastScore: null as number | null,
      avgScore: null as number | null,
      feeHoldRate: null as number | null,
      weakestCriterionLabel: null as string | null,
      trendLabel: "No practice attempts yet — start a drill to track KPIs",
    };
  }
  const lastScore = attempts[0]!.score.overall;
  const avgScore = Math.round(
    attempts.reduce((sum, a) => sum + a.score.overall, 0) / attempts.length,
  );
  const holds = attempts.filter((a) => a.score.heldFee).length;
  const feeHoldRate = Math.round((holds / attempts.length) * 1000) / 10;
  const chronological = [...attempts].reverse();
  let trendLabel = "Keep drilling the fee objection.";
  if (chronological.length >= 2) {
    const first = chronological[0]!.score.overall;
    const latest = chronological[chronological.length - 1]!.score.overall;
    if (latest > first + 5) {
      trendLabel = `Improving — score ${first} → ${latest} across ${attempts.length} attempts.`;
    } else if (latest < first - 5) {
      trendLabel = `Dip vs first attempt (${first} → ${latest}). Re-read the approved play.`;
    } else {
      trendLabel = `Steady around ${latest}. Push for a cleaner hold next round.`;
    }
  } else {
    trendLabel = `First scored attempt: ${lastScore}/100.`;
  }

  // Average each criterion across drills; lowest mean score = weakest skill.
  const sums = new Map<string, { label: string; total: number; n: number }>();
  for (const a of attempts) {
    for (const c of a.score.criteria) {
      const prev = sums.get(c.id) ?? { label: c.label, total: 0, n: 0 };
      prev.total += c.score;
      prev.n += 1;
      sums.set(c.id, prev);
    }
  }
  let weakestCriterionLabel: string | null = null;
  let weakestAvg = Number.POSITIVE_INFINITY;
  for (const row of sums.values()) {
    const avg = row.total / row.n;
    if (avg < weakestAvg) {
      weakestAvg = avg;
      weakestCriterionLabel = row.label;
    }
  }

  return {
    attempts: attempts.length,
    lastScore,
    avgScore,
    feeHoldRate,
    weakestCriterionLabel,
    trendLabel,
  };
}
