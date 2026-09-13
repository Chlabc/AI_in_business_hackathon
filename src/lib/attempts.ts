import { promises as fs } from "fs";
import path from "path";
import { buildAlexDemoAttempts } from "@/data/demo-attempts";
import { DEMO_REP_ID } from "@/data/seed";
import { dataStorePath } from "@/lib/file-store";
import type { PracticeScore } from "@/lib/rubric";
import type { TranscriptTurn } from "@/lib/score";

/** Rep-owned debrief after a scored drill — never sent to manager PDF. */
export type AttemptReflection = {
  whatWentWrong: string;
  nextTime: string;
  savedAt: string;
};

export type PracticeAttempt = {
  id: string;
  repId: string;
  createdAt: string;
  conversationId: string | null;
  turns: TranscriptTurn[];
  score: PracticeScore;
  reflection?: AttemptReflection;
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
  if (hasDemoArc) return all;
  const seeded = buildAlexDemoAttempts();
  const withoutAlex = all.filter((a) => a.repId !== DEMO_REP_ID);
  const next = [...withoutAlex, ...seeded];
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
      feeHoldRate: null as number | null,
      trendLabel: "No practice attempts yet — start a drill to track KPIs",
    };
  }
  const lastScore = attempts[0].score.overall;
  const holds = attempts.filter((a) => a.score.heldFee).length;
  const feeHoldRate = Math.round((holds / attempts.length) * 1000) / 10;
  const chronological = [...attempts].reverse();
  let trendLabel = "Keep drilling the fee objection.";
  if (chronological.length >= 2) {
    const first = chronological[0].score.overall;
    const latest = chronological[chronological.length - 1].score.overall;
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
  return {
    attempts: attempts.length,
    lastScore,
    feeHoldRate,
    trendLabel,
  };
}
