"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Flashcard, QuizQuestion } from "@/lib/learn";

type Phase = "study" | "quiz" | "done";

type LearnModuleProps = {
  firmName: string;
  cards: Flashcard[];
  questions: QuizQuestion[];
};

export function LearnModule({ firmName, cards, questions }: LearnModuleProps) {
  const [phase, setPhase] = useState<Phase>("study");
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const card = cards[cardIndex];
  // Wrap both ways so the deck is a loop with no dead ends.
  const prevOf = cards[(cardIndex - 1 + cards.length) % cards.length];
  const nextOf = cards[(cardIndex + 1) % cards.length];
  const question = questions[qIndex];
  const score = useMemo(() => {
    let n = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correctId) n += 1;
    }
    return n;
  }, [answers, questions]);

  // The deck loops, so the last card's "next" is the first one again.
  function nextCard() {
    setFlipped(false);
    setCardIndex((i) => (i + 1) % cards.length);
  }

  function prevCard() {
    setFlipped(false);
    setCardIndex((i) => (i - 1 + cards.length) % cards.length);
  }

  function checkAnswer() {
    if (!question || !selected || answers[question.id]) return;
    setAnswers((prev) => ({ ...prev, [question.id]: selected }));
  }

  function goNextQuestion() {
    if (!question || !answers[question.id]) return;
    if (qIndex >= questions.length - 1) {
      setPhase("done");
      return;
    }
    setQIndex((i) => i + 1);
    setSelected(null);
  }

  if (phase === "study" && card) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Study</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">
              Firm facts — {firmName}
            </h2>
            <p className="mt-2 text-sm text-muted">
              Card {cardIndex + 1} of {cards.length}. Flip, then continue. Quiz
              unlocks when you&apos;re ready.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPhase("quiz");
              setQIndex(0);
              setSelected(null);
              setAnswers({});
            }}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
          >
            Start 5-question quiz
          </button>
        </div>

        {/* A looping deck: previous peeks on the left, next on the right, both
            scaled down, faded and behind. Only the centre card is interactive;
            the neighbours are decoration and are hidden from assistive tech,
            since their text is read properly once they become the centre. */}
        <div className="deck">
          <div className="deck-slot deck-prev" aria-hidden>
            <DeckFace text={prevOf.front} tag={prevOf.tag} />
          </div>
          <div className="deck-slot deck-next" aria-hidden>
            <DeckFace text={nextOf.front} tag={nextOf.tag} />
          </div>

          <div className="deck-slot deck-current">
            {/* Same flip mechanic as EmployeeCredential: faces rotate on their
                own (no preserve-3d parent); visibility swaps mid-spin. */}
            <div className="flashcard">
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="flashcard-control"
                aria-label={
                  flipped ? "Hide the answer" : `Show the answer: ${card.front}`
                }
              />
              <div
                className={`flashcard-rotor${flipped ? " flashcard-flipped" : ""}`}
              >
                <div className="flashcard-face" aria-hidden={flipped}>
                  <span className="pill pill-accent w-fit">{card.tag}</span>
                  <p className="text-lg font-medium leading-relaxed sm:text-2xl">
                    {card.front}
                  </p>
                  <span className="inline-flex h-11 w-fit items-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-fg">
                    Show the answer
                  </span>
                </div>
                <div
                  className="flashcard-face flashcard-back"
                  aria-hidden={!flipped}
                >
                  <span className="pill pill-ok w-fit">Answer</span>
                  <p className="text-lg font-medium leading-relaxed sm:text-2xl">
                    {card.back}
                  </p>
                  <span className="inline-flex h-11 w-fit items-center rounded-full border border-border bg-card px-6 text-sm font-semibold text-muted">
                    Flip back
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={prevCard}
            aria-label="Previous card"
            className="deck-arrow"
          >
            ←
          </button>
          <div className="flex flex-wrap justify-center gap-1.5">
            {cards.map((c, i) => (
              <span
                key={c.id}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${
                  i === cardIndex ? "w-5 bg-accent" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={nextCard}
            aria-label="Next card"
            className="deck-arrow"
          >
            →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "quiz" && question) {
    const locked = Boolean(answers[question.id]);
    const picked = answers[question.id] ?? selected;
    const isCorrect = locked && answers[question.id] === question.correctId;
    const correctLabel =
      question.options.find((o) => o.id === question.correctId)?.label ?? "";

    return (
      <div className="flex flex-col gap-6">
        <div>
          <p className="eyebrow">Quiz</p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">
            Question {qIndex + 1} of {questions.length}
          </h2>
          <p className="mt-2 text-base text-foreground">{question.prompt}</p>
        </div>

        <ul className="grid gap-2">
          {question.options.map((opt) => {
            const isSel = picked === opt.id;
            const isRight = opt.id === question.correctId;
            let tone =
              "border-border bg-card text-muted hover:border-accent hover:text-foreground";
            if (locked) {
              if (isRight) {
                tone = "border-ok/50 bg-ok-soft text-foreground";
              } else if (isSel) {
                tone = "border-danger/50 bg-danger-soft text-foreground";
              } else {
                tone = "border-border bg-card text-muted opacity-60";
              }
            } else if (isSel) {
              tone = "border-accent bg-accent-soft text-foreground";
            }
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setSelected(opt.id)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${tone}`}
                >
                  {opt.label}
                  {locked && isRight ? (
                    <span className="ml-2 text-xs font-semibold text-ok">
                      Correct
                    </span>
                  ) : null}
                  {locked && isSel && !isRight ? (
                    <span className="ml-2 text-xs font-semibold text-danger">
                      Your answer
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {locked ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              isCorrect
                ? "border-ok/40 bg-ok-soft text-foreground"
                : "border-danger/40 bg-danger-soft text-foreground"
            }`}
            role="status"
          >
            <p className="font-semibold">
              {isCorrect ? "Correct" : "Not quite"}
            </p>
            {!isCorrect ? (
              <p className="mt-1 text-muted">
                Correct answer:{" "}
                <span className="font-medium text-foreground">
                  {correctLabel}
                </span>
              </p>
            ) : null}
            <p className="mt-2 leading-relaxed text-muted">{question.explain}</p>
          </div>
        ) : null}

        {!locked ? (
          <button
            type="button"
            disabled={!selected}
            onClick={checkAnswer}
            className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-40"
          >
            Check answer
          </button>
        ) : (
          <button
            type="button"
            onClick={goNextQuestion}
            className="w-fit rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
          >
            {qIndex >= questions.length - 1
              ? "See results"
              : "Next question"}
          </button>
        )}
      </div>
    );
  }

  // done
  const missed = questions.filter((q) => answers[q.id] !== q.correctId);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Results</p>
        <h2 className="mt-1 text-2xl font-semibold text-foreground">
          {score}/{questions.length} correct
        </h2>
        <p className="mt-2 text-sm text-muted">
          {score === questions.length
            ? "Sharp — take that into a live drill."
            : "Review the misses, then drill the price objection while it’s fresh."}
        </p>
      </div>

      <section className="surface-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground">Summary</h3>
        <ul className="mt-3 space-y-3">
          {questions.map((q) => {
            const gotIt = answers[q.id] === q.correctId;
            const pickedLabel =
              q.options.find((o) => o.id === answers[q.id])?.label ?? "—";
            const correctLabel =
              q.options.find((o) => o.id === q.correctId)?.label ?? "—";
            return (
              <li key={q.id} className="border-t border-border pt-3 text-sm first:border-t-0 first:pt-0">
                <p className="font-medium text-foreground">{q.prompt}</p>
                <p className="mt-1">
                  <span
                    className={
                      gotIt
                        ? "font-semibold text-ok"
                        : "font-semibold text-danger"
                    }
                  >
                    {gotIt ? "Correct" : "Missed"}
                  </span>
                  {!gotIt ? (
                    <span className="text-muted">
                      {" "}
                      · you chose {pickedLabel} · answer was {correctLabel}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-muted">{q.explain}</p>
              </li>
            );
          })}
        </ul>
        {missed.length === 0 ? (
          <p className="mt-3 text-sm text-ok">All five correct — nice work.</p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/coach/practice?scenario=price-objection"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
        >
          Start a drill
        </Link>
        <button
          type="button"
          onClick={() => {
            setPhase("study");
            setCardIndex(0);
            setFlipped(false);
            setQIndex(0);
            setSelected(null);
            setAnswers({});
          }}
          className="rounded-md border border-border px-4 py-2 text-sm"
        >
          Study again
        </button>
      </div>
    </div>
  );
}

/** A neighbouring card in the deck — same material, no flip, no interaction. */
function DeckFace({ text, tag }: { text: string; tag: string }) {
  return (
    <div className="flashcard">
      <div className="flashcard-face">
        <span className="pill pill-accent w-fit">{tag}</span>
        <p className="text-lg font-medium leading-relaxed sm:text-2xl">
          {text}
        </p>
      </div>
    </div>
  );
}
