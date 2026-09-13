"use client";

import { useState } from "react";

type ShareControlsProps = {
  /** Page-scoped presentation hook; persistence behaviour stays here. */
  className?: string;
  initialShared: boolean;
  repId: string;
};

export function ShareControls({
  className = "",
  initialShared,
  repId,
}: ShareControlsProps) {
  const [shared, setShared] = useState(initialShared);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !shared;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/practice/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repId,
          shareProgressWithManager: next,
        }),
      });
      const data = (await res.json()) as {
        shareProgressWithManager?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to update share");
      setShared(Boolean(data.shareProgressWithManager));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update share");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`surface-card rounded-xl p-5 ${className}`}>
      <h2 className="text-lg font-semibold text-foreground">
        Sharing with manager
      </h2>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className={`inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold transition disabled:opacity-60 ${
            shared
              ? "border border-ok/40 bg-ok-soft text-ok"
              : "border border-border bg-background text-foreground hover:border-accent"
          }`}
        >
          {saving
            ? "Saving…"
            : shared
              ? "Sharing progress · click to make private"
              : "Private · click to share progress"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-danger">{error}</p>
      ) : (
        <p className="mt-3 text-xs text-muted">
          Status: {shared ? "Manager can see summary" : "Manager blocked"}
        </p>
      )}
    </section>
  );
}
