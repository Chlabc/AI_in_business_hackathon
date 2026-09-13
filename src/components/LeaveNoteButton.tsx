"use client";

import { useState } from "react";

type LeaveNoteButtonProps = {
  repId: string;
  repName: string;
};

/**
 * Manager Team action — post a coaching note to an employee's inbox.
 * Does not require share-on (notes ≠ transcript access).
 */
export function LeaveNoteButton({ repId, repName }: LeaveNoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/reps/${encodeURIComponent(repId)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send note.");
      setBody("");
      setOpen(false);
      setMessage(`Note sent to ${repName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setMessage(null);
          setError(null);
        }}
        className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-accent hover:text-accent"
      >
        Leave a note
      </button>
      {message ? (
        <p className="mt-1 text-[11px] text-ok">{message}</p>
      ) : null}
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-border bg-card p-3 shadow-lg">
          <p className="text-xs font-semibold text-foreground">
            Note for {repName}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            Shows in their inbox bell — not a transcript share.
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="e.g. Strong hold on the Beacon call — keep asking what 'too expensive' is measured against before you move."
            className="mt-2 w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
          {error ? (
            <p className="mt-1 text-[11px] text-danger">{error}</p>
          ) : null}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2.5 py-1 text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !body.trim()}
              onClick={() => void submit()}
              className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-fg disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
