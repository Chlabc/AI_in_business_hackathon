"use client";

import { useCallback, useEffect, useState } from "react";
import type { CriterionScore, RubricCriterionId } from "@/lib/rubric";

type CalibrateItem = {
  id: string;
  repId: string;
  createdAt: string;
  scenarioId: string;
  scenarioTitle: string;
  overall: number;
  cueMode?: string;
  criteria: CriterionScore[];
  calibrationCount: number;
};

type CalibrateCoachSectionProps = {
  repId: string;
  repName: string;
};

export function CalibrateCoachSection({
  repId,
  repName,
}: CalibrateCoachSectionProps) {
  const [items, setItems] = useState<CalibrateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/practice/attempts/calibrate?repId=${encodeURIComponent(repId)}`,
      );
      const data = (await res.json()) as {
        error?: string;
        attempts?: CalibrateItem[];
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load drills");
      setItems(data.attempts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drills");
    } finally {
      setLoading(false);
    }
  }, [repId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="surface-card rounded-xl p-6">
      <p className="eyebrow">Calibrate the coach</p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">
        When the score is wrong, teach the scorer
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Disagree with a criterion, explain why, and choose whether it applies to
        this conversation only or becomes{" "}
        <strong className="font-medium text-foreground">
          {repName.split(" ")[0]}&apos;s agency standard
        </strong>{" "}
        for future drills. Criterion scores only — no transcripts.
      </p>

      {message ? (
        <p className="mt-3 text-sm text-ok">{message}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading recent drills…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No scored drills yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border bg-background px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {item.scenarioTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {new Date(item.createdAt).toLocaleString()} · score{" "}
                    {item.overall}%
                    {item.cueMode ? ` · cues ${item.cueMode}` : ""}
                    {item.calibrationCount > 0
                      ? ` · ${item.calibrationCount} override${item.calibrationCount === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setActiveId((id) => (id === item.id ? null : item.id))
                  }
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-accent"
                >
                  {activeId === item.id ? "Close" : "I disagree with this"}
                </button>
              </div>
              {activeId === item.id ? (
                <DisagreeForm
                  attempt={item}
                  onDone={(msg) => {
                    setMessage(msg);
                    setActiveId(null);
                    void load();
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DisagreeForm({
  attempt,
  onDone,
}: {
  attempt: CalibrateItem;
  onDone: (message: string) => void;
}) {
  const [criterionId, setCriterionId] = useState<RubricCriterionId>(
    attempt.criteria[0]?.id ?? "agreed_next_step",
  );
  const [target, setTarget] = useState<"full" | "half" | "none">("full");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<"attempt" | "agency">("agency");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = attempt.criteria.find((c) => c.id === criterionId);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/attempts/calibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attempt.id,
          criterionId,
          target,
          reason,
          scope,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Calibration failed");
      onDone(
        scope === "agency"
          ? "Saved — this is now your agency standard for future drills."
          : "Saved — applied to this conversation only.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calibration failed");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
        Which criterion?
        <select
          className={field}
          value={criterionId}
          onChange={(e) => setCriterionId(e.target.value as RubricCriterionId)}
        >
          {attempt.criteria.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} — coach gave {Math.round(c.score * 100)}%
            </option>
          ))}
        </select>
      </label>
      {selected ? (
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
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
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
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
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
  );
}
