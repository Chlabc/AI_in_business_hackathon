"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DiagnosisIcon,
  DrillIcon,
  ManagerIcon,
  ScoreIcon,
} from "@/components/NavIcons";

const STEPS = [
  { label: "Diagnose", Icon: DiagnosisIcon, caption: "First, we find the pattern that's costing you deals." },
  { label: "Drill", Icon: DrillIcon, caption: "Then you practise it out loud, against a client who pushes back." },
  { label: "Score", Icon: ScoreIcon, caption: "The second you hang up, you get scored on what you actually said." },
  { label: "Track", Icon: ManagerIcon, caption: "Every attempt is saved, so you can see it actually working." },
] as const;

const CRITERIA = [
  { label: "Explored the objection", pct: 100, tone: "ok" },
  { label: "Asked clarifying questions", pct: 60, tone: "warn" },
  { label: "Held near standard fee", pct: 70, tone: "warn" },
  { label: "Used the approved play", pct: 20, tone: "danger" },
] as const;

const TREND = [42, 33, 68, 68, 79] as const;

function toneBar(tone: string) {
  if (tone === "ok") return "bg-ok";
  if (tone === "warn") return "bg-warn";
  return "bg-danger";
}

export function GuidedDemo() {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  return (
    <section className="surface-card rounded-2xl p-6 lg:p-8">
      <p className="eyebrow">See it work</p>
      <h2 className="display-serif mt-1 text-2xl text-foreground sm:text-3xl">
        Four steps. Click through — no signup.
      </h2>

      {/* step rail */}
      <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? "border-accent bg-accent-soft"
                    : done
                      ? "border-border bg-background"
                      : "border-border bg-card opacity-60 hover:opacity-100"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    active || done
                      ? "bg-accent text-accent-fg"
                      : "bg-border text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`text-sm font-medium ${active ? "text-accent" : "text-foreground"}`}
                >
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 text-sm text-muted">{STEPS[step].caption}</p>

      {/* stage */}
      <div className="mt-3 min-h-[19rem] rounded-xl border border-border bg-background p-5 sm:p-6">
        {step === 0 ? (
          <div className="border-l-4 border-danger pl-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-danger">
              The pattern costing you deals
            </p>
            <p className="display-serif mt-2 text-xl leading-snug text-foreground sm:text-2xl">
              Your fee conversations end lost or discounted — you concede before
              exploring the objection.
            </p>
            <p className="mt-3 text-sm text-muted">
              Found across <strong className="text-foreground">12 calls</strong>,
              in this demo. You ask 2.5% and settle at an average of 2.265%.
            </p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted">
              The losses behind it
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-foreground">
              <li>Alex Parker · South Melbourne — no comparison clarification (2.5% → 1.95%)</li>
              <li>Cameron Ellis · Prahran — early drop signalled desperation (2.5% → 2.25%)</li>
              <li>Riley Patel · South Yarra — broke the firm floor (2.5% → 1.75%)</li>
            </ul>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl bg-card px-4 py-2.5 text-sm text-foreground shadow-sm">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Client
                </p>
                &ldquo;Look, I&apos;ll be straight with you — your 2.5% commission is too
                high. Another agency already quoted us 1.75%. Why should I pay
                more?&rdquo;
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl bg-accent px-4 py-2.5 text-sm text-accent-fg">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">
                  You (spoken)
                </p>
                &ldquo;That&apos;s fair — what does their 1.75% actually
                include?&rdquo;
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl bg-card px-4 py-2.5 text-sm text-foreground shadow-sm">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Client
                </p>
                &ldquo;Same as you, presumably. Marketing, some inspections. So
                why the premium?&rdquo;
              </div>
            </div>
            <p className="pt-1 text-xs text-muted">
              A real spoken call — the client argues back and won&apos;t let you
              off easy.
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <div className="flex items-baseline gap-3">
              <span className="display-serif text-4xl text-ok">76</span>
              <span className="text-sm text-muted">out of 100</span>
            </div>
            <div className="mt-4 space-y-2.5">
              {CRITERIA.map((c) => (
                <div key={c.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{c.label}</span>
                    <span className="text-muted">{c.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full ${toneBar(c.tone)}`}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-md border-l-2 border-accent bg-card px-3 py-2 text-sm text-foreground">
              <strong className="font-medium">Fix next time:</strong> you moved
              to price before establishing value. Try — &ldquo;what would a bad
              hire in month two cost you?&rdquo;
            </p>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Your last 5 attempts
            </p>
            {/* No items-end on the row: the columns must stretch to h-32, or the
                bars' percentage heights resolve against a zero-height parent. */}
            <div className="mt-4 flex h-32 gap-3">
              {TREND.map((v, i) => (
                <div
                  key={i}
                  className="flex h-full flex-1 flex-col items-center gap-2"
                >
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t ${i === TREND.length - 1 ? "bg-ok" : "bg-border"}`}
                      style={{ height: `${v}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs ${i === TREND.length - 1 ? "font-semibold text-ok" : "text-muted"}`}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-foreground">
              42 → 79 across five drills, and you held the fee on the last three.
            </p>
            <p className="mt-1 text-xs text-muted">
              Private to you. Your manager only sees this if you share it.
            </p>
          </div>
        ) : null}
      </div>

      {/* controls */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-sm font-medium text-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Back
        </button>

        {isLast ? (
          <Link
            href="/coach/practice"
            className="btn-lift inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-fg transition hover:opacity-90"
          >
            Now try it for real ›
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="btn-lift inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-fg transition hover:opacity-90"
          >
            Next: {STEPS[step + 1].label} ›
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Walkthrough uses the same session data you&apos;ll see after you sign
        in.
      </p>
    </section>
  );
}
