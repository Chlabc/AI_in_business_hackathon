import { NextResponse } from "next/server";
import { jsonAuthError, requireRole } from "@/lib/auth";
import {
  listGuidance,
  saveGuidance,
  type GuidanceScope,
} from "@/lib/agency-guidance";
import { rubricForScenario } from "@/lib/rubric";
import type { RubricCriterionId } from "@/lib/rubric";

/** Managers read the log; the employee view never needs it. */
export async function GET() {
  try {
    await requireRole("manager");
    return NextResponse.json(await listGuidance());
  } catch (err) {
    return jsonAuthError(err) ?? NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("manager");

    let body: {
      attemptId?: string;
      criterionId?: string;
      aiScore?: number;
      managerScore?: number;
      reason?: string;
      scope?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const reason = (body.reason ?? "").trim();
    if (reason.length < 10) {
      // The whole point is that a correction explains itself. A score change
      // with no reason can't be applied to any other conversation.
      return NextResponse.json(
        { error: "Give a reason of at least 10 characters." },
        { status: 400 },
      );
    }

    const scope: GuidanceScope =
      body.scope === "agency_standard" ? "agency_standard" : "this_only";

    // Validate the criterion against the real rubric rather than trusting input.
    const known = new Set(
      [
        ...rubricForScenario("price-objection"),
        ...rubricForScenario("not-interested"),
      ].map((c) => c.id as string),
    );
    if (!body.criterionId || !known.has(body.criterionId)) {
      return NextResponse.json(
        { error: "Unknown rubric criterion." },
        { status: 400 },
      );
    }

    const clamp = (n: unknown) =>
      typeof n === "number" && Number.isFinite(n)
        ? Math.min(1, Math.max(0, n))
        : 0;

    const row = await saveGuidance({
      byName: user.name,
      attemptId: (body.attemptId ?? "").trim() || "unknown",
      criterionId: body.criterionId as RubricCriterionId,
      aiScore: clamp(body.aiScore),
      managerScore: clamp(body.managerScore),
      reason,
      scope,
    });

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return (
      jsonAuthError(err) ??
      NextResponse.json({ error: "Could not save" }, { status: 500 })
    );
  }
}
