import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { ProgressPanel } from "@/components/ProgressPanel";
import { ShareControls } from "@/components/ShareControls";
import { EmployeeCredential } from "./EmployeeCredential";
import colors from "./coach.module.css";
import { DEMO_REP_ID } from "@/data/seed";
import { listAttempts, practiceKpisFromAttempts } from "@/lib/attempts";
import { requireRole } from "@/lib/auth";
import { getRepDashboard } from "@/lib/diagnosis";
import { seatPrice, seatPriceFull } from "@/lib/money";
import { getShareSettings } from "@/lib/share";

export const dynamic = "force-dynamic";

function pct(n: number | null | undefined, fallback = "—") {
  if (n === null || n === undefined) return fallback;
  return `${n}%`;
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export default async function CoachPage() {
  // Manual §15: authentication, diagnosis, KPI and share logic stay owned here;
  // the presentation below only consumes their values.
  const user = await requireRole("employee");
  const repId = user.repId ?? DEMO_REP_ID;
  const dash = getRepDashboard(repId);

  if (!dash) {
    return <div className="px-6 py-12 text-muted">Rep not found.</div>;
  }

  const { rep, firm, kpis, diagnosis, talkTrack, recentCalls } = dash;
  const attempts = await listAttempts(repId);
  const practice = practiceKpisFromAttempts(attempts);
  kpis.practice = practice;
  const share = await getShareSettings(repId);

  /** Formatting seam only — the underlying figures come from KPI logic. */
  const discount =
    kpis.avgFeeAskedPct !== null && kpis.avgFeeEndedPct !== null
      ? Math.round((kpis.avgFeeAskedPct - kpis.avgFeeEndedPct) * 100) / 100
      : null;

  const metrics = [
    {
      label: "Price concessions",
      value: pct(kpis.feeConcessionRate),
      explain:
        "of the times a client pushed back on price, you lowered it rather than defending it",
      problem: true,
    },
    {
      label: "Average seat discount",
      value: seatPrice(discount),
      explain: `you ask ${seatPriceFull(kpis.avgFeeAskedPct)} and settle at ${seatPrice(kpis.avgFeeEndedPct)}`,
      problem: true,
    },
    {
      label: "Win rate",
      value: pct(kpis.winRate),
      explain: "of all your calls ended in a win",
      problem: false,
    },
  ];

  return (
    <AppShell>
      {/* 2 — optional onboarding banner */}
      <OnboardingBanner className={colors.onboarding} />

      {/* 3 — page context row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Your diagnosis</p>
          <h1 className="display-serif mt-2 text-3xl text-foreground lg:text-4xl">
            Where you&apos;re losing deals
          </h1>
          <p className="mt-2 text-sm text-muted">
            {user.name} · {rep.title} at {rep.agency} · {rep.weeksInRole} weeks
            in role
          </p>
        </div>
        <Link
          href="/coach/value"
          className="rounded border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent transition hover:opacity-90"
        >
          Value / evidence →
        </Link>
      </div>

      {/* 4 — diagnosis / verdict panel */}
      <section
        className={`${colors.verdict} surface-card rounded-xl p-6 lg:p-8`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          The pattern costing you deals
        </p>
        <h2 className="display-serif mt-3 max-w-4xl text-3xl leading-snug text-foreground lg:text-4xl">
          {diagnosis.headline}
        </h2>
        <p className="mt-4 text-sm text-muted">
          Found across{" "}
          <strong className="font-medium text-foreground">
            {kpis.callsAnalysed} calls
          </strong>
          , with {diagnosis.confidence} confidence. It shows up most in the{" "}
          <strong className="font-medium text-foreground">
            {label(diagnosis.primaryStage)}
          </strong>{" "}
          part of the conversation.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Link
            href="/coach/practice?scenario=price-objection"
            className="btn-lift inline-flex h-12 items-center justify-center rounded-full bg-accent px-7 text-lg font-semibold text-accent-fg transition hover:opacity-90"
          >
            Practice this now
          </Link>
          <Link
            href="/coach/training"
            className="text-sm font-medium text-muted transition hover:text-accent"
          >
            Or pick a different scenario →
          </Link>
        </div>
      </section>

      {/* 5 — evidence panel */}
      <section className="surface-card rounded-xl p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Why we think that — {diagnosis.evidence.length} recent losses
        </h2>
        <ol className="mt-4 space-y-3">
          {diagnosis.evidence.map((line, i) => (
            <li key={line} className="flex gap-3 text-sm text-foreground">
              <span className="mt-0.5 font-mono text-xs text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="leading-relaxed">{line}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 6 — paired identity and performance */}
      <div className={colors.profilePerformance}>
        <EmployeeCredential
          key={`${rep.id}:${user.name}`}
          repId={rep.id}
          agency={rep.agency}
          name={user.name}
          role={rep.title}
          weeksInRole={rep.weeksInRole}
          weakestStage={label(diagnosis.primaryStage)}
          attemptCount={attempts.length}
        />

        <section className={colors.performancePanel}>
          <h2 className="text-lg font-semibold text-foreground">
            Your performance snapshot
          </h2>
          <div className={colors.performanceMetrics}>
            {metrics.map((m) => (
              <div
                key={m.label}
                className={`${colors.metricBlock} ${m.problem ? colors.metricProblem : ""}`}
              >
                <p className="text-xs font-medium text-muted">{m.label}</p>
                <p
                  className={`mt-1 text-3xl font-semibold ${m.problem ? "text-warn" : "text-foreground"}`}
                >
                  {m.value}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  {m.explain}
                </p>
                {m.problem ? (
                  <p className="mt-2 text-xs font-medium text-warn">
                    ← this is the one to fix
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 7 — what to do next */}
      <section className={colors.guidance}>
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          What to do next
        </h2>
        <p className="mt-1 text-sm text-muted">
          What {firm.name} says to do here
        </p>
        <h3 className="display-serif mt-5 text-2xl text-accent sm:text-3xl">
          {talkTrack.title}
        </h3>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          {talkTrack.approvedPlay}
        </p>

        <div className={colors.pricing}>
          <div>
            <p className="text-sm text-muted">List price</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {seatPriceFull(firm.standardPermFeePct)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Approval floor</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {seatPrice(firm.feeFloorPct)}
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

      {/* 8 — paired stage weakness and practice progress.
             items-start so the stage card is only as tall as its five rows.
             Stretching it to match the progress panel just moved the empty
             space inside the card. The progress panel keeps its own height in
             check by paging its history rather than listing every attempt. */}
      <div className="mt-3 grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <section className="surface-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Where you struggle
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            A sales call has five stages. A longer red bar means more of those
            calls ended badly.
          </p>
          <ul className="mt-4 space-y-1.5">
            {kpis.byStage.map((s) => {
              const weakest = s.stage === diagnosis.primaryStage;
              return (
                <li
                  key={s.stage}
                  className={`flex items-center gap-3 text-sm ${weakest ? colors.weakestStage : colors.otherStage}`}
                >
                  <span
                    className={`w-24 capitalize ${weakest ? "font-semibold text-danger" : "text-muted"}`}
                  >
                    {label(s.stage)}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-danger"
                      style={{
                        width: `${Math.min(s.lossRate, 100)}%`,
                        opacity: weakest ? 1 : 0.45,
                      }}
                    />
                  </div>
                  <span
                    className={
                      weakest
                        ? "min-w-[72px] text-right text-2xl font-semibold text-danger"
                        : "w-14 text-right font-mono text-muted"
                    }
                  >
                    {pct(s.lossRate)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            It all goes wrong in one place:{" "}
            <strong className="font-medium text-foreground">
              {label(diagnosis.primaryStage)}
            </strong>
            . The other four stages are fine — which is why there&apos;s only one
            thing to practise.
          </p>
        </section>

        <ProgressPanel
          className={colors.progress}
          heading="Are you improving?"
          attempts={attempts}
          feeHoldRate={practice.feeHoldRate}
          trendLabel={practice.trendLabel}
        />
      </div>

      {/* 9 — secondary information */}
      <div className={colors.secondary}>
        <h2 className="text-base font-medium text-muted">
          Secondary information
        </h2>
        <ShareControls
          className={colors.sharing}
          initialShared={share.shareProgressWithManager}
          repId={repId}
        />
        <details className={`${colors.rawCalls} surface-card rounded-xl p-6`}>
          <summary className="cursor-pointer text-sm text-muted transition hover:text-foreground">
            See all {recentCalls.length} calls we analysed
          </summary>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Client</th>
                  <th className="pb-2 pr-3 font-medium">Stage</th>
                  <th className="pb-2 pr-3 font-medium">Objection</th>
                  <th className="pb-2 pr-3 font-medium">Outcome</th>
                  <th className="pb-2 font-medium">Price per seat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {recentCalls.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted">
                      {c.date}
                    </td>
                    <td className="py-2.5 pr-3">{c.client}</td>
                    <td className="py-2.5 pr-3 capitalize">{label(c.stage)}</td>
                    <td className="py-2.5 pr-3 capitalize">
                      {label(c.objectionType)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <OutcomePill outcome={c.outcome} />
                    </td>
                    <td className="py-2.5 font-mono text-xs text-muted">
                      {c.feeEndedPct !== null
                        ? `${seatPrice(c.feeAskedPct)} → ${seatPrice(c.feeEndedPct)}`
                        : seatPrice(c.feeAskedPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </AppShell>
  );
}

function OutcomePill({ outcome }: { outcome: string }) {
  const styles: Record<string, string> = {
    won: "bg-ok-soft text-ok border-ok/30",
    lost: "bg-danger-soft text-danger border-danger/30",
    conceded: "bg-warn-soft text-warn border-warn/30",
    no_decision: "bg-background text-muted border-border",
  };
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-xs capitalize ${styles[outcome] ?? styles.no_decision}`}
    >
      {label(outcome)}
    </span>
  );
}
