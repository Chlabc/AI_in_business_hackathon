"use client";

import { useState } from "react";
import type { PracticeAttempt } from "@/lib/attempts";
import { seatPrice } from "@/lib/money";

const PER_PAGE = 4;

/**
 * How much help was on screen for a drill.
 *
 * Scoring well while reading the approved play off a cue card is not the same
 * as scoring well without it, so the two are shown differently — "Unaided" is
 * the one that means the behaviour transferred.
 */
function CueBadge({ mode }: { mode?: "off" | "soft" | "full" }) {
  if (!mode) {
    return <span className="text-xs text-muted">—</span>;
  }
  const map = {
    off: { label: "Unaided", cls: "border-ok/30 bg-ok-soft text-ok" },
    soft: { label: "Hints", cls: "border-border bg-background text-muted" },
    full: { label: "Guided", cls: "border-border bg-background text-muted" },
  } as const;
  const { label, cls } = map[mode];
  return (
    <span className={`rounded border px-2 py-0.5 text-xs ${cls}`}>{label}</span>
  );
}

/**
 * The attempt history, paged inside the panel.
 *
 * Listing every attempt made the progress panel grow without limit, which
 * dragged the whole two-column row taller than the panel beside it. Four rows
 * at a time keeps the panel a fixed, predictable height however many drills
 * have been run.
 */
export function AttemptHistory({ attempts }: { attempts: PracticeAttempt[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(attempts.length / PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PER_PAGE;
  const rows = attempts.slice(start, start + PER_PAGE);

  return (
    <div>
      {/* Holding the price is one of six scored criteria, so "Held" next to a
          low score is correct and needs saying — people read it as a bug. */}
      <p className="mb-3 text-xs leading-relaxed text-muted">
        <strong className="font-medium text-foreground">Score</strong> is out of
        100 across six things — did you explore the objection, ask questions,
        anchor on value, hold the price, use the approved play, and avoid caving
        early. <strong className="font-medium text-foreground">Held</strong> is
        only the fourth of those. You can hold the price and still score low by
        skipping the other five.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="pb-2 pr-3 font-medium">#</th>
              <th className="pb-2 pr-3 font-medium">When</th>
              <th className="pb-2 pr-3 font-medium">Help</th>
              <th className="pb-2 pr-3 font-medium">Score /100</th>
              <th className="pb-2 font-medium">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a, idx) => (
              <tr key={a.id}>
                <td className="py-2 pr-3 font-mono text-xs text-muted">
                  {attempts.length - (start + idx)}
                </td>
                {/* toLocaleString resolves against the server's locale and
                    timezone during SSR and the browser's on the client, so the
                    two renders legitimately differ. This is the documented case
                    for suppressing the warning rather than a masked bug — the
                    browser's local time is the value we actually want shown. */}
                <td className="py-2 pr-3 text-muted" suppressHydrationWarning>
                  {new Date(a.createdAt).toLocaleString()}
                </td>
                <td className="py-2 pr-3">
                  <CueBadge mode={a.cueMode} />
                </td>
                <td className="py-2 pr-3 font-semibold text-foreground">
                  {a.score.overall}
                  {a.calibration && a.calibration.overrides.length > 0 ? (
                    <span className="ml-1 text-xs font-medium text-accent">
                      (calibrated)
                    </span>
                  ) : null}
                </td>
                <td className="py-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-xs ${
                      a.score.heldFee
                        ? "border-ok/30 bg-ok-soft text-ok"
                        : "border-warn/30 bg-warn-soft text-warn"
                    }`}
                  >
                    {a.score.heldFee ? "Held" : "Softened"}
                    {a.score.feeOfferedPct !== null
                      ? ` · ${seatPrice(a.score.feeOfferedPct)}`
                      : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Showing {start + 1}–{Math.min(start + PER_PAGE, attempts.length)} of{" "}
            {attempts.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((n) => Math.max(0, n - 1))}
              disabled={safePage === 0}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-foreground disabled:opacity-35"
            >
              ← Newer
            </button>
            <span className="font-mono text-xs text-muted">
              {safePage + 1}/{pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((n) => Math.min(pageCount - 1, n + 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-foreground disabled:opacity-35"
            >
              Older →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
