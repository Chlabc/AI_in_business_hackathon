import { AppShell } from "@/components/AppShell";
import { CalibrationPanel } from "@/components/CalibrationPanel";
import { ConversionChart } from "@/components/ConversionChart";
import { LeaveNoteButton } from "@/components/LeaveNoteButton";
import { ManagerReportPdfButton } from "@/components/ManagerReportPdfButton";
import { PageHeader } from "@/components/PageHeader";
import { FIRM, DEMO_REP_ID, getRep } from "@/data/seed";
import { TEAM, TEAM_AVERAGE_CONVERSION } from "@/data/team";
import { getSession } from "@/lib/auth";
import { listAttempts, practiceKpisFromAttempts } from "@/lib/attempts";
import { listGuidance } from "@/lib/agency-guidance";
import { getShareSettings } from "@/lib/share";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const session = await getSession();
  const rep = getRep(DEMO_REP_ID);
  const share = await getShareSettings(DEMO_REP_ID);
  const attempts = await listAttempts(DEMO_REP_ID);
  const practice = practiceKpisFromAttempts(attempts);
  const guidance = await listGuidance();
  const liveAe = TEAM.find((t) => t.id === DEMO_REP_ID)!;
  const liveAeWithSessions = {
    ...liveAe,
    sessionsCompleted: Math.max(liveAe.sessionsCompleted, practice.attempts),
  };
  const teamForPdf = TEAM.map((e) =>
    e.id === DEMO_REP_ID ? liveAeWithSessions : e,
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Team"
        title="Team overview"
        description="Development tool, not surveillance. Alex's practice summary only appears when they choose to share it."
        action={
          <ManagerReportPdfButton
            managerName={session?.name ?? "Manager"}
            firmLabel={`${FIRM.name} · ${FIRM.vertical}`}
            teamAverageConversion={TEAM_AVERAGE_CONVERSION}
            team={teamForPdf}
            focusRepName={rep?.name ?? liveAe.name}
            share={{
              shareProgressWithManager: share.shareProgressWithManager,
              updatedAt: share.updatedAt,
            }}
            practice={{
              attempts: practice.attempts,
              lastScore: practice.lastScore,
              feeHoldRate: practice.feeHoldRate,
              trendLabel: practice.trendLabel,
            }}
          />
        }
      />

      <section className="surface-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Listing conversion</th>
                <th className="px-5 py-3 font-medium">Weakest skill</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Sessions</th>
                <th className="px-5 py-3 font-medium">Coach</th>
              </tr>
            </thead>
            <tbody>
              {TEAM.map((e) => {
                const row = e.id === DEMO_REP_ID ? liveAeWithSessions : e;
                return (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium text-foreground">
                      {row.name}
                      <div className="text-xs text-muted">{row.role}</div>
                    </td>
                    <td className="px-5 py-3">
                      {row.conversionRate}%
                      <span className="ml-1 text-xs text-muted">
                        (team {TEAM_AVERAGE_CONVERSION}%)
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">{row.weakestSkill}</td>
                    <td className="px-5 py-3">
                      {row.flagged ? (
                        <span className="rounded border border-danger/30 bg-danger-soft px-2 py-0.5 text-xs text-danger">
                          Flagged for training
                        </span>
                      ) : (
                        <span className="rounded border border-ok/30 bg-ok-soft px-2 py-0.5 text-xs text-ok">
                          On track
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">{row.sessionsCompleted}</td>
                    <td className="px-5 py-3">
                      <LeaveNoteButton repId={row.id} repName={row.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-card rounded-xl p-6">
          <ConversionChart
            data={liveAe.kpiHistory}
            label={`${liveAe.name} — listing conversion`}
          />
          <p className="mt-2 text-xs text-muted">
            Illustrative measurement alongside training — not proof that
            training alone caused the change.
          </p>
        </section>

        <section className="surface-card rounded-xl p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {rep?.name ?? "Alex"} — shared practice summary
          </h2>
          {!share.shareProgressWithManager ? (
            <div className="mt-4 rounded-lg border border-accent/30 bg-accent-soft p-5">
              <p className="font-medium text-foreground">Access blocked</p>
              <p className="mt-2 text-sm text-muted">
                Rep has not shared progress. Practice stays private until they
                toggle sharing on their coach page.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted">Attempts</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {practice.attempts}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted">Last score</p>
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
              <p className="text-sm text-muted">{practice.trendLabel}</p>
              <p className="text-xs text-muted">
                Transcripts intentionally omitted. Shared{" "}
                {new Date(share.updatedAt).toLocaleString()}.
              </p>
            </div>
          )}
        </section>
      </div>

      <CalibrationPanel
        attempts={attempts}
        repName={rep?.name ?? "Your team"}
        initialGuidance={guidance}
      />
    </AppShell>
  );
}
