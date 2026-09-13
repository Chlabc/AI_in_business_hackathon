"use client";

import { useCallback, useEffect, useState } from "react";
import { InfoTip } from "@/components/InfoTip";
import type { CriterionScore, PracticeScore, RubricCriterionId } from "@/lib/rubric";

type LogItem = {
  id: string;
  repId: string;
  scenarioId: string;
  scenarioTitle: string;
  createdAt: string;
  overall: number;
  cueMode: string | null;
  calibrationCount: number;
  source?: string;
};

type SessionDetail = {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  createdAt: string;
  cueMode: string | null;
  score: PracticeScore;
  turns: { role: string; text: string }[];
  calibration: { overrides: unknown[] } | null;
};

type PracticeLogsSectionProps = {
  agents: { id: string; name: string }[];
  initialRepId: string;
};

export function PracticeLogsSection({
  agents,
  initialRepId,
}: PracticeLogsSectionProps) {
  const [repId, setRepId] = useState(initialRepId);
  const repName =
    agents.find((a) => a.id === repId)?.name ?? agents[0]?.name ?? "Agent";
  const [items, setItems] = useState<LogItem[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOpenId(null);
    setDetail(null);
    try {
      const res = await fetch(
        `/api/practice/sessions?repId=${encodeURIComponent(repId)}`,
      );
      const data = (await res.json()) as {
        error?: string;
        sessions?: LogItem[];
        available?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load logs");
      setItems(data.sessions ?? []);
      setAvailable(data.available ?? null);
      setBanner(data.message ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [repId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openSession(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/practice/sessions/${encodeURIComponent(id)}`);
      const data = (await res.json()) as {
        error?: string;
        session?: SessionDetail;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load session");
      setDetail(data.session ?? null);
      if (data.message) setBanner(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session");
      setOpenId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <section className="surface-card rounded-xl p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        Practice logs
        <InfoTip text="Open a drill to review the transcript and rubric. You can calibrate any criterion (full / half / none) with a reason — the score updates and shows as (calibrated)." />
      </h2>
      <label className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
        Agent
        <select
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground outline-none focus:border-accent"
          value={repId}
          onChange={(e) => setRepId(e.target.value)}
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      {banner ? (
        <p className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted">
          {banner}
        </p>
      ) : null}
      {message ? <p className="mt-3 text-sm text-ok">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading practice logs…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No practice rounds yet. When {repName.split(/\s+/)[0]} finishes a
          drill, it shows up here.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border bg-background"
            >
              <button
                type="button"
                onClick={() => void openSession(item.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {item.scenarioTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {new Date(item.createdAt).toLocaleString()} · score{" "}
                    <span className="font-semibold text-foreground">
                      {item.overall}%
                      {item.calibrationCount > 0 ? (
                        <span className="font-medium text-accent">
                          {" "}
                          (calibrated)
                        </span>
                      ) : null}
                    </span>
                    {item.cueMode ? ` · cues ${item.cueMode}` : ""}
                  </p>
                </div>
                <span className="text-xs font-medium text-accent">
                  {openId === item.id ? "Hide" : "Open transcript"}
                </span>
              </button>

              {openId === item.id ? (
                <div className="border-t border-border px-4 py-4">
                  {detailLoading || !detail ? (
                    <p className="text-sm text-muted">Loading transcript…</p>
                  ) : (
                    <SessionDetailPanel
                      detail={detail}
                      onCalibrated={async (msg) => {
                        setMessage(msg);
                        await load();
                        setDetailLoading(true);
                        try {
                          const res = await fetch(
                            `/api/practice/sessions/${encodeURIComponent(item.id)}`,
                          );
                          const data = (await res.json()) as {
                            session?: SessionDetail;
                          };
                          if (res.ok && data.session) setDetail(data.session);
                        } finally {
                          setDetailLoading(false);
                        }
                      }}
                    />
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SessionDetailPanel({
  detail,
  onCalibrated,
}: {
  detail: SessionDetail;
  onCalibrated: (message: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex min-h-[24rem] flex-col">
        <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted">
          Transcript
        </h3>
        <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {detail.turns.length === 0 ? (
            <li className="text-sm text-muted">No turns stored.</li>
          ) : (
            detail.turns.map((t, i) => (
              <li
                key={`${t.role}-${i}`}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t.role === "user" ? "Agent (rep)" : "Client"}
                </span>
                <p className="mt-1 leading-relaxed text-foreground">{t.text}</p>
              </li>
            ))
          )}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Rubric · {detail.score.overall}/100
          {detail.calibration &&
          Array.isArray(detail.calibration.overrides) &&
          detail.calibration.overrides.length > 0
            ? " (calibrated)"
            : ""}
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="pb-2 pr-3 font-medium">Criterion</th>
                <th className="pb-2 pr-3 font-medium">Score</th>
                <th className="pb-2 pr-3 text-right font-medium">Pts</th>
                <th className="pb-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {detail.score.criteria.map((c) => (
                <tr key={c.id} className="border-b border-border/70 align-top">
                  <td className="py-2.5 pr-3 font-medium text-foreground">
                    {c.label}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-muted">
                    {Math.round(c.score * 100)}%
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-xs text-muted">
                    {Math.round(c.score * c.max)}/{c.max}
                  </td>
                  <td className="py-2.5 text-muted">{c.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DisagreeForm
        attemptId={detail.id}
        criteria={detail.score.criteria}
        onDone={onCalibrated}
      />
    </div>
  );
}

function DisagreeForm({
  attemptId,
  criteria,
  onDone,
}: {
  attemptId: string;
  criteria: CriterionScore[];
  onDone: (message: string) => void;
}) {
  const [criterionId, setCriterionId] = useState<RubricCriterionId>(
    criteria.find((c) => c.score < 0.6)?.id ??
      criteria[0]?.id ??
      "agreed_next_step",
  );
  const [target, setTarget] = useState<"full" | "half" | "none">("full");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<"attempt" | "agency">("agency");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const selected = criteria.find((c) => c.id === criterionId);
  const field =
    "mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/attempts/calibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          criterionId,
          target,
          reason,
          scope,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Calibration failed");
      setOpen(false);
      setReason("");
      onDone(
        scope === "agency"
          ? "Saved, this is now your agency standard for future drills."
          : "Saved, applied to this conversation only.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calibration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border-2 border-danger/50 bg-danger-soft p-4 shadow-[0_0_0_1px_color-mix(in_srgb,var(--danger)_20%,transparent)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-danger">
            Calibrate the coach
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md bg-danger px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {open ? "Close" : "I disagree with this"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Which criterion?
            <select
              className={field}
              value={criterionId}
              onChange={(e) =>
                setCriterionId(e.target.value as RubricCriterionId)
              }
            >
              {criteria.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}: coach gave {Math.round(c.score * 100)}%
                </option>
              ))}
            </select>
          </label>
          {selected?.notes ? (
            <p className="text-xs text-muted">{selected.notes}</p>
          ) : null}

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider text-muted">
              It should have been
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["full", "Full marks"],
                  ["half", "Half"],
                  ["none", "No marks"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTarget(value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    target === value
                      ? "bg-accent text-accent-fg"
                      : "border border-border text-foreground hover:border-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Why? (required)
            <textarea
              className={`${field} min-h-[88px]`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. When a seller isn't ready, permission to follow up later is an acceptable outcome."
            />
          </label>

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider text-muted">
              Apply to
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setScope("attempt")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  scope === "attempt"
                    ? "bg-accent text-accent-fg"
                    : "border border-border text-foreground hover:border-accent"
                }`}
              >
                This conversation only
              </button>
              <button
                type="button"
                onClick={() => setScope("agency")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  scope === "agency"
                    ? "bg-accent text-accent-fg"
                    : "border border-border text-foreground hover:border-accent"
                }`}
              >
                Make it our agency standard
              </button>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || !reason.trim()}
              onClick={() => void submit()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save calibration"}
            </button>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
