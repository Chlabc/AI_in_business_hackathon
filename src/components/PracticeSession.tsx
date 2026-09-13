"use client";

import { useMemo } from "react";
import { AudioWaveform } from "@/components/AudioWaveform";
import { CoachStrip } from "@/components/CoachStrip";
import { FeedbackCard } from "@/components/FeedbackCard";
import { SignalStreamGuard } from "@/components/SignalStreamGuard";
import type { PracticeScenario } from "@/data/scenarios";
import { usePracticeConversation } from "@/hooks/usePracticeConversation";
import type { PlaybookTalkTrack } from "@/lib/playbook";

type PracticeSessionProps = {
  scenario: PracticeScenario;
  track: PlaybookTalkTrack;
  standardFeePct: number;
  feeFloorPct: number;
  diagnosisHeadline: string;
};

function formatTurnTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function PracticeSession({
  scenario,
  track,
  standardFeePct,
  feeFloorPct,
  diagnosisHeadline,
}: PracticeSessionProps) {
  const {
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
    start,
    end,
    practiceAgain,
    getInputLevels,
    getOutputLevels,
    userLines,
    latestClientText,
  } = usePracticeConversation(scenario);

  const connected = status === "connected";
  const connecting = status === "connecting";

  const waveMode = useMemo(() => {
    if (connecting) return "connecting" as const;
    if (connected && isSpeaking) return "speaking" as const;
    if (connected) return "listening" as const;
    return "idle" as const;
  }, [connected, connecting, isSpeaking]);

  return (
    <div className="space-y-6">
      <SignalStreamGuard />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="surface-card rounded-xl p-5 sm:p-6 lg:p-8">
          <p className="eyebrow">{scenario.title}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {scenario.customerPersona}
          </h2>
          {diagnosisHeadline ? (
            <p className="mt-3 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-foreground">
              <span className="font-semibold text-accent">Focus: </span>
              {diagnosisHeadline}
            </p>
          ) : null}

          <div className="mt-5 rounded-lg border border-border bg-background px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Client opens with
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
              “{scenario.openingLine}”
            </p>
          </div>

          <CoachStrip
            track={track}
            latestClientText={latestClientText}
            standardFeePct={standardFeePct}
            feeFloorPct={feeFloorPct}
            connected={connected}
          />

          <div className="mt-5">
            <AudioWaveform
              active={connected || connecting}
              mode={waveMode}
              getInputLevels={getInputLevels}
              getOutputLevels={getOutputLevels}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!connected ? (
              <button
                type="button"
                onClick={() => void start()}
                disabled={connecting || scoring}
                className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connecting ? "Connecting…" : "Start drill"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void end()}
                disabled={scoring}
                className="inline-flex h-11 items-center justify-center rounded-md border border-danger/40 bg-danger-soft px-5 text-sm font-semibold text-danger transition hover:opacity-90 disabled:opacity-60"
              >
                End &amp; score
              </button>
            )}
            <span className="rounded border border-border px-2.5 py-1 text-xs capitalize text-muted">
              {scoring ? "scoring" : waveMode}
            </span>
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mt-4 rounded-md border border-border bg-background px-4 py-3 text-sm text-muted">
              {notice}
            </div>
          ) : null}

          {lastDisconnect ? (
            <div className="mt-3 rounded-md border border-border bg-background px-4 py-2 text-xs text-muted">
              Last disconnect:{" "}
              <span className="font-mono">{lastDisconnect}</span>
            </div>
          ) : null}

          <p className="mt-3 font-mono text-[10px] text-muted/70">
            build{" "}
            {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
              "local"}
          </p>
        </section>

        <section className="surface-card flex h-full min-h-[320px] flex-col rounded-xl p-5 sm:p-6">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Transcript
            </h3>
            <span className="text-xs text-muted">{turns.length} turns</span>
          </div>
          {/* min-h-0 lets flex-1 fill the card; no max-height so scroll uses the full box */}
          <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {turns.length === 0 ? (
              <p className="text-sm text-muted">
                Start the drill to capture spoken turns.
              </p>
            ) : (
              turns.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    t.role === "user"
                      ? "border-border bg-background text-foreground"
                      : t.role === "agent"
                        ? "border-accent/20 bg-accent-soft text-foreground"
                        : "border-border bg-card text-muted"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    <span>
                      {t.role === "user"
                        ? "You"
                        : t.role === "agent"
                          ? "Client"
                          : "System"}
                    </span>
                    <time
                      dateTime={t.at}
                      className="font-mono font-normal normal-case tracking-normal opacity-80"
                    >
                      {formatTurnTime(t.at)}
                    </time>
                  </div>
                  {t.text}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {score ? (
        <div className="space-y-4">
          <FeedbackCard
            key={attemptId ?? `score-${score.overall}-${score.scenarioId}`}
            score={score}
            whatYouSaid={userLines}
            attemptId={attemptId}
            attemptPersisted={attemptPersisted}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void practiceAgain()}
              disabled={connecting || scoring || connected}
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Practice again
            </button>
            <a
              href="/coach/value"
              className="text-sm font-medium text-muted hover:text-accent"
            >
              View progress →
            </a>
            <a
              href="/coach/practice"
              className="text-sm font-medium text-muted hover:text-accent"
            >
              Other scenarios →
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
