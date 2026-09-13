import { NextResponse } from "next/server";
import { getScenario } from "@/data/scenarios";
import { DEMO_REP_ID } from "@/data/seed";
import { TEAM } from "@/data/team";
import { listAttempts, toCalibrateSummary } from "@/lib/attempts";
import { jsonAuthError, requireRole } from "@/lib/auth";
import {
  listPracticeSessionsForRep,
  practiceSessionsAvailable,
  tryUpsertPracticeSession,
} from "@/lib/practice-sessions";

function knownRepId(repId: string): boolean {
  return repId === DEMO_REP_ID || TEAM.some((t) => t.id === repId);
}

/**
 * Manager practice logs (timestamped). Prefers Supabase; backfills from file
 * store when cloud is empty so seeded/demo drills still appear.
 */
export async function GET(request: Request) {
  try {
    await requireRole("manager");
    const url = new URL(request.url);
    const repId = url.searchParams.get("repId") ?? DEMO_REP_ID;
    if (!knownRepId(repId)) {
      return NextResponse.json({ error: "Unknown rep" }, { status: 404 });
    }

    const fileSessions = async () => {
      const attempts = await listAttempts(repId);
      return attempts.slice(0, 30).map((a) => {
        const s = toCalibrateSummary(a);
        return {
          id: s.id,
          repId: s.repId,
          scenarioId: s.scenarioId,
          scenarioTitle: getScenario(s.scenarioId)?.title ?? s.scenarioId,
          createdAt: s.createdAt,
          overall: s.overall,
          cueMode: s.cueMode ?? null,
          calibrationCount: s.calibrationCount,
          source: "file" as const,
        };
      });
    };

    const available = practiceSessionsAvailable();
    if (!available) {
      return NextResponse.json({
        available: false,
        sessions: await fileSessions(),
        message:
          "Supabase is not configured — showing local drills. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run supabase/practice_sessions.sql so transcripts sync for calibration.",
      });
    }

    try {
      let sessions = await listPracticeSessionsForRep(repId);
      if (sessions.length === 0) {
        // One-time backfill from file/demo attempts so Team isn't empty.
        const attempts = await listAttempts(repId);
        for (const a of attempts.slice(0, 20)) {
          await tryUpsertPracticeSession(a);
        }
        sessions = await listPracticeSessionsForRep(repId);
      }

      return NextResponse.json({
        available: true,
        sessions: sessions.map((s) => ({
          ...s,
          scenarioTitle: getScenario(s.scenarioId)?.title ?? s.scenarioId,
          source: "supabase" as const,
        })),
      });
    } catch (cloudErr) {
      console.error("[practice/sessions] supabase list failed", cloudErr);
      return NextResponse.json({
        available: false,
        sessions: await fileSessions(),
        message:
          "Could not read Supabase practice_sessions (table missing?). Showing local drills. Run supabase/practice_sessions.sql in the SQL editor.",
      });
    }
  } catch (e) {
    return (
      jsonAuthError(e) ??
      NextResponse.json({ error: "Failed to list sessions" }, { status: 500 })
    );
  }
}
