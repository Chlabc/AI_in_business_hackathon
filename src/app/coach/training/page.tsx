import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SCENARIOS } from "@/data/scenarios";

export const dynamic = "force-dynamic";

const difficultyPill: Record<string, string> = {
  Easy: "pill-ok",
  Medium: "pill-warn",
  Hard: "pill-danger",
};

export default function TrainingPage() {
  return (
    <AppShell>
      <Link href="/coach" className="text-sm text-muted hover:text-accent">
        ← Back to your diagnosis
      </Link>

      <div>
        <p className="eyebrow">Pick a situation</p>
        <h1 className="display-serif mt-2 text-3xl text-foreground lg:text-4xl">
          What do you want to practise?
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted lg:text-base">
          Each one is a real spoken call against an AI client with its own
          personality and its own way of pushing back. The starred one is picked
          from your diagnosis — start there if you&apos;re not sure.
        </p>
      </div>

      <div className="scenario-stage stagger-children grid gap-5 lg:grid-cols-2">
        {SCENARIOS.map((s) => (
          <Link
            key={s.id}
            href={`/coach/practice?scenario=${s.id}`}
            className={`card-interactive scenario-card ${s.recommended ? "scenario-card-pick" : ""}`}
          >
            {s.recommended ? (
              <span className="scenario-ribbon">★ Picked for you</span>
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
              <p className="mt-2 leading-relaxed text-muted">{s.description}</p>

              {/* The client's opening line is the most concrete thing on the
                  card — treat it as a quote, not another paragraph. */}
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
              Start this drill →
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
