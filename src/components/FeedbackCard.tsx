"use client";

import { useState } from "react";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { seatPrice } from "@/lib/money";
import type { PracticeScore } from "@/lib/rubric";
import type { ScoringMeta } from "@/lib/scoring-meta";

export type ReflectionDraft = {
  whatWentWrong: string;
  nextTime: string;
};

type FeedbackCardProps = {
  score: PracticeScore;
  scoringMeta?: ScoringMeta | null;
  whatYouSaid?: string[];
  repName?: string;
  cueMode?: string | null;
  attemptId?: string | null;
  attemptPersisted?: boolean;
};

function formatFallbackReason(meta: ScoringMeta): string | null {
  if (meta.llmUsed || meta.fallbackReason === "ok") return null;
  switch (meta.fallbackReason) {
    case "xai_key_missing":
      return "AI scoring skipped: XAI_API_KEY not visible to this server (check Vercel env + redeploy).";
    case "mode_heuristic":
      return "AI scoring skipped: CORNERMAN_SCORING=heuristic.";
    case "llm_timeout_or_null":
      return "AI scoring timed out; used rule-based fallback.";
    case "llm_invalid_json":
      return "AI reply was not valid JSON; used rule-based fallback.";
    case "llm_empty_content":
      return "AI returned an empty reply (often a slow reasoning model); used rule-based fallback.";
    case "llm_incomplete_rubric":
      return "AI reply missed rubric criteria; used rule-based fallback.";
    case "llm_http_error":
      return `AI HTTP error${meta.detail ? ` (${meta.detail})` : ""}; used rule-based fallback. Check xAI credits/model access on the Vercel key.`;
    default:
      return meta.xaiKeyPresent
        ? null
        : "AI scoring skipped: XAI_API_KEY not visible to this server.";
  }
}

/** Green / amber / red so a weak criterion is obvious without reading the number. */
function tierBarClass(fraction: number) {
  if (fraction >= 0.8) return "bg-ok";
  if (fraction >= 0.5) return "bg-warn";
  return "bg-danger";
}

