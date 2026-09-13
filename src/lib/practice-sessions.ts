import type { PracticeAttempt } from "@/lib/attempts";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase-admin";
import type { PracticeScore } from "@/lib/rubric";
import type { TranscriptTurn } from "@/lib/score";

export type PracticeSession = {
  id: string;
  firmId: string;
  repId: string;
  scenarioId: string;
  createdAt: string;
  conversationId: string | null;
  cueMode: string | null;
  score: PracticeScore;
  turns: TranscriptTurn[];
  reflection: PracticeAttempt["reflection"] | null;
  calibration: PracticeAttempt["calibration"] | null;
};

export type PracticeSessionSummary = {
  id: string;
  repId: string;
  scenarioId: string;
  createdAt: string;
  overall: number;
  cueMode: string | null;
  calibrationCount: number;
};

type Row = {
  id: string;
  firm_id: string;
  rep_id: string;
  scenario_id: string;
  created_at: string;
  conversation_id: string | null;
  cue_mode: string | null;
  score: PracticeScore;
  turns: TranscriptTurn[];
  reflection: PracticeAttempt["reflection"] | null;
  calibration: PracticeAttempt["calibration"] | null;
};

const MAX_TURN_CHARS = 4000;

function truncateTurns(turns: TranscriptTurn[]): TranscriptTurn[] {
  return turns.map((t) => ({
    role: t.role,
    text:
      t.text.length > MAX_TURN_CHARS
        ? `${t.text.slice(0, MAX_TURN_CHARS)}…`
        : t.text,
  }));
}

function mapRow(row: Row): PracticeSession {
  return {
    id: row.id,
    firmId: row.firm_id,
    repId: row.rep_id,
    scenarioId: row.scenario_id,
    createdAt: row.created_at,
    conversationId: row.conversation_id,
    cueMode: row.cue_mode,
    score: row.score,
    turns: Array.isArray(row.turns) ? row.turns : [],
    reflection: row.reflection ?? null,
    calibration: row.calibration ?? null,
  };
}

export function practiceSessionsAvailable(): boolean {
  return supabaseConfigured();
}

export async function upsertPracticeSession(
  attempt: PracticeAttempt,
  firmId = "northline",
): Promise<PracticeSession> {
  const sb = getSupabaseAdmin();
  const payload = {
    id: attempt.id,
    firm_id: firmId,
    rep_id: attempt.repId,
    scenario_id: attempt.score.scenarioId,
    created_at: attempt.createdAt,
    conversation_id: attempt.conversationId,
    cue_mode: attempt.cueMode ?? null,
    score: attempt.score,
    turns: truncateTurns(attempt.turns),
    reflection: attempt.reflection ?? null,
    calibration: attempt.calibration ?? null,
  };
  const { data, error } = await sb
    .from("practice_sessions")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Row);
}

export async function listPracticeSessionsForRep(
  repId: string,
  limit = 30,
): Promise<PracticeSessionSummary[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("practice_sessions")
    .select("id, rep_id, scenario_id, created_at, score, cue_mode, calibration")
    .eq("rep_id", repId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data as Partial<Row>[]) ?? []).map((row) => ({
    id: row.id!,
    repId: row.rep_id!,
    scenarioId: row.scenario_id!,
    createdAt: row.created_at!,
    overall: (row.score as PracticeScore)?.overall ?? 0,
    cueMode: row.cue_mode ?? null,
    calibrationCount: Array.isArray(
      (row.calibration as PracticeAttempt["calibration"])?.overrides,
    )
      ? (row.calibration as PracticeAttempt["calibration"])!.overrides.length
      : 0,
  }));
}

/**
 * Full-ish rows for Progress / KPIs — one query, no N+1 getPracticeSession.
 * Turns omitted (empty) unless you need transcripts (use getPracticeSession).
 */
export async function listPracticeAttemptsForRep(
  repId: string,
  limit = 50,
): Promise<PracticeAttempt[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("practice_sessions")
    .select(
      "id, rep_id, scenario_id, created_at, conversation_id, cue_mode, score, turns, reflection, calibration",
    )
    .eq("rep_id", repId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    repId: row.rep_id,
    conversationId: row.conversation_id,
    turns: Array.isArray(row.turns) ? row.turns : [],
    score: row.score,
    cueMode: (row.cue_mode as PracticeAttempt["cueMode"]) ?? undefined,
    reflection: row.reflection ?? undefined,
    calibration: row.calibration ?? undefined,
  }));
}

export async function getPracticeSession(
  id: string,
): Promise<PracticeSession | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("practice_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as Row) : null;
}

export async function updatePracticeSessionCalibration(
  id: string,
  input: {
    score: PracticeScore;
    calibration: PracticeAttempt["calibration"];
  },
): Promise<PracticeSession | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("practice_sessions")
    .update({
      score: input.score,
      calibration: input.calibration ?? null,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as Row) : null;
}

/** Best-effort dual-write — never throw into the score response path. */
export async function tryUpsertPracticeSession(
  attempt: PracticeAttempt,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!practiceSessionsAvailable()) {
    return { ok: false, error: "Supabase not configured" };
  }
  try {
    await upsertPracticeSession(attempt);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upsert failed";
    console.error("[practice-sessions] upsert failed", msg);
    return { ok: false, error: msg };
  }
}
