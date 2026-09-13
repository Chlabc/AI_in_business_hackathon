import { NextResponse } from "next/server";
import { getScenario } from "@/data/scenarios";
import { getAttemptById } from "@/lib/attempts";
import { jsonAuthError, requireRole } from "@/lib/auth";
import {
  getPracticeSession,
  practiceSessionsAvailable,
  tryUpsertPracticeSession,
} from "@/lib/practice-sessions";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Manager session detail — includes transcript for calibration.
 */
export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireRole("manager");
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const fromFile = async () => {
      const attempt = await getAttemptById(id);
      if (!attempt) return null;
      return {
        session: {
          id: attempt.id,
          firmId: "northline",
          repId: attempt.repId,
          scenarioId: attempt.score.scenarioId,
          scenarioTitle:
            getScenario(attempt.score.scenarioId)?.title ??
            attempt.score.scenarioId,
          createdAt: attempt.createdAt,
          conversationId: attempt.conversationId,
          cueMode: attempt.cueMode ?? null,
          score: attempt.score,
          turns: attempt.turns,
          reflection: attempt.reflection ?? null,
          calibration: attempt.calibration ?? null,
        },
        source: "file" as const,
        message:
          "Showing local transcript. Run supabase/practice_sessions.sql so new drills sync to Supabase.",
      };
    };

    if (practiceSessionsAvailable()) {
      try {
        let session = await getPracticeSession(id);
        if (!session) {
          const attempt = await getAttemptById(id);
          if (attempt) {
            await tryUpsertPracticeSession(attempt);
            session = await getPracticeSession(id);
          }
        }
        if (session) {
          return NextResponse.json({
            session: {
              ...session,
              scenarioTitle:
                getScenario(session.scenarioId)?.title ?? session.scenarioId,
            },
            source: "supabase",
          });
        }
      } catch (cloudErr) {
        console.error("[practice/sessions/id] supabase failed", cloudErr);
        const fallback = await fromFile();
        if (fallback) return NextResponse.json(fallback);
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
    }

    const fallback = await fromFile();
    if (!fallback) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json(fallback);
  } catch (e) {
    return (
      jsonAuthError(e) ??
      NextResponse.json({ error: "Failed to load session" }, { status: 500 })
    );
  }
}
