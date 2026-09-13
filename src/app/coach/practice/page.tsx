import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PracticeBriefing } from "@/components/PracticeBriefing";
import { PracticeSession } from "@/components/PracticeSession";
import { SCENARIOS, getScenario } from "@/data/scenarios";
import { DEMO_REP_ID, FIRM } from "@/data/seed";
import { requireRole } from "@/lib/auth";
import colors from "@/app/coach/coach.module.css";
import { diagnoseRep, getRepDashboard } from "@/lib/diagnosis";
import { getPlaybook, getPlaybookTalkTrack } from "@/lib/playbook";
import { applyPlaybookToScenario } from "@/lib/scenario-session";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ scenario?: string }>;
};

const difficultyPill: Record<string, string> = {
  Easy: "pill-ok",
  Medium: "pill-warn",
  Hard: "pill-danger",
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

export default async function PracticePage({ searchParams }: Props) {
  const user = await requireRole("employee");
  const repId = user.repId ?? DEMO_REP_ID;
  const params = await searchParams;
  const scenarioId = params.scenario?.trim() || null;
  const playbook = await getPlaybook();
  const diagnosis = diagnoseRep(repId);
  const dash = getRepDashboard(repId);

  // No scenario chosen → verdict + briefing + picker. With ?scenario= → live drill.
  if (!scenarioId) {
    const track =
      getPlaybookTalkTrack(
        playbook,
        diagnosis?.primaryObjection ?? "fee",
      ) ?? playbook.talkTracks[0];

    const recommendedId =
      SCENARIOS.find(
        (s) =>
          diagnosis?.primaryObjection &&
          s.objectionType === diagnosis.primaryObjection,
      )?.id ??
      SCENARIOS.find((s) => s.recommended)?.id ??
      SCENARIOS[0]?.id;

    const sorted = [...SCENARIOS].sort((a, b) => {
      if (a.id === recommendedId) return -1;
      if (b.id === recommendedId) return 1;
      return 0;
    });

    return (
      <AppShell>
        <div>
          <p className="eyebrow">Practice</p>
          <h1 className="display-serif mt-2 text-3xl text-foreground lg:text-4xl">
            What do you want to practise?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted lg:text-base">
            Start from the pattern costing you deals, review the approved play,
            then pick a situation. The highlighted card matches that diagnosis.
          </p>
        </div>

        {diagnosis && dash ? (
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
                {dash.kpis.callsAnalysed} calls
              </strong>
              , with {diagnosis.confidence} confidence. It shows up most in the{" "}
              <strong className="font-medium text-foreground">
                {label(diagnosis.primaryStage)}
              </strong>{" "}
              part of the conversation.
            </p>
          </section>
        ) : null}

        {track ? (
          <PracticeBriefing
            firmName={playbook.firmName || FIRM.name}
            listPct={playbook.standardPermFeePct}
            floorPct={playbook.feeFloorPct}
            talkTrack={track}
            whyThis={
              diagnosis
                ? `your profile flags ${label(diagnosis.primaryObjection)} in the ${label(diagnosis.primaryStage)} stage`
                : null
            }
          />
        ) : null}

        <div className="scenario-stage stagger-children grid gap-5 lg:grid-cols-2">
          {sorted.map((s) => {
            const picked = s.id === recommendedId;
            return (
              <Link
                key={s.id}
                href={`/coach/practice?scenario=${s.id}`}
                className={`card-interactive scenario-card ${picked ? "scenario-card-pick" : ""}`}
              >
                {picked ? (
                  <span className="scenario-ribbon">
                    ★ Recommended from your profile
                  </span>
                ) : null}

                <div>
                  <span
                    className={`pill ${difficultyPill[s.difficulty] ?? "pill-neutral"}`}
                  >
                    {s.difficulty}
                  </span>
                  <h2 className="display-serif mt-3 text-2xl leading-tight text-foreground">
                    {s.title}
                  </h2>
                  <p className="mt-2 leading-relaxed text-muted">
                    {s.description}
                  </p>

                  <blockquote className="scenario-quote">
                    <span className="scenario-quote-mark" aria-hidden>
                      “
                    </span>
                    {s.openingLine}
                  </blockquote>

                  <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    <div>
                      <dt className="uppercase tracking-[0.12em] text-muted">
                        You&apos;ll practise
                      </dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {s.skill}
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-[0.12em] text-muted">
                        You&apos;ll be talking to
                      </dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {s.customerPersona}
                      </dd>
                    </div>
                  </dl>
                </div>

                <span className="btn-lift mt-6 inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-fg">
                  {picked ? "Start recommended drill →" : "Start this drill →"}
                </span>
              </Link>
            );
          })}
        </div>
      </AppShell>
    );
  }

  const baseScenario = getScenario(scenarioId);
  const scenario = applyPlaybookToScenario(baseScenario, playbook);
  const track = getPlaybookTalkTrack(playbook, scenario.objectionType);

  const headline =
    scenario.id === "price-objection"
      ? (diagnosis?.headline ??
        "Drill the price conversation — your diagnosed weak spot.")
      : `${scenario.skill}: ${scenario.description}`;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/coach" className="text-muted transition hover:text-accent">
            ← Profile
          </Link>
          <Link
            href="/coach/practice"
            className="text-muted transition hover:text-accent"
          >
            All scenarios
          </Link>
        </div>
        <span className="rounded border border-border bg-card px-3 py-1 text-xs text-muted">
          {scenario.title} · {scenario.difficulty}
        </span>
      </div>

      <div>
        <p className="eyebrow">Live practice</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
          {scenario.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted lg:text-base">
          {scenario.description} Use cue mode Off / Soft / Full for reactive
          coach cards. After scoring, use{" "}
          <strong className="font-medium text-foreground">Practice again</strong>{" "}
          or pick another scenario.
        </p>
      </div>

      <PracticeSession
        key={scenario.id}
        scenario={scenario}
        track={track}
        standardFeePct={playbook.standardPermFeePct}
        feeFloorPct={playbook.feeFloorPct}
        diagnosisHeadline={headline}
      />
    </AppShell>
  );
}
