import { AttemptHistory } from "@/components/AttemptHistory";
import type { PracticeAttempt } from "@/lib/attempts";

type ProgressPanelProps = {
  /** Page-scoped presentation hook; the component keeps its own data behaviour. */
  className?: string;
  heading?: string;
  attempts: PracticeAttempt[];
  feeHoldRate: number | null;
  trendLabel: string;
};

export function ProgressPanel({
  className = "",
  heading = "Your practice so far",
  attempts,
  feeHoldRate,
  trendLabel,
}: ProgressPanelProps) {
  const chronological = [...attempts].reverse();
  const maxScore = Math.max(100, ...chronological.map((a) => a.score.overall));

  return (
    <section
      className={`surface-card flex h-full flex-col rounded-xl ${className}`}
    >
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {heading}
        </h2>
        <p className="mt-1 text-sm text-muted">{trendLabel}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Attempts</p>
          <p className="mt-1 text-2xl font-semibold">{attempts.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            Last score
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {attempts[0]?.score.overall ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Price hold</p>
          <p className="mt-1 text-2xl font-semibold">
            {feeHoldRate === null ? "—" : `${feeHoldRate}%`}
          </p>
        </div>
      </div>

      {chronological.length === 0 ? (
        <p className="p-5 text-sm text-muted">
          No scored drills yet. Finish a fee-objection session to start the
          trend line.
        </p>
      ) : (
        <>
          <div className="border-b border-border px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Score trend
            </p>
            <div className="flex h-28 items-end gap-1.5">
              {chronological.map((a, i) => {
                const h = Math.max(8, (a.score.overall / maxScore) * 100);
                return (
                  <div
                    key={a.id}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                    title={`#${i + 1}: ${a.score.overall}`}
                  >
                    <div
                      className={`w-full max-w-8 rounded-t ${
                        a.score.heldFee ? "bg-ok" : "bg-warn"
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-ok" />
                you held the price
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-warn" />
                you discounted
              </span>
            </p>
          </div>

          <div className="flex-1 p-5">
            <AttemptHistory attempts={attempts} />
          </div>
        </>
      )}
    </section>
  );
}
