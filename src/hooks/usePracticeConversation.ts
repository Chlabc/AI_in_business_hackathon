"use client";

import { Conversation } from "@elevenlabs/client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PracticeScenario } from "@/data/scenarios";
import { CUE_MODE_STORAGE_KEY, parseCueMode } from "@/lib/cue-reactivity";
import {
  explainElevenLabsError,
  formatUnknownError,
  isBenignElevenLabsError,
} from "@/lib/elevenlabs-errors";
import type { PracticeScore } from "@/lib/rubric";
import type { FirmPlaybook } from "@/lib/playbook";
import {
  buildSessionOverrides,
  formatDisconnectDetails,
} from "@/lib/scenario-session";

async function fetchPlaybook(): Promise<FirmPlaybook | undefined> {
  try {
    const res = await fetch("/api/playbook");
    if (!res.ok) return undefined;
    return (await res.json()) as FirmPlaybook;
  } catch {
    return undefined;
  }
}

export type TranscriptTurn = {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  at: string;
};

export type SessionStatus = "idle" | "connecting" | "connected" | "error";

type ConversationInstance = Awaited<
  ReturnType<typeof Conversation.startSession>
>;

async function fetchConversationToken(): Promise<string> {
  const res = await fetch("/api/elevenlabs/conversation-token");
  const data = (await res.json()) as {
    token?: string;
    error?: string;
    detail?: string;
  };
  if (!res.ok || !data.token) {
    throw new Error(
      data.error
        ? `${data.error}${data.detail ? ` - ${data.detail}` : ""}`
        : "Could not get conversation token",
    );
  }
  return data.token;
}

async function probeMicrophone(): Promise<void> {
  const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
  probe.getTracks().forEach((t) => t.stop());
}

/**
 * Owns the ElevenLabs voice session for one scenario mount.
 * Parent should remount with key={scenario.id} when the scenario changes.
 */
/** CoachStrip owns the cue mode and persists it here; read it back at submit. */
function readCueMode() {
  try {
    return parseCueMode(localStorage.getItem(CUE_MODE_STORAGE_KEY));
  } catch {
    return "soft" as const;
  }
}

