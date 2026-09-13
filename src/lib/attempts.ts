import { promises as fs } from "fs";
import path from "path";
import {
  buildAlexDemoAttempts,
  buildMarcusDemoAttempts,
  buildPriyaDemoAttempts,
} from "@/data/demo-attempts";
import { DEMO_REP_ID } from "@/data/seed";
import type { CueMode } from "@/lib/cue-reactivity";
import { dataStorePath } from "@/lib/file-store";
import {
  overallFromCriteria,
  type PracticeScore,
  type RubricCriterionId,
} from "@/lib/rubric";
import type { TranscriptTurn } from "@/lib/score";

/** Rep-owned debrief after a scored drill - never sent to manager PDF. */
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
   * "earned while reading the approved play off a cue card", which is the
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
  } catch (err) {
    console.error("[attempts] hydrate from supabase failed", attemptId, err);
    return null;
  }
}

/**
 * Resolve an attempt for manager tools. Prefer Supabase (durable on Vercel),
 * then local file store (incl. seeded demo ids).
 */
export async function resolveAttempt(
  attemptId: string,
): Promise<PracticeAttempt | null> {
  const cloud = await hydrateAttemptFromSupabase(attemptId);
  if (cloud) return cloud;
  let all = await readAll();
  all = await ensureAlexDemoAttempts(all);
  return all.find((a) => a.id === attemptId) ?? null;
}

export async function getAttemptById(
  attemptId: string,
): Promise<PracticeAttempt | null> {
  return resolveAttempt(attemptId);
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

  // Supabase-first, Practice logs list cloud ids that often aren't in /tmp.
  const attempt = await resolveAttempt(attemptId);
  if (!attempt) return null;

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
  const updated: PracticeAttempt = {
    ...attempt,
    score: {
      ...attempt.score,
      criteria,
      overall,
    },
    calibration: { overrides: [...prev, override] },
  };

  // File mirror (best-effort on serverless).
  try {
    let all = await ensureAlexDemoAttempts(await readAll());
    const idx = all.findIndex((a) => a.id === attemptId);
    if (idx >= 0) all[idx] = updated;
    else all = [...all, updated];
    await writeAll(all);
  } catch (err) {
    console.error("[attempts] file write after calibrate failed", err);
  }

  // Durable write, required for the next Vercel instance.
  const { tryUpsertPracticeSession, updatePracticeSessionCalibration } =
    await import("@/lib/practice-sessions");
  const upserted = await tryUpsertPracticeSession(updated);
  if (!upserted.ok) {
    // Fallback update if row exists but upsert failed oddly
    try {
      await updatePracticeSessionCalibration(attemptId, {
        score: updated.score,
        calibration: updated.calibration,
      });
    } catch (err) {
      console.error("[attempts] supabase calibrate sync failed", err);
      // Still return updated so UI can succeed if at least one store worked;
      // if neither store kept it, the next load will look stale but not 404.
    }
  }

  return updated;
}

/** Manager calibrate list - criteria yes, transcript/reflection no. */
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

async function mirrorDemoToSupabase(rows: PracticeAttempt[]) {
  try {
    const { tryUpsertPracticeSession } = await import(
      "@/lib/practice-sessions"
    );
    for (const row of rows) {
      await tryUpsertPracticeSession(row);
    }
  } catch (err) {
    console.error("[attempts] demo seed supabase mirror failed", err);
  }
}

/**
 * Plant demo arcs for Alex / Priya / Marcus when missing.
 * Idempotent once each prefix exists.
 */
async function ensureAlexDemoAttempts(
  all: PracticeAttempt[],
): Promise<PracticeAttempt[]> {
  const hasAlex = all.some(
    (a) => a.repId === DEMO_REP_ID && a.id.startsWith("demo_alex_"),
  );
  const hasCalibrate = all.some((a) => a.id === "demo_alex_calibrate_refusal");
  const hasPriya = all.some((a) => a.id.startsWith("demo_priya_"));
  const hasMarcus = all.some((a) => a.id.startsWith("demo_marcus_"));

  if (hasAlex && hasCalibrate && hasPriya && hasMarcus) return all;

  let next = [...all];
  const toMirror: PracticeAttempt[] = [];

  if (!hasAlex) {
    const seeded = buildAlexDemoAttempts();
    next = next.filter((a) => a.repId !== DEMO_REP_ID);
    next.push(...seeded);
    toMirror.push(...seeded);
  } else if (!hasCalibrate) {
    const calibrate = buildAlexDemoAttempts().find(
      (a) => a.id === "demo_alex_calibrate_refusal",
    );
    if (calibrate) {
      next.push(calibrate);
      toMirror.push(calibrate);
    }
  }

  if (!hasPriya) {
    const seeded = buildPriyaDemoAttempts();
    next = next.filter((a) => a.repId !== "rep_demo_priya");
    next.push(...seeded);
    toMirror.push(...seeded);
  }

  if (!hasMarcus) {
    const seeded = buildMarcusDemoAttempts();
    next = next.filter((a) => a.repId !== "rep_demo_marcus");
    next.push(...seeded);
    toMirror.push(...seeded);
  }

  await writeAll(next);
  if (toMirror.length) await mirrorDemoToSupabase(toMirror);
  return next;
}

