"use client";

import { useMemo, useState } from "react";
import type { PlaybookTalkTrack } from "@/lib/playbook";
import {
  CUE_MODE_STORAGE_KEY,
  parseCueMode,
  pickSpotlightIndex,
  type CueMode,
} from "@/lib/cue-reactivity";

type CoachStripProps = {
  track: PlaybookTalkTrack;
  /** Latest client (agent) transcript line for reactive spotlight */
  latestClientText: string | null;
  standardFeePct: number;
  feeFloorPct: number;
  connected: boolean;
};

const MODES: { id: CueMode; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "soft", label: "Soft" },
  { id: "full", label: "Full" },
];

function readStoredCueMode(): CueMode {
  if (typeof window === "undefined") return "soft";
  try {
    return parseCueMode(localStorage.getItem(CUE_MODE_STORAGE_KEY));
  } catch {
    return "soft";
  }
}

export function CoachStrip({
  track,
  latestClientText,
  standardFeePct,
  feeFloorPct,
  connected,
}: CoachStripProps) {
  const [mode, setMode] = useState<CueMode>(readStoredCueMode);

  const setModePersist = (next: CueMode) => {
    setMode(next);
    try {
      localStorage.setItem(CUE_MODE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const spotlight = useMemo(() => {
    if (!latestClientText) return 0;
    return pickSpotlightIndex(latestClientText, track.anchorPoints);
  }, [latestClientText, track.anchorPoints]);

  return (
    <section className="mt-5 rounded-xl border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Live coach · cue cards
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Fee {standardFeePct}% · floor {feeFloorPct}% · tips stay on
            your screen only
          </p>
        </div>
        <div
          className="inline-flex rounded-md border border-border bg-card p-0.5"
          role="group"
          aria-label="Cue mode"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModePersist(m.id)}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                mode === m.id
                  ? "bg-accent text-accent-fg"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "off" ? (
        <p className="mt-4 text-sm text-muted">
          Hints off — exam mode. You still get scored against the approved
          playbook after the drill.
          {!connected ? " Start the drill when ready." : null}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-foreground">
            <span className="font-medium text-accent">Approved play: </span>
            {track.approvedPlay}
          </p>

          <ul className="space-y-2">
            {track.anchorPoints.map((point, i) => {
              const active = i === spotlight;
              return (
                <li
                  key={`${i}-${point.slice(0, 24)}`}
                  className={`rounded-md border px-3 py-2 text-sm transition ${
                    active
                      ? "border-accent/50 bg-accent-soft text-foreground shadow-sm"
                      : "border-border/60 bg-card text-muted"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {active ? (
                      <span className="mt-0.5 shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-fg">
                        Now
                      </span>
                    ) : (
                      <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {i + 1}
                      </span>
                    )}
                    <span className={active ? "font-medium" : undefined}>
                      {point}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {track.neverDo.length > 0 ? (
            <div className="rounded-md border border-danger/25 bg-danger-soft/40 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-danger">
                Never do
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-danger">
                {track.neverDo.map((n) => (
                  <li key={n}>· {n}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {mode === "full" && track.exampleLine ? (
            <div className="rounded-md border border-border bg-card px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Example line (glance — don’t read robotically)
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                “{track.exampleLine}”
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
