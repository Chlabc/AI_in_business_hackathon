import colors from "@/app/coach/coach.module.css";
import { seatPrice, seatPriceFull } from "@/lib/money";
import type { PlaybookTalkTrack } from "@/lib/playbook";

type PracticeBriefingProps = {
  listPct: number;
  floorPct: number;
  talkTrack: PlaybookTalkTrack;
  /** Biggest issue / diagnosis headline folded into Tips. */
  whyThis?: string | null;
};

/**
 * Tips + prices + do/never - lives on Practice so reps see them before
 * picking a scenario.
 */
export function PracticeBriefing({
  listPct,
  floorPct,
  talkTrack,
  whyThis,
}: PracticeBriefingProps) {
  return (
    <section className={colors.guidance}>
      <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Tips
      </h2>
      {whyThis ? (
        <p className="mt-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-foreground">
          <span className="font-semibold text-accent">Your biggest issue: </span>
          {whyThis}
        </p>
      ) : null}
      <h3 className="display-serif mt-5 text-2xl text-accent sm:text-3xl">
        {talkTrack.title}
      </h3>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted">
        {talkTrack.approvedPlay}
      </p>

      <div className={colors.pricing}>
        <div>
          <p className="text-sm text-muted">Standard commission</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {seatPriceFull(listPct)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted">Approval floor</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {seatPrice(floorPct)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Going below this needs approval.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className={colors.approved}>
          <p className="text-base font-semibold text-ok">Do this</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {talkTrack.anchorPoints.map((p) => (
              <li key={p} className="flex gap-2 leading-relaxed">
                <span aria-hidden className="text-ok">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className={colors.avoid}>
          <p className="text-base font-semibold text-danger">Never do this</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {talkTrack.neverDo.map((p) => (
              <li key={p} className="flex gap-2 leading-relaxed">
                <span aria-hidden className="text-danger">
                  ✕
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