export function FeedbackCard({
  score,
  scoringMeta = null,
  whatYouSaid = [],
  repName = "Alex Chen",
  cueMode = null,
  attemptId = null,
  attemptPersisted = false,
}: FeedbackCardProps) {
  const said =
    whatYouSaid.length > 0
      ? whatYouSaid.slice(-3)
      : ["(No user transcript captured)"];

  const [whatWentWrong, setWhatWentWrong] = useState("");
  const [nextTime, setNextTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const reflection: ReflectionDraft = { whatWentWrong, nextTime };
  const hasReflection =
    Boolean(whatWentWrong.trim()) || Boolean(nextTime.trim());

  async function saveReflection() {
    if (!hasReflection) {
      setSaveErr("Write at least one field before saving.");
      return;
    }
    setSaving(true);
    setSaveErr(null);
    setSaveMsg(null);
    try {
      if (!attemptId || !attemptPersisted) {
        setSaveMsg(
          "Kept for this PDF download. Attempt wasn’t persisted on the server, re-download before you leave.",
        );
        return;
      }
      const res = await fetch("/api/practice/attempts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          whatWentWrong,
          nextTime,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        persisted?: boolean;
      };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaveMsg(
        data.persisted === false
          ? "Saved for this session only (server store unavailable)."
          : "Reflection saved.",
      );
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

  const agency = score.agencyStandardsApplied ?? [];
  const fallbackNote = scoringMeta ? formatFallbackReason(scoringMeta) : null;

  return (
    <section className="surface-card overflow-hidden rounded-xl">
      <div className="border-b border-border bg-ok-soft/50 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-ok!">3 · Feedback</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Score {score.overall}/100
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded border border-border bg-card px-2 py-1 text-muted">
              {score.method}
            </span>
            {scoringMeta ? (
              <span className="rounded border border-border bg-card px-2 py-1 text-muted">
                key {scoringMeta.xaiKeyPresent ? "on" : "off"}
                {scoringMeta.vercelEnv ? ` · ${scoringMeta.vercelEnv}` : ""}
              </span>
            ) : null}
            <span
              className={`rounded border px-2 py-1 font-medium ${
                score.heldFee
                  ? "border-ok/30 bg-ok-soft text-ok"
                  : "border-warn/30 bg-warn-soft text-warn"
              }`}
            >
              {score.heldFee ? "Price held" : "Price softened"}
              {score.feeOfferedPct !== null
                ? ` · ${seatPrice(score.feeOfferedPct)}`
                : ""}
            </span>
          </div>
        </div>
        {fallbackNote ? (
          <p className="mt-3 text-xs text-warn">{fallbackNote}</p>
        ) : null}
      </div>

      {agency.length > 0 ? (
        <div className="border-b border-border bg-accent-soft/60 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Scored using your agency&apos;s standard
          </p>
          <ul className="mt-2 space-y-2">
            {agency.map((a) => (
              <li key={a.criterionId} className="text-sm text-foreground">
                <span className="font-medium">{a.label}</span>
                {", "}
                <span className="text-muted">&ldquo;{a.reason}&rdquo;</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Set by {a.setByName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid border-b border-border md:grid-cols-2">
        <div className="border-b border-border p-5 md:border-b-0 md:border-r md:p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            What you said
          </h3>
          <ul className="mt-3 space-y-2">
            {said.map((line) => (
              <li
                key={line}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
              >
                “{line}”
              </li>
            ))}
          </ul>
        </div>
        <div className="p-5 md:p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Approved talk-track
          </h3>
          <p className="mt-3 rounded-md border border-accent/25 bg-accent-soft px-3 py-2 text-sm leading-relaxed text-foreground">
            {score.approvedPlayReminder}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            {score.feedback.slice(0, 3).map((line) => (
              <li key={line} className="leading-relaxed">
                · {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-b border-border bg-background px-5 py-4 sm:px-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Suggested response (rehearse this)
        </h3>
        <p className="mt-2 text-sm italic leading-relaxed text-foreground">
          “{score.suggestedResponse}”
        </p>
      </div>

      <div className="border-b border-border p-5 sm:p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Rubric breakdown
        </h3>
        <div className="mt-4 overflow-x-auto">
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
              {score.criteria.map((c) => (
                <tr key={c.id} className="border-b border-border/70 align-top">
                  <td className="py-3 pr-3 font-medium text-foreground">
                    {c.label}
                    <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-border">
                      <div
                        className={`h-full rounded-full ${tierBarClass(c.score)}`}
                        style={{ width: `${Math.round(c.score * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-muted">
                    {Math.round(c.score * 100)}%
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-xs text-muted">
                    {Math.round(c.score * c.max)}/{c.max}
                  </td>
                  <td className="py-3 text-muted">{c.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-b border-border px-5 py-5 sm:px-6">
        <p className="eyebrow">Self-reflection</p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">
          What will you do differently?
        </h3>
        <p className="mt-1 text-sm text-muted">
          Optional, your words, not the AI’s. Included in the PDF when filled
          in. Private to you (not on the manager report).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            What went wrong
            <textarea
              rows={3}
              className={fieldClass}
              placeholder="In one sentence: where did you lose control of the call?"
              value={whatWentWrong}
              onChange={(e) => {
                setWhatWentWrong(e.target.value);
                setSaveMsg(null);
                setSaveErr(null);
              }}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Next time I will
            <textarea
              rows={3}
              className={fieldClass}
              placeholder="Next drill, I will…"
              value={nextTime}
              onChange={(e) => {
                setNextTime(e.target.value);
                setSaveMsg(null);
                setSaveErr(null);
              }}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void saveReflection()}
            disabled={saving || !hasReflection}
            className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:border-accent disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save reflection"}
          </button>
          {saveMsg ? <p className="text-sm text-ok">{saveMsg}</p> : null}
          {saveErr ? <p className="text-sm text-danger">{saveErr}</p> : null}
        </div>
      </div>

      <div className="border-t border-border bg-background px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-foreground">
              Take this away as a PDF
            </p>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
              Score, rubric, rehearse line
              {hasReflection ? ", and your self-reflection" : ""}.
            </p>
          </div>
          <DownloadPdfButton
            score={score}
            whatYouSaid={whatYouSaid}
            repName={repName}
            cueMode={cueMode}
            reflection={hasReflection ? reflection : undefined}
          />
        </div>
      </div>
    </section>
  );
}
