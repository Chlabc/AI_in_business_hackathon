import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AttemptHistory } from "@/components/AttemptHistory";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { PageHeader } from "@/components/PageHeader";
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
  const labels: Record<string, string> = { fee: "commission", just_cvs: "appraisal request", other_agency: "another agent", exclusivity: "sales authority", needs: "selling plans" };
  return labels[value] ?? value.replaceAll("_", " ");
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

  const { rep, kpis, diagnosis } = dash;
  const attempts = await listAttempts(repId);
  const practice = practiceKpisFromAttempts(attempts);
  kpis.practice = practice;
  const share = await getShareSettings(repId);

  /** Prefer live drill metrics so Profile moves when the agent practices. */
  const fromDrills = practice.attempts > 0;
  const metrics = fromDrills
    ? [
        {
          label: "Price concessions (drills)",
          value: pct(practice.concessionRate),
          explain: "drills where you softened commission",
          problem: (practice.concessionRate ?? 0) >= 40,
        },
        {
          label: "Price hold (drills)",
          value: pct(practice.feeHoldRate),
          explain: "drills held near approved rate",
          problem: (practice.feeHoldRate ?? 100) < 60,
        },
        {
          label: "Strong drills (≥70)",
          value: pct(practice.strongDrillRate),
          explain: "drills scoring 70+",
          problem: false,
        },
      ]
    : [
        {
          label: "Price concessions",
          value: pct(kpis.feeConcessionRate),
          explain: "from call history",
          problem: true,
        },
        {
          label: "Average commission cut",
          value: seatPrice(
            kpis.avgFeeAskedPct !== null && kpis.avgFeeEndedPct !== null
              ? Math.round(
                  (kpis.avgFeeAskedPct - kpis.avgFeeEndedPct) * 100,
                ) / 100
              : null,
          ).replace("%", " pp"),
          explain: `${seatPriceFull(kpis.avgFeeAskedPct)} → ${seatPrice(kpis.avgFeeEndedPct)}`,
          problem: true,
        },
        {
          label: "Win rate",
          value: pct(kpis.winRate),
          explain: "from call history",
          problem: false,
        },
      ];

  return (
    <AppShell>
      {/* 2 — optional onboarding banner */}
      <OnboardingBanner className={colors.onboarding} />

      <PageHeader
        eyebrow="Profile"
        title={user.name}
        description={
          <>
            {rep.title} at {rep.agency} · {rep.weeksInRole} weeks in role
          </>
        }
        action={
          <Link
            href="/coach/value"
            className="inline-flex h-10 items-center rounded-md border border-accent/30 bg-accent-soft px-4 text-sm font-semibold text-accent transition hover:opacity-90"
          >
            Progress →
          </Link>
        }
      />

      {/* Credential + snapshot — vertically centered as a pair */}
      <div className={colors.profilePerformance}>
        <EmployeeCredential
          key={`${rep.id}:${user.name}`}
          repId={rep.id}
          agency={rep.agency}
          name={user.name}
          role={rep.title}
          weeksInRole={rep.weeksInRole}
          weakestStage={
            practice.weakestCriterionLabel ?? label(diagnosis.primaryStage)
          }
          attemptCount={attempts.length}
        />

        <section className={colors.performancePanel}>
          <h2 className="text-lg font-semibold text-foreground">
            Your performance snapshot
          </h2>
          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted">Drills scored</p>
              <p className="mt-1 text-2xl font-semibold">{practice.attempts}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted">Last drill score</p>
              <p className="mt-1 text-2xl font-semibold">
                {practice.lastScore ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted">Price hold</p>
              <p className="mt-1 text-2xl font-semibold">
                {practice.feeHoldRate === null
                  ? "—"
                  : `${practice.feeHoldRate}%`}
              </p>
            </div>
          </div>
          <p className="mb-5 text-sm text-muted">{practice.trendLabel}</p>
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
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border pt-5">
            <Link
              href="/coach/practice?scenario=price-objection"
              className="btn-lift inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-fg transition hover:opacity-90"
            >
              Practice this now
            </Link>
            <Link
              href="/coach/practice"
              className="text-sm font-medium text-muted transition hover:text-accent"
            >
              Or choose a scenario →
            </Link>
          </div>
        </section>
      </div>

      {/* Secondary: sharing + practice history */}
      <div className={colors.secondary}>
        <ShareControls
          className={colors.sharing}
          initialShared={share.shareProgressWithManager}
          repId={repId}
        />
        <details className={`${colors.rawCalls} surface-card rounded-xl p-6`} open={attempts.length > 0}>
          <summary className="cursor-pointer text-sm text-muted transition hover:text-foreground">
            Practice history · {attempts.length} scored drill
            {attempts.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-4">
            {attempts.length === 0 ? (
              <p className="text-sm text-muted">
                No scored drills yet. Finish a practice session to build
                history.
              </p>
            ) : (
              <AttemptHistory attempts={attempts} />
            )}
          </div>
        </details>
      </div>
    </AppShell>
  );
}