/**
 * List attempts for a rep.
 * When Supabase is configured, **read from Supabase only** (source of truth).
 * File store is a local/dev fallback when cloud isn't set up.
 */
export async function listAttempts(repId: string): Promise<PracticeAttempt[]> {
  try {
    const {
      listPracticeAttemptsForRep,
      practiceSessionsAvailable,
    } = await import("@/lib/practice-sessions");

    if (practiceSessionsAvailable()) {
      let cloud = await listPracticeAttemptsForRep(repId, 50);
      // Seed demos into cloud if this rep has nothing yet (first Team/Progress hit).
      if (cloud.length === 0) {
        await ensureAlexDemoAttempts(await readAll());
        cloud = await listPracticeAttemptsForRep(repId, 50);
      }
      return cloud.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  } catch (err) {
    console.error(
      "[attempts] listAttempts supabase read failed; falling back to file",
      err,
    );
  }

  let all = await readAll();
  all = await ensureAlexDemoAttempts(all);
  return all
    .filter((a) => a.repId === repId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type PracticeTrendPoint = {
  /** Short axis label (e.g. drill # or date). */
  label: string;
  /** Overall score 0 to 100 for this drill. */
  score: number;
  /** 100 if fee held, 0 if softened, for hold-rate style charts. */
  holdPct: number;
};

export function practiceKpisFromAttempts(attempts: PracticeAttempt[]) {
  if (attempts.length === 0) {
    return {
      attempts: 0,
      lastScore: null as number | null,
      avgScore: null as number | null,
      feeHoldRate: null as number | null,
      /** % of drills where the agent softened / didn't hold fee. */
      concessionRate: null as number | null,
      /** % of drills scoring >= 70 (usable "success" proxy - not CRM win rate). */
      strongDrillRate: null as number | null,
      weakestCriterionLabel: null as string | null,
      weakestCriterionId: null as string | null,
      criterionAverages: [] as {
        id: string;
        label: string;
        avgPct: number;
      }[],
      trendLabel: "No practice attempts yet, start a drill to track KPIs",
      trend: [] as PracticeTrendPoint[],
    };
  }
  const lastScore = attempts[0]!.score.overall;
  const avgScore = Math.round(
    attempts.reduce((sum, a) => sum + a.score.overall, 0) / attempts.length,
  );
  const holds = attempts.filter((a) => a.score.heldFee).length;
  const feeHoldRate = Math.round((holds / attempts.length) * 1000) / 10;
  const concessionRate =
    Math.round(((attempts.length - holds) / attempts.length) * 1000) / 10;
  const strong = attempts.filter((a) => a.score.overall >= 70).length;
  const strongDrillRate = Math.round((strong / attempts.length) * 1000) / 10;
  const chronological = [...attempts].reverse();
  let trendLabel = "Keep drilling the fee objection.";
  if (chronological.length >= 2) {
    const first = chronological[0]!.score.overall;
    const latest = chronological[chronological.length - 1]!.score.overall;
    if (latest > first + 5) {
      trendLabel = `Improving, score ${first} → ${latest} across ${attempts.length} attempts.`;
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
  let weakestCriterionId: string | null = null;
  let weakestAvg = Number.POSITIVE_INFINITY;
  const criterionAverages: {
    id: string;
    label: string;
    /** Mean criterion score as 0–100 (rubric criteria are 0–1). */
    avgPct: number;
  }[] = [];
  for (const [id, row] of sums.entries()) {
    const avg = row.total / row.n;
    const avgPct = Math.round(avg * 1000) / 10;
    criterionAverages.push({ id, label: row.label, avgPct });
    if (avg < weakestAvg) {
      weakestAvg = avg;
      weakestCriterionLabel = row.label;
      weakestCriterionId = id;
    }
  }
  criterionAverages.sort((a, b) => a.avgPct - b.avgPct);

  const trend: PracticeTrendPoint[] = chronological.map((a, i) => {
    const d = new Date(a.createdAt);
    const label = Number.isNaN(d.getTime())
      ? `#${i + 1}`
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return {
      label: chronological.length > 8 ? `#${i + 1}` : label,
      score: a.score.overall,
      holdPct: a.score.heldFee ? 100 : 0,
    };
  });

  return {
    attempts: attempts.length,
    lastScore,
    avgScore,
    feeHoldRate,
    concessionRate,
    strongDrillRate,
    weakestCriterionLabel,
    weakestCriterionId,
    criterionAverages,
    trendLabel,
    trend,
  };
}
