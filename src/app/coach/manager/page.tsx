import { AppShell } from "@/components/AppShell";
import { ConversionChart } from "@/components/ConversionChart";
import { PracticeLogsSection } from "@/components/PracticeLogsSection";
import { LeaveNoteButton } from "@/components/LeaveNoteButton";
import { ManagerReportPdfButton } from "@/components/ManagerReportPdfButton";
import { PageHeader } from "@/components/PageHeader";
import { FIRM, DEMO_REP_ID, getRep } from "@/data/seed";
import { TEAM, TEAM_AVERAGE_CONVERSION } from "@/data/team";
import { getSession } from "@/lib/auth";
import { listAttempts, practiceKpisFromAttempts } from "@/lib/attempts";
import { getShareSettings } from "@/lib/share";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const session = await getSession();
  const rep = getRep(DEMO_REP_ID);

  const teamRows = await Promise.all(
    TEAM.map(async (member) => {
      const [share, attempts] = await Promise.all([
        getShareSettings(member.id),
        listAttempts(member.id),
      ]);
      const practice = practiceKpisFromAttempts(attempts);
      return {
        member: {
          ...member,
          // Live drills win over static demo session counts / skill labels.
          sessionsCompleted: Math.max(
            member.sessionsCompleted,
            practice.attempts,
          ),
          weakestSkill:
            practice.weakestCriterionLabel ?? member.weakestSkill,
          // Show drill hold rate in the conversion column when we have attempts.
          conversionRate:
            practice.feeHoldRate !== null
              ? practice.feeHoldRate
              : member.conversionRate,
        },
        share,
        practice,
        fromDrills: practice.attempts > 0,
      };
    }),
  );

  const alexRow = teamRows.find((r) => r.member.id === DEMO_REP_ID)!;
  const teamForPdf = teamRows.map((r) => r.member);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Team"
        title="Team overview"
        action={
          <ManagerReportPdfButton
            managerName={session?.name ?? "Manager"}
            firmLabel={`${FIRM.name} · ${FIRM.vertical}`}
            teamAverageConversion={TEAM_AVERAGE_CONVERSION}
            team={teamForPdf}
            focusRepName={rep?.name ?? alexRow.member.name}
            share={{
              shareProgressWithManager:
                alexRow.share.shareProgressWithManager,
              updatedAt: alexRow.share.updatedAt,
            }}
            practice={{
              attempts: alexRow.practice.attempts,
              lastScore: alexRow.practice.lastScore,
              feeHoldRate: alexRow.practice.feeHoldRate,
              trendLabel: alexRow.practice.trendLabel,
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
                <th className="px-5 py-3 font-medium">
                  Hold rate (drills)
                </th>
                <th className="px-5 py-3 font-medium">Weakest skill</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Sessions</th>
                <th className="px-5 py-3 font-medium">Coach</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map(({ member: row, fromDrills }) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium text-foreground">
                    {row.name}
                    <div className="text-xs text-muted">{row.role}</div>
                  </td>
                  <td className="px-5 py-3">
                    {row.conversionRate}%
                    <span className="ml-1 text-xs text-muted">
                      {fromDrills
                        ? "of drills held fee"
                        : "demo placeholder"}
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
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <PracticeLogsSection
        agents={TEAM.map((t) => ({ id: t.id, name: t.name }))}
        initialRepId={DEMO_REP_ID}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-card rounded-xl p-6">
          <ConversionChart
            data={(() => {
              const maxLen = Math.max(
                0,
                ...teamRows.map((r) => r.practice.trend.length),
              );
              return Array.from({ length: maxLen }, (_, i) => {
                const point: {
                  label: string;
                  [key: string]: string | number | undefined;
                } = { label: `#${i + 1}` };
                for (const row of teamRows) {
                  const t = row.practice.trend[i];
                  if (t) point[row.member.id] = t.score;
                }
                return point;
              });
            })()}
            label="Team drill score trend"
            series={teamRows.map((r) => ({
              key: r.member.id,
              name: r.member.name.split(/\s+/)[0] ?? r.member.name,
            }))}
            yDomain={[0, 100]}
          />
          <p className="mt-2 text-xs text-muted">
            Each line is one agent&apos;s scored drills (oldest → newest). Gaps
            mean that agent has fewer attempts so far.
          </p>
        </section>

        <section className="surface-card rounded-xl p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Shared practice summaries
          </h2>
          <div className="mt-4 space-y-4">
            {teamRows.map(({ member, share, practice }) => (
              <div
                key={member.id}
                className="rounded-lg border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {member.name}
                  </h3>
                  <span className="text-xs text-muted">{member.role}</span>
                </div>
                {!share.shareProgressWithManager ? (
                  <div className="mt-3 rounded-md border border-accent/30 bg-accent-soft px-3 py-2">
                    <p className="text-sm font-medium text-foreground">
                      Access blocked
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {member.name.split(/\s+/)[0]} has not shared progress.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-md border border-border bg-card p-2.5">
                        <p className="text-[11px] text-muted">Attempts</p>
                        <p className="mt-0.5 text-xl font-semibold">
                          {practice.attempts}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-card p-2.5">
                        <p className="text-[11px] text-muted">Last score</p>
                        <p className="mt-0.5 text-xl font-semibold">
                          {practice.lastScore ?? "-"}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-card p-2.5">
                        <p className="text-[11px] text-muted">Price hold</p>
                        <p className="mt-0.5 text-xl font-semibold">
                          {practice.feeHoldRate === null
                            ? ", "
                            : `${practice.feeHoldRate}%`}
                        </p>
                      </div>
                    </div>
                    {practice.weakestCriterionLabel ? (
                      <p className="text-xs text-muted">
                        Weakest in drills:{" "}
                        <span className="font-medium text-foreground">
                          {practice.weakestCriterionLabel}
                        </span>
                        {practice.avgScore !== null
                          ? ` · avg ${practice.avgScore}/100`
                          : null}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted">{practice.trendLabel}</p>
                    <p className="text-[11px] text-muted">
                      Shared{" "}
                      {new Date(share.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
