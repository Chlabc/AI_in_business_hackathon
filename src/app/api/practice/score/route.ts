import { NextResponse } from "next/server";
import {
  jsonAuthError,
  repIdForViewer,
  requireRole,
} from "@/lib/auth";
import { saveAttempt, type PracticeAttempt } from "@/lib/attempts";
import { parseCueMode } from "@/lib/cue-reactivity";
import { tryUpsertPracticeSession } from "@/lib/practice-sessions";
import { scoreTranscript, type TranscriptTurn } from "@/lib/score";

/** Live AI scoring often needs 15–25s; Hobby default is too short. */
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireRole("employee");

    let body: {
      repId?: string;
      conversationId?: string | null;
      scenarioId?: string;
      turns?: TranscriptTurn[];
      cueMode?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const turns = (body.turns ?? []).filter(
      (t) => t && typeof t.text === "string" && t.role,
    ) as TranscriptTurn[];

    const userTurns = turns.filter((t) => t.role === "user");
    if (userTurns.length === 0) {
      return NextResponse.json(
        { error: "Need at least one user turn to score" },
        { status: 400 },
      );
    }

    const repId = repIdForViewer(user);
    const { score, meta } = await scoreTranscript(
      turns,
      body.scenarioId ?? "price-objection",
    );
    console.info("[practice/score]", {
      method: score.method,
      ...meta,
    });

    let attempt: PracticeAttempt;
    let persisted = true;
    try {
      attempt = await saveAttempt({
        repId,
        conversationId: body.conversationId ?? null,
        turns,
        score,
        // Validated rather than trusted, this comes from the client.
        cueMode: parseCueMode(body.cueMode),
      });
    } catch (err) {
      // Vercel serverless FS is often read-only, never block the score card.
      console.error(
        "[practice/score] saveAttempt failed; returning score only",
        err,
      );
      persisted = false;
      attempt = {
        id: `ephemeral_${Date.now()}`,
        createdAt: new Date().toISOString(),
        repId,
        conversationId: body.conversationId ?? null,
        turns,
        score,
        cueMode: parseCueMode(body.cueMode),
      };
    }

    // Durable manager log — never let a stuck Supabase call hang the browser.
    const cloud = await Promise.race([
      tryUpsertPracticeSession(attempt),
      new Promise<{ ok: false; error: string }>((resolve) =>
        setTimeout(
          () => resolve({ ok: false, error: "supabase upsert timed out" }),
          4_000,
        ),
      ),
    ]);

    return NextResponse.json({
      attempt,
      score,
      persisted,
      sessionLogged: cloud.ok,
      scoringMeta: meta,
    });
  } catch (e) {
    return jsonAuthError(e) ?? NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
