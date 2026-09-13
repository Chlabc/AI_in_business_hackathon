"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type LeaveNoteButtonProps = {
  repId: string;
  repName: string;
};

type PanelPos = { top: number; left: number };

/**
 * Manager Team action — post a coaching note to an employee's inbox.
 * Panel is portaled + fixed so the team table stays static (no scroll/clip
 * from overflow-x-auto on the table wrapper).
 */
export function LeaveNoteButton({ repId, repName }: LeaveNoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  function placePanel() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = 288; // w-72
    const gap = 8;
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = rect.bottom + gap;
    const panelH = panelRef.current?.offsetHeight ?? 260;
    if (top + panelH > window.innerHeight - 8) {
      top = Math.max(8, rect.top - gap - panelH);
    }
    setPos({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) return;
    placePanel();
    const onReposition = () => placePanel();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- place when open toggles
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

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

  const panel =
    open && mounted && pos
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={`Note for ${repName}`}
            className="fixed z-[100] w-72 rounded-xl border border-border bg-card p-3 shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
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
              autoFocus
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
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
      {panel}
    </div>
  );
}
