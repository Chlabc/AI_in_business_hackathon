"use client";

import { useState } from "react";
import type { PracticeAttempt } from "@/lib/attempts";
import type { AgencyGuidance } from "@/lib/agency-guidance";

type Props = {
  attempts: PracticeAttempt[];
  repName: string;
  initialGuidance: AgencyGuidance[];
};

/**
 * Principal calibration.
 *
 * The trust problem with an AI grader isn't that it's wrong once — it's that
 * you can't do anything when it is. Here a principal picks the criterion they
 * disagree with, says what the right answer is and WHY, and decides whether
 * that judgement applies to this conversation only or becomes the agency's
 * standard. Standards are read back into later scoring, so the correction
 * changes future verdicts rather than just this row.
 */
export function CalibrationPanel({
  attempts,
  repName,
  initialGuidance,
}: Props) {
  const [guidance, setGuidance] = useState(initialGuidance);
  const [openId, setOpenId] = useState<string | null>(null);
  const [criterionId, setCriterionId] = useState<string>("");
  const [managerScore, setManagerScore] = useState(1);
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<"this_only" | "agency_standard">(
    "agency_standard",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const attempt = attempts.find((a) => a.id === openId) ?? null;
  const criterion =
    attempt?.score.criteria.find((c) => c.id === criterionId) ?? null;

  function openFor(a: PracticeAttempt) {
    setOpenId(a.id);
    setCriterionId(a.score.criteria[0]?.id ?? "");
    setManagerScore(1);
    setReason("");
    setScope("agency_standard");
    setError(null);
    setSaved(null);
  }

  async function submit() {
    if (!attempt || !criterion) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attempt.id,
          criterionId,
          aiScore: criterion.score,
          managerScore,
          reason,
          scope,
        }),
      });
      const data = (await res.json()) as AgencyGuidance & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setGuidance((g) => [data, ...g]);
      setOpenId(null);
      setSaved(
        scope === "agency_standard"
          ? "Saved as an agency standard — it will apply to future drills."
          : "Saved against this conversation only.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const standards = guidance.filter((g) => g.scope === "agency_standard");

  return (
    <section className="surface-card rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground">
        Calibrate the coach
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
        Disagree with a score? Correct it and say why. Mark the correction as an{" "}
        <strong className="font-medium text-foreground">agency standard</strong>{" "}
        and the coach applies your judgement to future drills, not just this
        one.
      </p>

      {saved ? (
        <p className="mt-4 rounded-md border border-ok/30 bg-ok-soft px-4 py-2 text-sm text-ok">
          {saved}
        </p>
      ) : null}

      {/* Standing standards — the evidence that corrections persist. */}
      {standards.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Your agency standards ({standards.length})
          </h3>
          <ul className="mt-3 space-y-2">
            {standards.map((g) => (
              <li
                key={g.id}
                className="rounded-lg border border-accent/25 bg-accent-soft/50 px-4 py-3 text-sm"
              >
                <p className="font-medium text-foreground">{g.reason}</p>
                <p className="mt-1 text-xs text-muted">
                  Set by {g.byName} · coach scored{" "}
                  {Math.round(g.aiScore * 100)}%, standard is{" "}
                  {Math.round(g.managerScore * 100)}%
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted">
        {repName}&apos;s recent drills
      </h3>

      {attempts.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No scored drills yet — nothing to calibrate.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {attempts.slice(0, 4).map((a) => (
            <li key={a.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
                <span className="text-sm text-foreground">
                  <strong className="font-semibold">{a.score.overall}</strong>
                  /100 ·{" "}
                  <span className="text-muted" suppressHydrationWarning>
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => (openId === a.id ? setOpenId(null) : openFor(a))}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-foreground"
                >
                  {openId === a.id ? "Cancel" : "I disagree with this"}
                </button>
              </div>

              {openId === a.id ? (
                <div className="mt-2 rounded-lg border border-accent/30 bg-accent-soft/40 p-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                    Which criterion?
                    <select
                      value={criterionId}
                      onChange={(e) => setCriterionId(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
                    >
                      {a.score.criteria.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} — coach gave {Math.round(c.score * 100)}%
                        </option>
                      ))}
                    </select>
                  </label>

                  <fieldset className="mt-4">
                    <legend className="text-xs font-semibold uppercase tracking-wider text-muted">
                      It should have been
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        { v: 1, label: "Full marks" },
                        { v: 0.5, label: "Half" },
                        { v: 0, label: "No marks" },
                      ].map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setManagerScore(o.v)}
                          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                            managerScore === o.v
                              ? "border-accent bg-accent text-accent-fg"
                              : "border-border bg-card text-muted hover:border-accent"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted">
                    Why? (required)
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      placeholder="e.g. When a seller isn't ready, getting permission to follow up later is an acceptable outcome."
                      className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
                    />
                  </label>

                  <fieldset className="mt-4">
                    <legend className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Apply to
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {(
                        [
                          {
                            v: "this_only",
                            t: "This conversation only",
                            d: "A one-off judgement. Nothing else changes.",
                          },
                          {
                            v: "agency_standard",
                            t: "Make it our agency standard",
                            d: "Future drills are scored this way too.",
                          },
                        ] as const
                      ).map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setScope(o.v)}
                          className={`rounded-lg border p-3 text-left transition ${
                            scope === o.v
                              ? "border-accent bg-card ring-2 ring-accent/25"
                              : "border-border bg-card hover:border-accent/50"
                          }`}
                        >
                          <span className="block text-sm font-semibold normal-case tracking-normal text-foreground">
                            {o.t}
                          </span>
                          <span className="mt-0.5 block text-xs font-normal normal-case tracking-normal text-muted">
                            {o.d}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {error ? (
                    <p className="mt-3 text-sm text-danger">{error}</p>
                  ) : null}

                  <button
                    type="button"
                    disabled={saving || reason.trim().length < 10}
                    onClick={() => void submit()}
                    className="btn-lift mt-4 inline-flex h-10 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-fg disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save correction"}
                  </button>
                  {reason.trim().length < 10 ? (
                    <p className="mt-2 text-xs text-muted">
                      A correction needs a reason — that&apos;s what makes it
                      reusable.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
