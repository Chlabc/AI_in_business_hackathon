import { promises as fs } from "fs";
import path from "path";
import { dataStorePath } from "@/lib/file-store";
import type { RubricCriterionId } from "@/lib/rubric";

/**
 * A principal's correction to the coach's verdict.
 *
 * Changing a score on its own doesn't show a system that learns — it shows an
 * edit button. So a correction must carry a reason, and the principal must say
 * whether it applies only to that conversation or becomes the agency's
 * standard. Only the second kind is read back into later assessments.
 *
 * Deliberately stored in the file store rather than Supabase: the drill loop
 * has to work in a demo where Supabase isn't configured, and guidance is firm
 * knowledge like the playbook rather than per-user data.
 */
export type GuidanceScope = "this_only" | "agency_standard";

export type AgencyGuidance = {
  id: string;
  createdAt: string;
  /** Who made the call — shown on the applied notice so it isn't anonymous. */
  byName: string;
  /** The conversation that prompted the correction. */
  attemptId: string;
  criterionId: RubricCriterionId;
  /** What the coach scored it, 0–1. Kept so the disagreement stays visible. */
  aiScore: number;
  /** What the principal says it should be, 0–1. */
  managerScore: number;
  /** Required. A correction without a reason can't be applied to anything else. */
  reason: string;
  scope: GuidanceScope;
};

const STORE = dataStorePath("agency-guidance.json");

async function readAll(): Promise<AgencyGuidance[]> {
  try {
    const raw = await fs.readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as AgencyGuidance[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(rows: AgencyGuidance[]): Promise<void> {
  await fs.mkdir(path.dirname(STORE), { recursive: true });
  await fs.writeFile(STORE, JSON.stringify(rows, null, 2), "utf8");
}

export async function saveGuidance(
  input: Omit<AgencyGuidance, "id" | "createdAt">,
): Promise<AgencyGuidance> {
  const all = await readAll();
  const row: AgencyGuidance = {
    ...input,
    id: `guid_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  all.push(row);
  await writeAll(all);
  return row;
}

export async function listGuidance(): Promise<AgencyGuidance[]> {
  const all = await readAll();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * The agency's standing corrections, most recent per criterion.
 *
 * Only `agency_standard` rows qualify — a one-off correction is a judgement
 * about a single conversation and must not silently reshape later ones.
 */
export async function activeAgencyStandards(): Promise<AgencyGuidance[]> {
  const all = await listGuidance();
  const seen = new Set<string>();
  const out: AgencyGuidance[] = [];
  for (const g of all) {
    if (g.scope !== "agency_standard") continue;
    if (seen.has(g.criterionId)) continue;
    seen.add(g.criterionId);
    out.push(g);
  }
  return out;
}
