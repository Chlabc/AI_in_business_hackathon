import { promises as fs } from "fs";
import path from "path";
import { dataStorePath } from "@/lib/file-store";
import {
  overallFromCriteria,
  type AgencyStandardApplied,
  type PracticeScore,
  type RubricCriterionId,
} from "@/lib/rubric";

type TurnLike = { role: string; text: string };

export type AgencyScoringStandard = {
  id: string;
  firmId: string;
  scenarioId: string;
  criterionId: RubricCriterionId;
  targetScore: 0 | 0.5 | 1;
  reason: string;
  setByEmail: string;
  setByName: string;
  sourceAttemptId: string;
  createdAt: string;
  active: boolean;
};

const STORE = dataStorePath("scoring-standards.json");

function standardsDisabled(): boolean {
  return (
    process.env.CORNERMAN_DISABLE_STANDARDS === "1" ||
    process.env.CORNERMAN_EVAL === "1"
  );
}

async function readAll(): Promise<AgencyScoringStandard[]> {
  if (standardsDisabled()) return [];
  try {
    const raw = await fs.readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as AgencyScoringStandard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(rows: AgencyScoringStandard[]): Promise<void> {
  await fs.mkdir(path.dirname(STORE), { recursive: true });
  await fs.writeFile(STORE, JSON.stringify(rows, null, 2), "utf8");
}

export async function listActiveStandards(
  firmId = "northline",
): Promise<AgencyScoringStandard[]> {
  const all = await readAll();
  return all.filter((r) => r.active && r.firmId === firmId);
}

export async function listActiveStandardsForScenario(
  scenarioId: string,
  firmId = "northline",
): Promise<AgencyScoringStandard[]> {
  const all = await listActiveStandards(firmId);
  return all.filter((r) => r.scenarioId === scenarioId);
}

/**
 * Upsert one active standard per (firm, scenario, criterion).
 * Deactivates any prior active row for that key.
 */
export async function upsertAgencyStandard(input: {
  firmId?: string;
  scenarioId: string;
  criterionId: RubricCriterionId;
  targetScore: 0 | 0.5 | 1;
  reason: string;
  setByEmail: string;
  setByName: string;
  sourceAttemptId: string;
}): Promise<AgencyScoringStandard> {
  const reason = input.reason.trim();
  if (!reason) throw new Error("Reason is required.");
  if (reason.length > 500) throw new Error("Reason is too long (max 500).");

  const firmId = input.firmId ?? "northline";
  const all = await readAll();
  const next = all.map((r) =>
    r.active &&
    r.firmId === firmId &&
    r.scenarioId === input.scenarioId &&
    r.criterionId === input.criterionId
      ? { ...r, active: false }
      : r,
  );

  const row: AgencyScoringStandard = {
    id: `std_${Date.now()}`,
    firmId,
    scenarioId: input.scenarioId,
    criterionId: input.criterionId,
    targetScore: input.targetScore,
    reason,
    setByEmail: input.setByEmail,
    setByName: input.setByName,
    sourceAttemptId: input.sourceAttemptId,
    createdAt: new Date().toISOString(),
    active: true,
  };
  next.push(row);
  await writeAll(next);
  return row;
}

function userText(turns: TurnLike[]): string {
  return turns
    .filter((t) => t.role === "user")
    .map((t) => t.text)
    .join("\n")
    .toLowerCase();
}

/**
 * Criterion is "in play" if heuristic already credited it, or a light
 * scenario signal fires — avoids free full marks on every drill.
 */
export function criterionInPlay(
  criterionId: RubricCriterionId,
  heuristicScore: number,
  turns: TurnLike[],
): boolean {
  if (heuristicScore > 0) return true;
  const text = userText(turns);
  if (!text.trim()) return false;

  switch (criterionId) {
    case "agreed_next_step":
      return /follow[- ]?up|permission|check[- ]?in|later|reconnect|touch base|keep in touch/.test(
        text,
      );
    case "respected_refusal":
      return /understand|no problem|respect|when you('re| are) ready|won'?t push/.test(
        text,
      );
    case "explored_objection":
      return /what .+ mean|compared to|against what|tell me more|what matters/.test(
        text,
      );
    case "held_fee":
      return /can('t| not) go below|floor|standard|hold|list/.test(text);
    default:
      return false;
  }
}

/**
 * Apply active agency standards onto a freshly computed score.
 */
export async function applyAgencyStandards(
  score: PracticeScore,
  turns: TurnLike[],
): Promise<PracticeScore> {
  if (standardsDisabled()) return score;
  const standards = await listActiveStandardsForScenario(score.scenarioId);
  if (standards.length === 0) return score;

  const applied: AgencyStandardApplied[] = [];
  const criteria = score.criteria.map((c) => {
    const std = standards.find((s) => s.criterionId === c.id);
    if (!std) return c;
    if (!criterionInPlay(c.id, c.score, turns)) return c;
    applied.push({
      criterionId: c.id,
      label: c.label,
      reason: std.reason,
      setByName: std.setByName,
    });
    return {
      ...c,
      score: std.targetScore,
      notes: `Agency standard (${std.setByName}): ${std.reason}`,
    };
  });

  if (applied.length === 0) return score;

  return {
    ...score,
    criteria,
    overall: overallFromCriteria(criteria),
    agencyStandardsApplied: applied,
  };
}
