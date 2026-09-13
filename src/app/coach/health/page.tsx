import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import type { EvalCaseRow } from "@/lib/eval-snapshot";
import { loadEvalSnapshot } from "@/lib/load-eval-snapshot";

// Must be dynamic: AppShell reads the session cookie. A static bake of this
// page left a logged-out header and flipped Sign out → Sign in on this tab.
export const dynamic = "force-dynamic";

function CaseTable({
  title,
  rows,
}: {
  title: string;
  rows: EvalCaseRow[];
}) {
  const passed = rows.filter((r) => r.pass).length;
  return (
    <section className="surface-card overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted">
          {passed}/{rows.length} passed
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-header text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2 font-medium sm:px-5">Case</th>
              <th className="px-4 py-2 font-medium">Result</th>
              <th className="px-4 py-2 font-medium sm:px-5">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 align-top sm:px-5">
                  <div className="font-medium text-foreground">{row.id}</div>
                  <div className="text-xs text-muted">{row.label}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.pass
                        ? "bg-accent-soft text-accent"
                        : "bg-card text-muted"
                    }`}
                  >
                    {row.pass ? "Pass" : "Fail"}
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-muted sm:px-5">
                  {row.detail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function HealthPage() {
  const snapshot = loadEvalSnapshot();
  const h = snapshot.headlines;
  const cards = [
    {
      label: "Diagnosis accuracy",
      value: `${h.diagnosisPassed}/${h.diagnosisTotal}`,
      sub: h.diagnosisPct,
      emphasize: true,
    },
    {
      label: "Scoring vs human agreement",
      value: `${h.scoringOverallAgree}/${h.scoringTotal}`,
      sub: `${h.scoringOverallPct} · band ±${snapshot.overallAgreementBand}`,
      emphasize: true,
    },
    {
      label: "Held-fee agreement",
      value: `${h.scoringHeldAgree}/${h.scoringTotal}`,
      sub: h.scoringHeldPct,
    },
    {
      label: "Guardrails",
      value: `${h.personaPassed}/${h.personaTotal}`,
      sub: h.personaPct,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Health"
        title="Does the coaching loop actually work?"

        action={
          <>
            <Link
              href="/coach/value"
              className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:border-accent"
            >
              Back
            </Link>
            <p className="inline-flex h-10 items-center text-xs text-muted">
              Generated{" "}
              <time dateTime={snapshot.generatedAt} className="ml-1">
                {new Date(snapshot.generatedAt).toLocaleString()}
              </time>
            </p>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`surface-card rounded-xl px-4 py-4 ${
              card.emphasize ? "border-accent/40 bg-accent-soft" : ""
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-muted">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-muted">{card.sub}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <CaseTable title="Diagnosis accuracy" rows={snapshot.diagnosis} />
        <CaseTable title="Persona / guardrails" rows={snapshot.persona} />
      </div>

      <CaseTable title="Scoring vs human agreement" rows={snapshot.scoring} />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card rounded-xl px-4 py-5 sm:px-5">
          <h2 className="text-lg font-semibold text-foreground">Method</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {snapshot.method.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-accent">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-foreground">
            Reproduce:{" "}
            <code className="rounded bg-card px-1.5 py-0.5 text-xs">
              {snapshot.reproduce}
            </code>
          </p>
        </div>
        <div className="surface-card rounded-xl px-4 py-5 sm:px-5">
          <h2 className="text-lg font-semibold text-foreground">
            Known limits
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {snapshot.knownLimits.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-accent">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