export function usePracticeConversation(scenario: PracticeScenario) {
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [score, setScore] = useState<PracticeScore | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptPersisted, setAttemptPersisted] = useState(false);
  const [lastDisconnect, setLastDisconnect] = useState<string | null>(null);

  const conversationRef = useRef<ConversationInstance | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const endingRef = useRef(false);
  const scenarioRef = useRef(scenario);
  scenarioRef.current = scenario;

  const pushTurn = useCallback((role: TranscriptTurn["role"], text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setTurns((prev) => {
      const next = [
        ...prev,
        {
          id: `${Date.now()}-${prev.length}`,
          role,
          text: cleaned,
          at: new Date().toISOString(),
        },
      ];
      turnsRef.current = next;
      return next;
    });
  }, []);

  const resetLocal = useCallback(() => {
    setError(null);
    setNotice(null);
    setLastDisconnect(null);
    setScore(null);
    setAttemptId(null);
    setAttemptPersisted(false);
    setTurns([]);
    turnsRef.current = [];
    setConversationId(null);
    conversationIdRef.current = null;
    setIsSpeaking(false);
  }, []);

  const endSessionQuietly = useCallback(async () => {
    endingRef.current = true;
    const conv = conversationRef.current;
    conversationRef.current = null;
    if (conv) {
      try {
        await conv.endSession();
      } catch {
        /* teardown noise */
      }
    }
    setStatus("idle");
    setIsSpeaking(false);
  }, []);

  // Unmount / remount only, parent keys by scenario.id
  useEffect(() => {
    endingRef.current = false;
    return () => {
      void endSessionQuietly();
    };
  }, [endSessionQuietly]);

  const mergeTurnSnapshots = useCallback(
    (...lists: TranscriptTurn[][]) => {
      const byKey = new Map<string, TranscriptTurn>();
      for (const list of lists) {
        for (const t of list) {
          const key = `${t.role}:${t.text}`;
          if (!byKey.has(key)) byKey.set(key, t);
        }
      }
      return Array.from(byKey.values()).sort((a, b) =>
        a.at.localeCompare(b.at),
      );
    },
    [],
  );

  const waitForUserTurns = useCallback(
    async (seed: TranscriptTurn[], maxMs = 2500) => {
      const started = Date.now();
      while (Date.now() - started < maxMs) {
        const merged = mergeTurnSnapshots(seed, turnsRef.current);
        if (merged.some((t) => t.role === "user")) return merged;
        await new Promise((r) => setTimeout(r, 150));
      }
      return mergeTurnSnapshots(seed, turnsRef.current);
    },
    [mergeTurnSnapshots],
  );

  const runScore = useCallback(
    async (cid: string | null, seedTurns: TranscriptTurn[]) => {
      setScoring(true);
      setError(null);
      setNotice("Finishing transcript…");

      // Seed = turns already on screen when End was clicked.
      // Also wait briefly for any late ASR that arrives after endSession.
      const merged = await waitForUserTurns(seedTurns, 2500);
      const snapshot = merged.filter((t) => t.role !== "system");

      if (!snapshot.some((t) => t.role === "user")) {
        setScoring(false);
        setScore(null);
        setAttemptId(null);
        setAttemptPersisted(false);
        setNotice(
          "Session ended before we caught your reply, speak, pause a beat, then End & score.",
        );
        return;
      }

      // Keep UI in sync with whatever we scored
      turnsRef.current = merged;
      setTurns(merged);
      setNotice("Scoring your drill…");
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 35_000);
      try {
        const res = await fetch("/api/practice/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: cid,
            scenarioId: scenarioRef.current.id,
            turns: snapshot.map(({ role, text }) => ({ role, text })),
            // Read at submit time, so it reflects the mode actually used for
            // the drill rather than whatever it was set to when the page loaded.
            cueMode: readCueMode(),
          }),
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          score?: PracticeScore;
          attempt?: { id?: string };
          persisted?: boolean;
          error?: string;
        };
        if (!res.ok || !data.score) {
          throw new Error(data.error ?? "Scoring failed");
        }
        setScore(data.score);
        setAttemptId(data.attempt?.id ?? null);
        setAttemptPersisted(data.persisted !== false && Boolean(data.attempt?.id));
        setNotice(null);
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        const raw = e instanceof Error ? e.message : "Scoring failed";
        const timedOut = name === "AbortError" || /abort|networkerror|failed to fetch/i.test(raw);
        setError(
          timedOut
            ? "Scoring took too long or the connection dropped. Try End & score again — if it keeps failing, the rule-based scorer should still respond."
            : raw,
        );
        setNotice(null);
      } finally {
        clearTimeout(abortTimer);
        setScoring(false);
      }
    },
    [waitForUserTurns],
  );

  const startingRef = useRef(false);

  const start = useCallback(async () => {
    if (conversationRef.current || startingRef.current) return;

    resetLocal();
    endingRef.current = false;
    startingRef.current = true;
    setStatus("connecting");

    try {
      await probeMicrophone();
    } catch {
      setError(
        "Microphone permission is required for the spoken drill. Allow mic access and try again.",
      );
      startingRef.current = false;
      setStatus("idle");
      return;
    }

    try {
      const sc = scenarioRef.current;
      const [token, playbook] = await Promise.all([
        fetchConversationToken(),
        fetchPlaybook(),
      ]);

      const conv = await Conversation.startSession({
        conversationToken: token,
        userId: "rep_demo_alex",
        overrides: buildSessionOverrides(sc, playbook),
        onConnect: () => {
          if (endingRef.current) return;
          startingRef.current = false;
          setStatus("connected");
          pushTurn(
            "system",
            `Connected · ${sc.title}, speak as the real estate agent.`,
          );
        },
        onDisconnect: (details) => {
          conversationRef.current = null;
          startingRef.current = false;
          setIsSpeaking(false);
          setStatus("idle");
          const reason = formatDisconnectDetails(details);
          setLastDisconnect(reason);
          pushTurn("system", `Session ended (${reason}).`);
        },
        onError: (message, context) => {
          if (endingRef.current || isBenignElevenLabsError(message, context)) {
            return;
          }
          const raw =
            typeof message === "string" && message.trim()
              ? message
              : formatUnknownError(context) || "Voice session error";
          if (!raw) return;
          const text = explainElevenLabsError(raw);
          setError(text);
          pushTurn("system", `Error: ${text}`);
          setStatus("error");
        },
        onModeChange: ({ mode }) => {
          setIsSpeaking(mode === "speaking");
        },
        onMessage: (message) => {
          const roleRaw =
            (message as { role?: string; source?: string }).role ??
            (message as { source?: string }).source ??
            "";
          const text =
            (message as { message?: string }).message ??
            (message as { text?: string }).text ??
            "";
          if (!text) return;
          // SDK uses role: user|agent and deprecated source: user|ai
          const role: TranscriptTurn["role"] =
            roleRaw === "user" || roleRaw === "human"
              ? "user"
              : roleRaw === "agent" || roleRaw === "ai"
                ? "agent"
                : "agent";
          pushTurn(role, text);
        },
        onAgentToolResponse: (tool) => {
          const name =
            (tool as { tool_name?: string; toolName?: string }).tool_name ??
            (tool as { toolName?: string }).toolName ??
            "tool";
          pushTurn("system", `Agent tool: ${name}`);
        },
      });

      if (endingRef.current) {
        startingRef.current = false;
        await conv.endSession().catch(() => {});
        return;
      }

      conversationRef.current = conv;
      try {
        const id = conv.getId?.() ?? null;
        conversationIdRef.current = id;
        setConversationId(id);
      } catch {
        /* id may not be ready */
      }
    } catch (e) {
      conversationRef.current = null;
      startingRef.current = false;
      const raw =
        e instanceof Error
          ? e.message
          : formatUnknownError(e) || "Failed to start session";
      const message = explainElevenLabsError(raw);
      if (!isBenignElevenLabsError(message, e)) setError(message);
      setStatus("idle");
    }
  }, [pushTurn, resetLocal]);

  const end = useCallback(async () => {
    const cid = conversationIdRef.current ?? conversationId;
    // Capture whatever is already on screen NOW, before teardown races.
    const seedTurns = turnsRef.current.slice();
    endingRef.current = true;
    setScoring(true);
    setError(null);
    setNotice("Ending session…");
    const conv = conversationRef.current;
    conversationRef.current = null;
    try {
      await conv?.endSession();
    } catch (e) {
      const message = formatUnknownError(e);
      if (message && !isBenignElevenLabsError(message, e)) setError(message);
    } finally {
      setStatus("idle");
      setIsSpeaking(false);
      void runScore(cid, seedTurns);
    }
  }, [conversationId, runScore]);

  const practiceAgain = useCallback(async () => {
    await endSessionQuietly();
    endingRef.current = false;
    startingRef.current = false;
    resetLocal();
    await start();
  }, [endSessionQuietly, resetLocal, start]);

  const getInputLevels = useCallback(
    () => conversationRef.current?.getInputByteFrequencyData?.(),
    [],
  );
  const getOutputLevels = useCallback(
    () => conversationRef.current?.getOutputByteFrequencyData?.(),
    [],
  );

  const latestClientText =
    [...turns].reverse().find((t) => t.role === "agent")?.text ?? null;

  return {
    turns,
    error,
    notice,
    status,
    isSpeaking,
    scoring,
    score,
    attemptId,
    attemptPersisted,
    lastDisconnect,
    conversationId,
    start,
    end,
    practiceAgain,
    getInputLevels,
    getOutputLevels,
    userLines: turns.filter((t) => t.role === "user").map((t) => t.text),
    latestClientText,
  };
}
