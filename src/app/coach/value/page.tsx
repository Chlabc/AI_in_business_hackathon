import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { InfoTip } from "@/components/InfoTip";
import { PageHeader } from "@/components/PageHeader";
import { ProgressPanel } from "@/components/ProgressPanel";
import colors from "@/app/coach/coach.module.css";
import { DEMO_REP_ID } from "@/data/seed";
import { TEAM } from "@/data/team";
import {
  listAttempts,
  practiceKpisFromAttempts,
  type PracticeAttempt,
} from "@/lib/attempts";
import { getSession } from "@/lib/auth";
import { getRepDashboard } from "@/lib/diagnosis";
import type { EvalSnapshot } from "@/lib/eval-snapshot";
import { loadEvalSnapshot } from "@/lib/load-eval-snapshot";
import type { Diagnosis, RepKpis } from "@/lib/types";
import {
  beforeAfterFromAttempts,
  type BeforeAfterEvidence,
} from "@/lib/value-evidence";

export const dynamic = "force-dynamic";

function pct(n: number | null | undefined, fallback = "n/a") {
  if (n === null || n === undefined) return fallback;
  return `${n}%`;
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export default async function ValuePage() {
  const user = await getSession();
  const isManager = user?.role === "manager";

  if (isManager) {
    // Claim 2 = team aggregate across every agent’s scored drills (not Alex-only).
    const perRep = await Promise.all(
      TEAM.map(async (m) => listAttempts(m.id)),
    );
    const teamAttempts = perRep.flat();
    const evidence = beforeAfterFromAttempts(teamAttempts);
    return (
      <ManagerEvidence
        evidence={evidence}
        agentCount={TEAM.length}
        snapshot={loadEvalSnapshot()}
      />
    );
  }

  const repId = user?.repId ?? DEMO_REP_ID;
  const attempts = await listAttempts(repId);
  const evidence = beforeAfterFromAttempts(attempts);
  const dash = getRepDashboard(repId);
  const practice = practiceKpisFromAttempts(attempts);

  return (
    <RepProgress
      evidence={evidence}
      attempts={attempts}
      practice={practice}
      diagnosis={dash?.diagnosis ?? null}
      kpis={dash?.kpis ?? null}
    />
  );
}

/* ── Rep: am I improving? ─────────────────────────────────────────────── */

function RepProgress({
  evidence,
  attempts,
  practice,
  diagnosis,
  kpis,
}: {
  evidence: BeforeAfterEvidence;
  attempts: PracticeAttempt[];
  practice: ReturnType<typeof practiceKpisFromAttempts>;
  diagnosis: Diagnosis | null;
  kpis: RepKpis | null;
}) {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Progress"
        title="Are you actually getting better?"
        action={
          <Link
            href="/coach/practice"
            className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
          >
            Run a drill
          </Link>
        }
      />

      <BeforeAfterScore
        attemptCount={evidence.attemptCount}
        firstScore={evidence.firstScore}
        latestScore={evidence.latestScore}
        scoreDelta={evidence.scoreDelta}
      />

      <PriceHold
        earlyPct={evidence.holdRateEarlyPct}
        latePct={evidence.holdRateLatePct}
      />

      <div className="mt-3 grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <section className="surface-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Where you struggle
          </h2>
          {practice.attempts > 0 && practice.criterionAverages.length > 0 ? (
            <>
              <p className="mt-1 text-sm text-muted">
                Average across {practice.attempts} scored drill
                {practice.attempts === 1 ? "" : "s"} (each criterion 0–100).
                Focus practice on the lowest bar.
              </p>
              <ul className="mt-4 space-y-2">
                {practice.criterionAverages.map((c) => {
                  const weakest = c.id === practice.weakestCriterionId;
                  return (
                    <li
                      key={c.id}
                      className={`flex items-center gap-3 text-sm ${weakest ? colors.weakestStage : colors.otherStage}`}
                    >
                      <span
                        className={`w-40 shrink-0 leading-snug ${weakest ? "font-semibold text-danger" : "text-muted"}`}
                      >
                        {c.label}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
                        <div
                          className={`h-full rounded-full ${weakest ? "bg-danger" : "bg-accent/70"}`}
                          style={{
                            width: `${Math.min(Math.max(c.avgPct, 0), 100)}%`,
                          }}
                        />
                      </div>
                      <span
                        className={
                          weakest
                            ? "min-w-[3rem] text-right text-base font-semibold tabular-nums text-danger"
                            : "min-w-[3rem] text-right font-mono text-sm tabular-nums text-muted"
                        }
                      >
                        {Math.round(c.avgPct)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Weakest skill:{" "}
                <strong className="font-medium text-foreground">
                  {practice.weakestCriterionLabel}
                </strong>
                {practice.avgScore !== null
                  ? ` · overall avg ${practice.avgScore}/100`
                  : null}
                {practice.feeHoldRate !== null
                  ? ` · held fee on ${practice.feeHoldRate}% of drills`
                  : null}
                . Use Practice with Soft/Full cues on that criterion, then try
                Unaided.
              </p>
            </>
          ) : kpis && diagnosis ? (
            <>
              <p className="mt-1 text-sm text-muted">
                From seeded call outcomes (no scored drills yet).
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
            </>
          ) : (
            <p className="mt-4 text-sm text-muted">No drill data yet.</p>
          )}
        </section>

        <ProgressPanel
          className={colors.progress}
          heading="Are you improving?"
          attempts={attempts}
          feeHoldRate={practice.feeHoldRate}
          trendLabel={practice.trendLabel}
        />
      </div>
    </AppShell>
  );
}

/* ── Manager: does the tool work? ─────────────────────────────────────── */

function ManagerEvidence({
  evidence,
  agentCount,
  snapshot,
}: {
  evidence: BeforeAfterEvidence;
  agentCount: number;
  snapshot: EvalSnapshot;
}) {
  const h = snapshot.headlines;
  const checks = [
    {
      value: h.scoringOverallPct,
      pass: `${h.scoringOverallAgree}/${h.scoringTotal}`,
      label: "Scoring agrees with a human grader",
      explain: `Within ${snapshot.overallAgreementBand} pts of human grades`,
    },
    {
      value: h.diagnosisPct,
      pass: `${h.diagnosisPassed}/${h.diagnosisTotal}`,
      label: "Diagnosis picks the right weak spot",
      explain: "Matches human stage/objection labels",
    },
    {
      value: h.personaPct,
      pass: `${h.personaPassed}/${h.personaTotal}`,
      label: "Guardrails hold",
      explain: "No below-floor prices; ignores planted instructions",
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Evidence"
        title="Does this tool actually work?"
        action={
          <Link
            href="/coach/health"
            className="inline-flex h-10 shrink-0 items-center rounded-md border border-accent/30 bg-accent-soft px-4 text-sm font-semibold text-accent transition hover:opacity-90"
          >
            See every test case →
          </Link>
        }
      />

      {/* Claim 1, the scorer is accurate. This is the strong evidence. */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Claim 1, the coach judges calls the way a human would
        </h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {checks.map((c) => (
            <div key={c.label} className="surface-card rounded-xl p-5">
              <div className="flex items-baseline gap-2.5">
                <p className="text-4xl font-semibold tabular-nums text-ok">
                  {c.value}
                </p>
                <p className="font-mono text-sm text-muted">{c.pass}</p>
              </div>
              <p className="mt-3 font-medium text-foreground">{c.label}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {c.explain}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Produced by <code className="font-mono">npm run eval</code>, last run{" "}
          {new Date(snapshot.generatedAt).toLocaleString()}. It re-runs on
          committed transcripts, so these numbers are reproducible rather than
          claimed.
        </p>
      </section>

      {/* Claim 2, team-wide practice improvement (all agents’ drills). */}
      <section>
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          Claim 2, reps improve with practice
          <InfoTip
            text={`Aggregated across ${agentCount} agents' scored drills (oldest → newest), not a single rep.`}
          />
        </h2>
        <p className="mt-1 text-sm text-muted">
          Aggregated across {agentCount} agents&apos; scored drills (oldest →
          newest), not a single rep.
        </p>
        <div className="mt-4 space-y-6">
          <BeforeAfterScore
            attemptCount={evidence.attemptCount}
            firstScore={evidence.firstScore}
            latestScore={evidence.latestScore}
            scoreDelta={evidence.scoreDelta}
          />
          <PriceHold
            earlyPct={evidence.holdRateEarlyPct}
            latePct={evidence.holdRateLatePct}
          />
        </div>
      </section>
    </AppShell>
  );
}

/**
 * The headline claim. Shows the direction of travel in colour and shape, so it
 * reads before the numbers do — and says plainly when there isn't enough data,
 * rather than dressing up a drop as a result.
 */
function BeforeAfterScore({
  attemptCount,
  firstScore,
  latestScore,
  scoreDelta,
}: {
  attemptCount: number;
  firstScore: number | null;
  latestScore: number | null;
  scoreDelta: number | null;
}) {
  const enough = attemptCount >= 3 && firstScore !== null && latestScore !== null;

  if (!enough) {
    return (
      <section className="surface-card rounded-xl border-l-4 border-l-warn p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-warn">
          Not enough data yet
        </p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">
          Run at least 3 drills for before/after
        </h2>
        <p className="mt-2 text-sm text-muted">
          {attemptCount} scored so far.
        </p>
      </section>
    );
  }

  const delta = scoreDelta ?? 0;
  const improved = delta > 0;
  const flat = delta === 0;
  const tone = improved
    ? { border: "border-l-ok", text: "text-ok", bar: "bg-ok" }
    : flat
      ? { border: "border-l-border", text: "text-muted", bar: "bg-muted" }
      : { border: "border-l-danger", text: "text-danger", bar: "bg-danger" };

  return (
    <section className={`surface-card rounded-xl border-l-4 ${tone.border} p-6`}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
        Score across {attemptCount} drills
      </h2>
      <p className="mt-1 text-sm text-muted">
        Each drill is marked out of 100 against six criteria.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-6 sm:gap-10">
        <ScoreBlock label="First drill" score={firstScore} />
        <span aria-hidden className="text-3xl text-border">
          →
        </span>
        <ScoreBlock label="Latest drill" score={latestScore} />

        <div className={`flex flex-col ${tone.text}`}>
          <span className="text-5xl font-semibold tabular-nums">
            {improved ? "+" : ""}
            {delta}
          </span>
          <span className="mt-1 text-sm font-medium">
            {improved
              ? "points better, out of 100"
              : flat
                ? "no change"
                : "points worse, out of 100"}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <ScoreBar label="First" score={firstScore} barClass="bg-muted" />
        <ScoreBar label="Latest" score={latestScore} barClass={tone.bar} />
      </div>

      <p className="mt-5 text-sm leading-relaxed text-muted">
        {improved
          ? `Scores rose ${delta} points from the first drill to the latest. That improvement is the product working.`
          : flat
            ? "Scores held flat between the first drill and the latest. More reps needed before the trend means anything."
            : `Scores fell ${Math.abs(delta)} points. We report this as-is rather than hiding it, with this few attempts it reflects test sessions more than real practice.`}
      </p>
    </section>
  );
}

function ScoreBlock({ label, score }: { label: string; score: number | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-5xl font-semibold tabular-nums text-foreground">
        {score ?? "n/a"}
      </p>
    </div>
  );
}

function ScoreBar({
  label,
  score,
  barClass,
}: {
  label: string;
  score: number | null;
  barClass: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-14 shrink-0 text-muted">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.min(Math.max(score ?? 0, 0), 100)}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right font-mono tabular-nums text-muted">
        {score ?? "n/a"}
      </span>
    </div>
  );
}

/**
 * Two identical bars communicate nothing, so when the rate hasn't moved the
 * card says what that actually means instead of drawing a flat chart.
 */
function PriceHold({
  earlyPct,
  latePct,
}: {
  earlyPct: number | null;
  latePct: number | null;
}) {
  if (earlyPct === null) {
    return (
      <section className="surface-card rounded-xl p-5 sm:p-6">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          Did they stop discounting?
          <InfoTip text="How often a drill ended at or near list price ,  the first half of attempts against the second half." />
        </h2>
        <p className="mt-2 text-sm text-muted">Not enough scored drills yet.</p>
      </section>
    );
  }

  const late = latePct ?? earlyPct;
  const unchanged = late === earlyPct;

  return (
    <section className="surface-card rounded-xl p-5 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
        Did they stop discounting?
        <InfoTip text="How often a drill ended at or near list price ,  the first half of attempts against the second half." />
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        How often a drill ended at or near list price — their first half of
        attempts against their second half.
      </p>

      {unchanged && earlyPct === 100 ? (
        <div className="mt-4 rounded-lg border border-border bg-background p-4">
          <p className="text-2xl font-semibold text-ok">
            Held the price every time
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            In all scored drills the price was held, first to last. There is no
            before-and-after to show here because there was never a discount to
            stop, this metric only becomes interesting once someone caves in a
            drill.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <HoldBar label="Early drills" value={earlyPct} tone="muted" />
          <HoldBar label="Later drills" value={late} tone="strong" />
          {unchanged ? (
            <p className="text-sm text-muted">
              Unchanged at {earlyPct}%, more drills needed before this means
              anything.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function HoldBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "muted" | "strong";
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-foreground">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${tone === "strong" ? "bg-ok" : "bg-muted"}`}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-mono tabular-nums text-foreground">
        {value}%
      </span>
    </div>
  );
}
