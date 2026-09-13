import { NextResponse } from "next/server";
import { getScenario } from "@/data/scenarios";
import { DEMO_REP_ID } from "@/data/seed";
import { TEAM } from "@/data/team";
import {
  getAttemptById,
  listAttempts,
  toCalibrateSummary,
  updateAttemptCalibration,
} from "@/lib/attempts";
import { jsonAuthError, requireRole } from "@/lib/auth";
import type { RubricCriterionId } from "@/lib/rubric";
import {
  practiceSessionsAvailable,
  updatePracticeSessionCalibration,
} from "@/lib/practice-sessions";
import { upsertAgencyStandard } from "@/lib/scoring-standards";

function knownRepId(repId: string): boolean {
  return repId === DEMO_REP_ID || TEAM.some((t) => t.id === repId);
}

export async function GET(request: Request) {
  try {
    await requireRole("manager");
    const url = new URL(request.url);
    const repId = url.searchParams.get("repId") ?? DEMO_REP_ID;
    if (!knownRepId(repId)) {
      return NextResponse.json({ error: "Unknown rep" }, { status: 404 });
    }
    const attempts = await listAttempts(repId);
    const items = attempts.slice(0, 20).map((a) => {
      const summary = toCalibrateSummary(a);
      const scenario = getScenario(summary.scenarioId);
      return {
        ...summary,
        scenarioTitle: scenario?.title ?? summary.scenarioId,
      };
    });
    return NextResponse.json({ attempts: items });
  } catch (e) {
    return (
      jsonAuthError(e) ??
      NextResponse.json({ error: "Failed to list attempts" }, { status: 500 })
    );
  }
}

type TargetLabel = "full" | "half" | "none";

function targetToScore(t: TargetLabel): 0 | 0.5 | 1 {
  if (t === "full") return 1;
  if (t === "half") return 0.5;
  return 0;
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("manager");
    let body: {
      attemptId?: string;
      criterionId?: string;
      target?: string;
      reason?: string;
      scope?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const attemptId = typeof body.attemptId === "string" ? body.attemptId : "";
    const criterionId = body.criterionId as RubricCriterionId | undefined;
    const targetRaw = (body.target ?? "").toLowerCase() as TargetLabel;
    const scopeRaw = (body.scope ?? "").toLowerCase();
    const reason = typeof body.reason === "string" ? body.reason : "";

    if (!attemptId || !criterionId) {
      return NextResponse.json(
        { error: "attemptId and criterionId are required" },
        { status: 400 },
      );
    }
    if (targetRaw !== "full" && targetRaw !== "half" && targetRaw !== "none") {
      return NextResponse.json(
        { error: "target must be full, half, or none" },
        { status: 400 },
      );
    }
    if (scopeRaw !== "attempt" && scopeRaw !== "agency") {
      return NextResponse.json(
        { error: "scope must be attempt or agency" },
        { status: 400 },
      );
    }
    if (!reason.trim()) {
      return NextResponse.json(
        { error: "Why? is required — a score change needs an explanation." },
        { status: 400 },
      );
    }

    const existing = await getAttemptById(attemptId);
    if (!existing) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const overriddenScore = targetToScore(targetRaw);
    const updated = await updateAttemptCalibration(attemptId, {
      criterionId,
      overriddenScore,
      reason,
      scope: scopeRaw,
      byEmail: user.email,
      byName: user.name,
    });
    if (!updated) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    let standard = null;
    if (scopeRaw === "agency") {
      standard = await upsertAgencyStandard({
        scenarioId: updated.score.scenarioId,
        criterionId,
        targetScore: overriddenScore,
        reason,
        setByEmail: user.email,
        setByName: user.name,
        sourceAttemptId: attemptId,
      });
    }

    if (practiceSessionsAvailable()) {
      try {
        await updatePracticeSessionCalibration(attemptId, {
          score: updated.score,
          calibration: updated.calibration,
        });
      } catch (err) {
        console.error("[calibrate] supabase sync failed", err);
      }
    }

    return NextResponse.json({
      attempt: toCalibrateSummary(updated),
      standard,
    });
  } catch (e) {
    return (
      jsonAuthError(e) ??
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Calibration failed" },
        { status: 400 },
      )
    );
  }
}
