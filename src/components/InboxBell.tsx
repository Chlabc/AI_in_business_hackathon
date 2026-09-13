"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type InboxComment = {
  id: string;
  fromName: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

/**
 * Employee header bell — polls inbox for unread coaching notes from the manager.
 */
export function InboxBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [comments, setComments] = useState<InboxComment[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox", { cache: "no-store" });
      const json = (await res.json()) as {
        configured?: boolean;
        unread?: number;
        comments?: InboxComment[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load inbox.");
      setConfigured(json.configured !== false);
      setUnread(json.unread ?? 0);
      setComments(json.comments ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inbox unavailable.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markRead(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/inbox/${id}/read`, { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not mark read.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark read.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void refresh();
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition hover:border-accent"
        aria-label={
          unread > 0 ? `Inbox, ${unread} unread` : "Inbox"
        }
        title="Inbox"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 18a2 2 0 0 0 4 0"
          />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Inbox</p>
            <p className="text-xs text-muted">
              Coaching notes from your manager
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!configured ? (
              <p className="px-4 py-6 text-sm text-muted">
                Inbox needs Supabase service role configured on the server.
              </p>
            ) : error ? (
              <p className="px-4 py-6 text-sm text-danger">{error}</p>
            ) : comments.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">
                No notes yet. When your manager leaves feedback on Team, it
                shows up here.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {comments.map((c) => {
                  const unreadRow = !c.readAt;
                  return (
                    <li
                      key={c.id}
                      className={`px-4 py-3 ${unreadRow ? "bg-accent-soft/40" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">
                            {c.fromName}
                            {unreadRow ? (
                              <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-fg">
                                New
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted">
                            {new Date(c.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {unreadRow ? (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => void markRead(c.id)}
                            className="shrink-0 text-[11px] font-semibold text-accent hover:underline disabled:opacity-50"
                          >
                            Mark read
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">
                        {c.body}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
