import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PracticeBriefing } from "@/components/PracticeBriefing";
import { PracticeSession } from "@/components/PracticeSession";
import { SCENARIOS, getScenario } from "@/data/scenarios";
import { DEMO_REP_ID, FIRM } from "@/data/seed";
import { requireRole } from "@/lib/auth";
import { diagnoseRep } from "@/lib/diagnosis";
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

export default async function PracticePage({ searchParams }: Props) {
  const user = await requireRole("employee");
  const repId = user.repId ?? DEMO_REP_ID;
  const params = await searchParams;
  const scenarioId = params.scenario?.trim() || null;
  const playbook = await getPlaybook();
  const diagnosis = diagnoseRep(repId);

  // No scenario chosen → briefing + picker. With ?scenario= → live drill.
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
            Review the approved play for your weak spot, then pick a situation.
            The highlighted card matches your profile diagnosis.
          </p>
        </div>

        {track ? (
          <PracticeBriefing
            firmName={playbook.firmName || FIRM.name}
            listPct={playbook.standardPermFeePct}
            floorPct={playbook.feeFloorPct}
            talkTrack={track}
            whyThis={
              diagnosis
                ? `your profile flags ${diagnosis.primaryObjection.replaceAll("_", " ")} in the ${diagnosis.primaryStage.replaceAll("_", " ")} stage`
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
