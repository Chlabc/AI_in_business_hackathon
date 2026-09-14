"use client";

import { useEffect } from "react";
import { isBenignElevenLabsError } from "@/lib/elevenlabs-errors";

/**
 * ElevenLabs WebRTC occasionally logs empty / hangup noise such as
 * `error reading from signal stream {}` or `Server error: Unknown error {}`.
 * Firefox also surfaces teardown as `NetworkError when attempting to fetch resource`
 * which Next.js shows as a Runtime TypeError overlay — swallow only those benign cases.
 */
export function SignalStreamGuard() {
  useEffect(() => {
    const original = console.error;
    console.error = (...args: unknown[]) => {
      if (isBenignElevenLabsError(...args)) return;
      original.apply(console, args as Parameters<typeof console.error>);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (isBenignElevenLabsError(event.reason)) {
        event.preventDefault();
      }
    };
    const onError = (event: ErrorEvent) => {
      if (isBenignElevenLabsError(event.message, event.error)) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);

    return () => {
      console.error = original;
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
