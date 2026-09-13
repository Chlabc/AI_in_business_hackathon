"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "cornerman-onboarding-dismissed";

/** localStorage isn't reactive, so changes are broadcast to any mounted banner. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true; // storage blocked — stay out of the way
  }
}

/** On the server we can't know, so assume dismissed; the client corrects it on hydration. */
function getServerSnapshot(): boolean {
  return true;
}

export function OnboardingBanner({ className = "" }: { className?: string }) {
  const dismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={`surface-card flex flex-col gap-3 rounded-xl border-accent/30 bg-accent-soft p-5 sm:flex-row sm:items-start sm:justify-between ${className}`}
    >
      <div>
        <p className="text-sm font-semibold text-accent">
          New here? Here&apos;s what this page does
        </p>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-foreground">
          Below is your <strong>weakest pattern</strong>, found from your recent
          call outcomes. Hit <strong>&ldquo;Practice this now&rdquo;</strong> to
          drill it live against an AI client — you&apos;ll get scored when you
          finish, and Progress tracks whether you&apos;re improving.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md border border-accent/30 bg-card px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent-soft"
      >
        Got it
      </button>
    </div>
  );
}
