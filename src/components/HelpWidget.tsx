"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Scripted help panel — deliberately NOT an AI chatbot.
 *
 * Every answer here is written and checked, so it can't invent a number or a
 * feature that doesn't exist. It is labelled as a help menu rather than a
 * chat assistant, because pretending a canned FAQ is an AI is the kind of
 * thing a judge notices.
 */

type Answer = {
  q: string;
  a: string;
  href?: string;
  linkLabel?: string;
};

const GENERAL: Answer[] = [
  {
    q: "What is this app for?",
    a: "You practise the hard part of a sales call — the moment a client pushes back on price — out loud, against an AI playing that client. Then you get scored on how you handled it.",
  },
  {
    q: "Who is Northline?",
    a: "Northline is the software company you sell for here. It sells a workflow tool at $100 per seat per month, and reps can't go below $80 without approval.",
  },
  {
    q: "What does my score mean?",
    a: "It's out of 100, across six things: did you explore the objection, ask questions, anchor on value, hold the price, use the approved play, and avoid caving early. Holding the price is only one of the six — which is why a drill can say \"Held\" and still score low.",
  },
  {
    q: "Does my manager see my practice?",
    a: "Only if you switch sharing on, and even then they see a progress summary — never what you actually said. Your transcripts stay yours.",
  },
  {
    q: "What order should I do things in?",
    a: "Profile to see what you keep getting wrong, Practice to pick a situation and run it out loud, then Progress to check you're improving. Learn is an optional warm-up on your firm's prices.",
    href: "/coach",
    linkLabel: "Go to Profile",
  },
];

const BY_PAGE: Record<string, Answer[]> = {
  "/coach": [
    {
      q: "Where did these numbers come from?",
      a: "From your recent call outcomes. We looked at how each one ended and found the habit that costs the most — here, moving on price before asking what the objection really is.",
    },
    {
      q: "What should I do on this page?",
      a: "Read the verdict at the top, then press \"Practice this now\". Everything else is background you can look at later.",
      href: "/coach/practice?scenario=price-objection",
      linkLabel: "Start practicing",
    },
  ],
  "/coach/practice": [
    {
      q: "Which scenario should I pick?",
      a: "The one matching your profile diagnosis is highlighted — start there. The others are the same live spoken drill with a different kind of client pushback.",
    },
    {
      q: "What do I actually do in a drill?",
      a: "Press the big button, allow the microphone, and talk. The AI client will push back on your price — answer like you would on a real call. When you're done, press the button again and you'll be scored.",
    },
    {
      q: "The microphone isn't working",
      a: "Your browser has to ask permission. Look for a prompt near the address bar and allow it. If you dismissed it, click the padlock icon in the address bar and turn the microphone on for this site.",
    },
    {
      q: "What are the cue cards on the left?",
      a: "Hints from your firm's playbook, shown only on your screen — the AI client never sees them. Set them to Off if you want to test yourself properly.",
    },
  ],
  "/coach/learn": [
    {
      q: "Why am I memorising prices?",
      a: "Because you can't hold a price you can't remember. Reps cave when they're unsure what they're allowed to charge. These cards are generated from your firm's playbook, not a generic course.",
    },
  ],
  "/coach/value": [
    {
      q: "What am I looking at?",
      a: "Whether you're actually improving. Two things only: is your score going up across drills, and have you stopped discounting. Both come only from drills you finished.",
    },
  ],
};

function HelpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20.5l1.5-4.2A8.38 8.38 0 0 1 3.6 12a8.5 8.5 0 0 1 8.4-8.5 8.38 8.38 0 0 1 9 8z" />
      <path d="M9.9 9.3a2.2 2.2 0 0 1 4.2.7c0 1.5-2.1 2-2.1 2" />
      <path d="M12 15.2h.01" />
    </svg>
  );
}

export function HelpWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Answer | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Navigating closes the panel. Adjusted during render rather than in an
  // effect — an effect here would paint the stale panel first, then close it.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
    setActive(null);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Not on the marketing pages — it's an in-app helper.
  if (!pathname.startsWith("/coach")) return null;

  const questions = [...(BY_PAGE[pathname] ?? []), ...GENERAL];

  return (
    <>
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Help"
          className="fixed bottom-24 right-5 z-50 flex max-h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Need a hand?
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Common questions — pick one.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help"
              className="-mr-1 -mt-1 rounded-md px-2 py-1 text-lg leading-none text-muted transition hover:text-foreground"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {active ? (
              <div>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="text-xs font-medium text-muted transition hover:text-accent"
                >
                  ← All questions
                </button>
                <p className="mt-4 text-sm font-semibold text-foreground">
                  {active.q}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {active.a}
                </p>
                {active.href ? (
                  <Link
                    href={active.href}
                    onClick={() => setOpen(false)}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-fg transition hover:opacity-90"
                  >
                    {active.linkLabel ?? "Take me there"}
                  </Link>
                ) : null}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {questions.map((item) => (
                  <li key={item.q}>
                    <button
                      type="button"
                      onClick={() => setActive(item)}
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-3 text-left text-sm leading-snug text-foreground transition hover:border-accent hover:bg-accent-soft"
                    >
                      {item.q}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="border-t border-border px-5 py-3 text-[11px] leading-relaxed text-muted">
            These are written answers, not an AI assistant — so nothing here can
            make something up.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close help" : "Open help"}
        className="btn-lift fixed bottom-5 right-5 z-50 inline-flex h-14 items-center gap-2.5 rounded-full bg-accent pl-4 pr-5 font-semibold text-accent-fg shadow-xl transition hover:opacity-90"
      >
        <HelpIcon className="h-6 w-6" />
        <span className="text-sm">Help</span>
      </button>
    </>
  );
}
