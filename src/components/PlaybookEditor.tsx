"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from "react";
import { InfoTip } from "@/components/InfoTip";
import type { FirmPlaybook, PlaybookTalkTrack } from "@/lib/playbook";
import {
  draftStatus,
  isTalkTrackField,
  talkTrackIdFromField,
  workingFromProposals,
  type PlaybookDraft,
  type PlaybookProposal,
} from "@/lib/playbook-draft-core";

type PlaybookEditorProps = {
  live: FirmPlaybook;
  initialDraft: PlaybookDraft | null;
};

/** Grows/shrinks to fit content so the box wraps the text without empty space. */
function AutoTextarea({
  className,
  value,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
  }, [value]);
  return (
    <textarea
      {...props}
      ref={ref}
      value={value}
      rows={1}
      className={`resize-y overflow-hidden ${className ?? ""}`}
    />
  );
}

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function listToLines(items: string[]): string {
  return items.join("\n");
}

function formatProposalValue(value: unknown): string {
  if (typeof value === "number") return `${value}%`;
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}…` : value;
  }
  if (Array.isArray(value)) return value.join("; ");
  if (value && typeof value === "object") {
    const t = value as PlaybookTalkTrack;
    if ("approvedPlay" in t) {
      return [
        t.approvedPlay,
        Array.isArray(t.anchorPoints) ? t.anchorPoints.join(" · ") : "",
      ]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 160);
    }
  }
  return JSON.stringify(value);
}

export function PlaybookEditor({ live, initialDraft }: PlaybookEditorProps) {
  const [livePlaybook, setLivePlaybook] = useState(live);
  const [working, setWorking] = useState<FirmPlaybook>(
    initialDraft?.working ?? live,
  );
  const [proposals, setProposals] = useState<PlaybookProposal[]>(
    initialDraft?.proposals ?? [],
  );
  const [method, setMethod] = useState<string | undefined>(
    initialDraft?.method,
  );
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTrack, setOpenTrack] = useState<string | null>(
    (initialDraft?.working ?? live).talkTracks[0]?.id ?? null,
  );
  const [importText, setImportText] = useState("");
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importFindings, setImportFindings] = useState<string[] | null>(null);
  /** Short post-parse next-step line in the knowledge-draft box (not the findings dump). */
  const [parseBanner, setParseBanner] = useState<string | null>(null);

  const status = useMemo(
    () => draftStatus(livePlaybook, working, proposals),
    [livePlaybook, working, proposals],
  );
  const locked = status === "locked";

  const update = <K extends keyof FirmPlaybook>(
    key: K,
    value: FirmPlaybook[K],
  ) => {
    setWorking((d) => ({ ...d, [key]: value }));
    setMessage(null);
  };

  const updateTrack = (id: string, patch: Partial<PlaybookTalkTrack>) => {
    setWorking((d) => ({
      ...d,
      talkTracks: d.talkTracks.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    }));
    setMessage(null);
  };

  function toggleProposal(id: string, accepted: boolean) {
    setProposals((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, accepted } : p));
      setWorking(workingFromProposals(livePlaybook, next));
      return next;
    });
    setMessage(null);
  }

  async function persistDraft(
    nextWorking: FirmPlaybook,
    nextProposals: PlaybookProposal[],
    nextMethod?: string,
  ) {
    const body: PlaybookDraft = {
      working: nextWorking,
      liveUpdatedAt: livePlaybook.updatedAt,
      proposals: nextProposals,
      status: draftStatus(livePlaybook, nextWorking, nextProposals),
      updatedAt: new Date().toISOString(),
      method: (nextMethod as PlaybookDraft["method"]) ?? (method as PlaybookDraft["method"]),
    };
    const res = await fetch("/api/playbook/draft", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Could not save draft");
    }
    return (await res.json()) as PlaybookDraft;
  }

  async function runImport(mode: "auto" | "heuristic") {
    setImporting(true);
    setError(null);
    setMessage(null);
    setImportFindings(null);
    setParseBanner(null);
    try {
      let res: Response;
      if (pendingPdf) {
        const form = new FormData();
        form.append("file", pendingPdf);
        form.append("mode", mode);
        res = await fetch("/api/playbook/import", {
          method: "POST",
          body: form,
        });
      } else {
        res = await fetch("/api/playbook/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: importText, mode }),
        });
      }
      const data = (await res.json()) as {
        error?: string;
        findings?: string[];
        proposals?: PlaybookProposal[];
        draft?: FirmPlaybook;
        method?: string;
        extractedText?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      const nextProposals = data.proposals ?? [];
      const nextWorking =
        data.draft ?? workingFromProposals(livePlaybook, nextProposals);
      setProposals(nextProposals);
      setWorking(nextWorking);
      setMethod(data.method);
      // Keep findings for method/debug, but UI shows a short next-step status.
      setImportFindings(data.findings ?? []);
      if (typeof data.extractedText === "string" && data.extractedText.trim()) {
        setImportText(data.extractedText);
      }
      setPendingPdf(null);
      setParseBanner(
        lockedOrMessage(nextProposals) ||
          "Document parsed, scroll down and click Publish when ready.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function lockedOrMessage(nextProposals: PlaybookProposal[]) {
    const n = nextProposals.length;
    if (!n) {
      return "Document parsed, no field changes detected. Scroll down if you still want to edit, then Publish when ready.";
    }
    return `Document parsed, ${n} proposal${n === 1 ? "" : "s"} ready. Scroll down, review what to accept, then click Publish.`;
  }

  function onFile(file: File | null) {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isText =
      file.type.startsWith("text/") ||
      /\.(txt|md|markdown|csv)$/i.test(file.name);
    if (!isPdf && !isText) {
      setError("Use a PDF or text file (.pdf, .txt, .md). Scanned PDFs need OCR later.");
      return;
    }
    if (isPdf) {
      setPendingPdf(file);
      setImportText("");
      setError(null);
      setMessage(`PDF ready: ${file.name}, click Parse to extract + import.`);
      return;
    }
    setPendingPdf(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setImportText(text);
      setError(null);
    };
    reader.onerror = () => setError("Could not read file");
    reader.readAsText(file);
  }

  const canParse = Boolean(pendingPdf) || Boolean(importText.trim());

  async function saveDraft() {
    setSavingDraft(true);
    setError(null);
    setMessage(null);
    try {
      await persistDraft(working, proposals, method);
      setMessage("Draft saved (not live in drills yet).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft save failed");
    } finally {
      setSavingDraft(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      // Ensure working matches accepted proposals for proposal fields,
      // then keep any manual edits already on working for non-proposed fields.
      const fromProposals = workingFromProposals(livePlaybook, proposals);
      const toPublish: FirmPlaybook = {
        ...fromProposals,
        // Manual overrides on scalars if user edited after toggle
        firmName: working.firmName,
        vertical: working.vertical,
        standardPermFeePct: working.standardPermFeePct,
        feeFloorPct: working.feeFloorPct,
        competitorQuotePct: working.competitorQuotePct,
        valueAnchors: working.valueAnchors,
        faqNotes: working.faqNotes,
        talkTracks: working.talkTracks.map((t) => {
          const proposal = proposals.find(
            (p) =>
              isTalkTrackField(p.field) &&
              talkTrackIdFromField(p.field) === t.id,
          );
          if (proposal && !proposal.accepted) {
            const liveTrack = livePlaybook.talkTracks.find((x) => x.id === t.id);
            return liveTrack ?? t;
          }
          return t;
        }),
      };

      const res = await fetch("/api/playbook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPublish),
      });
      const data = (await res.json()) as FirmPlaybook & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      setLivePlaybook(data);
      setWorking(data);
      setProposals([]);
      setMethod(undefined);
      setImportFindings(null);
      setParseBanner(null);
      setMessage(
        "Live. Open Practice as a rep to see updated cues; Start drill uses new buyer prices.",
      );
      try {
        localStorage.setItem("cornerman.playbookUpdatedAt", data.updatedAt);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  async function clearKnowledgeBase() {
    const ok = window.confirm(
      "Clear the entire knowledge base?\n\nThis wipes live pricing, anchors, talk-track copy, and FAQ, and discards any draft, so you can upload the sample PDF and parse from a blank slate. This cannot be undone.",
    );
    if (!ok) return;
    setClearing(true);
    setError(null);
    setMessage(null);
    setParseBanner(null);
    try {
      const res = await fetch("/api/playbook/clear", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        playbook?: FirmPlaybook;
      };
      if (!res.ok) throw new Error(data.error ?? "Clear failed");
      const next = data.playbook;
      if (!next) throw new Error("Clear returned no playbook");
      setLivePlaybook(next);
      setWorking(next);
      setProposals([]);
      setMethod(undefined);
      setImportFindings(null);
      setImportText("");
      setPendingPdf(null);
      setMessage(
        "Knowledge base cleared. Download the sample PDF, upload it, then Parse.",
      );
      try {
        localStorage.setItem("cornerman.playbookUpdatedAt", next.updatedAt);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setClearing(false);
    }
  }

  async function discardDraft() {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/playbook/draft", { method: "DELETE" });
      const data = (await res.json()) as {
        error?: string;
        live?: FirmPlaybook;
      };
      if (!res.ok) throw new Error(data.error ?? "Discard failed");
      const nextLive = data.live ?? livePlaybook;
      setLivePlaybook(nextLive);
      setWorking(nextLive);
      setProposals([]);
      setMethod(undefined);
      setImportFindings(null);
      setParseBanner(null);
      setMessage("Draft discarded. Showing live knowledge.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discard failed");
    }
  }

  const fieldClass =
    "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-accent";

  const processing = importing || publishing || savingDraft || clearing;
  const statusTone = error
    ? "red"
    : processing
      ? "orange"
      : locked
        ? "orange"
        : "green";
  const statusLabel = error
    ? "Error"
    : importing
      ? "Processing…"
      : publishing
        ? "Publishing…"
        : clearing
          ? "Clearing…"
          : savingDraft
            ? "Saving…"
            : locked
              ? "Draft, not live in drills"
              : "Live";
  const statusDotClass =
    statusTone === "green"
      ? "bg-ok"
      : statusTone === "red"
        ? "bg-danger"
        : "bg-amber-500";

  const statusBadge = (
    <span
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold ${
        statusTone === "green"
          ? "border-ok/40 bg-ok-soft text-ok"
          : statusTone === "red"
            ? "border-danger/40 bg-danger-soft text-danger"
            : "border-amber-700/50 bg-amber-500 text-amber-950"
      }`}
    >
      <span
        aria-hidden
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass} ${processing ? "animate-pulse" : ""} ${statusTone === "orange" ? "bg-amber-950" : ""}`}
      />
      {statusLabel}
    </span>
  );

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Import</p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-foreground">
              Company document → knowledge draft
              <InfoTip text="Download the sample PDF (or upload your own text-layer PDF), then Parse with AI or without AI. That builds a locked draft — review proposals, then Publish so Learn, cue cards, scoring, and the next voice drill pick it up. Employees never edit this. Clear knowledge base first if you want to reparse from a blank slate." />
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge}
            {method ? (
              <span className="text-xs text-muted">Last parse: {method}</span>
            ) : null}
          </div>
        </div>

        <AutoTextarea
          className={`${fieldClass} mt-4 min-h-[5rem] font-mono text-xs`}
          placeholder={`Example:\nStandard commission: 2.5%\nFloor (approval): 2%\nCompetitor often quotes 1.75%\n- local comparable sales\n- tailored marketing and negotiation support`}
          value={importText}
          onChange={(e) => {
            setImportText(e.target.value);
            if (e.target.value.trim()) setPendingPdf(null);
          }}
        />
        {pendingPdf ? (
          <p className="mt-2 text-xs text-muted">
            Attached PDF:{" "}
            <span className="font-medium text-foreground">{pendingPdf.name}</span>
            {" · "}
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={() => setPendingPdf(null)}
            >
              clear
            </button>
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href="/samples/northline-playbook-sample.pdf?v=20260914b"
            download="northline-playbook-sample.pdf"
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent"
          >
            Download sample PDF
          </a>
          <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm text-muted hover:border-accent hover:text-foreground">
            Upload PDF or text
            <input
              type="file"
              accept=".pdf,.txt,.md,.markdown,.csv,application/pdf,text/plain,text/markdown,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            disabled={importing || !canParse}
            onClick={() => void runImport("auto")}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50"
          >
            {importing ? "Parsing…" : "Parse with AI"}
          </button>
          <button
            type="button"
            disabled={importing || !canParse}
            onClick={() => void runImport("heuristic")}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-accent disabled:opacity-50"
          >
            Parse without AI
          </button>
        </div>
        {importing ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-700/50 bg-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-950">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-amber-950"
            />
            Processing document…
          </p>
        ) : null}
        {!importing && parseBanner ? (
          <p className="mt-3 text-sm font-medium text-ok">{parseBanner}</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm font-medium text-danger">{error}</p>
        ) : null}
      </section>

      {proposals.length > 0 ? (
        <section className="surface-card rounded-xl p-5 sm:p-6">
          <p className="eyebrow">Proposals</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Accept changes before publish
          </h2>
          <ul className="mt-4 space-y-3">
            {proposals.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-border bg-background px-4 py-3"
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={p.accepted}
                    onChange={(e) => toggleProposal(p.id, e.target.checked)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {p.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted">
                        {p.source}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      <span className="text-danger/80">
                        {formatProposalValue(p.before)}
                      </span>
                      {" → "}
                      <span className="text-ok">
                        {formatProposalValue(p.after)}
                      </span>
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="surface-card rounded-xl p-5 sm:p-6">
        <p className="eyebrow">Firm facts</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Commission & agency positioning
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Company name
            <input
              className={fieldClass}
              value={working.firmName}
              onChange={(e) => update("firmName", e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted sm:col-span-2 lg:col-span-2">
            Vertical
            <input
              className={fieldClass}
              value={working.vertical}
              onChange={(e) => update("vertical", e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Standard commission %
            <input
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              className={fieldClass}
              value={working.standardPermFeePct}
              onChange={(e) =>
                update("standardPermFeePct", Number(e.target.value))
              }
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Approval floor %
            <input
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              className={fieldClass}
              value={working.feeFloorPct}
              onChange={(e) => update("feeFloorPct", Number(e.target.value))}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Competing commission %
            <input
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              className={fieldClass}
              value={working.competitorQuotePct}
              onChange={(e) =>
                update("competitorQuotePct", Number(e.target.value))
              }
            />
          </label>
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted">
          Value anchors (one per line)
          <AutoTextarea
            className={fieldClass}
            value={listToLines(working.valueAnchors)}
            onChange={(e) =>
              update("valueAnchors", linesToList(e.target.value))
            }
          />
        </label>
      </section>

      <section className="surface-card rounded-xl p-5 sm:p-6">
        <p className="eyebrow">Talk-tracks</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Objection playbooks
        </h2>
        <div className="mt-4 space-y-3">
          {working.talkTracks.map((t) => {
            const open = openTrack === t.id;
            return (
              <div
                key={t.id}
                className="rounded-lg border border-border bg-background"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => setOpenTrack(open ? null : t.id)}
                >
                  <span className="text-sm font-semibold text-foreground">
                    {t.title}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-muted">
                    {t.objectionType} · {open ? "Hide" : "Edit"}
                  </span>
                </button>
                {open ? (
                  <div className="space-y-3 border-t border-border px-4 py-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                      Approved play
                      <AutoTextarea
                        className={fieldClass}
                        value={t.approvedPlay}
                        onChange={(e) =>
                          updateTrack(t.id, { approvedPlay: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                      Anchor points (one per line)
                      <AutoTextarea
                        className={fieldClass}
                        value={listToLines(t.anchorPoints)}
                        onChange={(e) =>
                          updateTrack(t.id, {
                            anchorPoints: linesToList(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                      Never do (one per line)
                      <AutoTextarea
                        className={fieldClass}
                        value={listToLines(t.neverDo)}
                        onChange={(e) =>
                          updateTrack(t.id, {
                            neverDo: linesToList(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                      Example line (Full cues)
                      <AutoTextarea
                        className={fieldClass}
                        value={t.exampleLine}
                        onChange={(e) =>
                          updateTrack(t.id, { exampleLine: e.target.value })
                        }
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface-card rounded-xl p-5 sm:p-6">
        <p className="eyebrow">FAQ / dump</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Extra company notes
        </h2>
        <AutoTextarea
          className={`${fieldClass} mt-4`}
          value={working.faqNotes}
          onChange={(e) => update("faqNotes", e.target.value)}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void publish()}
          disabled={publishing}
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
        >
          {publishing ? "Publishing…" : "Publish to live"}
        </button>
        <button
          type="button"
          onClick={() => void saveDraft()}
          disabled={savingDraft}
          className="inline-flex h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-medium text-foreground hover:border-accent disabled:opacity-60"
        >
          {savingDraft ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={() => void discardDraft()}
          className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-muted hover:text-foreground"
        >
          Discard draft
        </button>
        <button
          type="button"
          onClick={() => void clearKnowledgeBase()}
          disabled={clearing || publishing || importing}
          className="inline-flex h-11 items-center justify-center rounded-md border border-danger/40 px-4 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-60"
        >
          {clearing ? "Clearing…" : "Clear knowledge base"}
        </button>
        {message ? <p className="text-sm text-ok">{message}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <p className="w-full text-xs text-muted sm:w-auto">
          Live updated{" "}
          {livePlaybook.updatedAt &&
          livePlaybook.updatedAt !== new Date(0).toISOString()
            ? new Date(livePlaybook.updatedAt).toLocaleString()
            : ",  defaults (not published yet)"}
        </p>
      </div>
    </div>
  );
}
