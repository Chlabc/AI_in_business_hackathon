"use client";

import { useState } from "react";
import type { FirmPlaybook, PlaybookTalkTrack } from "@/lib/playbook";
import { mergePlaybookImport } from "@/lib/playbook-import";

type PlaybookEditorProps = {
  initial: FirmPlaybook;
};

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function listToLines(items: string[]): string {
  return items.join("\n");
}

export function PlaybookEditor({ initial }: PlaybookEditorProps) {
  const [draft, setDraft] = useState<FirmPlaybook>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTrack, setOpenTrack] = useState<string | null>(
    initial.talkTracks[0]?.id ?? null,
  );
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importFindings, setImportFindings] = useState<string[] | null>(null);

  const update = <K extends keyof FirmPlaybook>(key: K, value: FirmPlaybook[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setMessage(null);
  };

  async function runImport() {
    setImporting(true);
    setError(null);
    setMessage(null);
    setImportFindings(null);
    try {
      const res = await fetch("/api/playbook/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText }),
      });
      const data = (await res.json()) as {
        error?: string;
        patch?: Partial<FirmPlaybook>;
        findings?: string[];
      };
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setDraft((d) => mergePlaybookImport(d, data.patch ?? {}));
      setImportFindings(data.findings ?? []);
      setMessage(
        "Import applied to draft — review fields below, then Save playbook.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function onFile(file: File | null) {
    if (!file) return;
    const ok =
      file.type.startsWith("text/") ||
      /\.(txt|md|markdown|csv)$/i.test(file.name);
    if (!ok) {
      setError("Use a text file (.txt, .md). PDF ingest is a later slice.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setImportText(text);
      setError(null);
    };
    reader.onerror = () => setError("Could not read file");
    reader.readAsText(file);
  }

  const updateTrack = (
    id: string,
    patch: Partial<PlaybookTalkTrack>,
  ) => {
    setDraft((d) => ({
      ...d,
      talkTracks: d.talkTracks.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    }));
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/playbook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as FirmPlaybook & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setDraft(data);
      setMessage("Saved. Next drill will use these firm facts and talk-tracks.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-xl p-5 sm:p-6">
        <p className="eyebrow">Import</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Company document → playbook
        </h2>
        <p className="mt-2 text-sm text-muted">
          Paste pricing / value notes or upload{" "}
          <code className="text-xs">.txt</code> /{" "}
          <code className="text-xs">.md</code>. We heuristically pull list
          price, floor, competitor quote, and bullet anchors, then append the
          source to FAQ. Talk-tracks are not overwritten — review and Save.
        </p>
        <textarea
          className={`${fieldClass} mt-4 min-h-[140px] font-mono text-xs`}
          placeholder={`Example:\nList seat price: $100/mo\nFloor (approval): $80\nCompetitor often quotes $70\n- time-to-value under 14 days\n- SOC2 Type II + SSO`}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm text-muted hover:border-accent hover:text-foreground">
            Upload text file
            <input
              type="file"
              accept=".txt,.md,.markdown,text/plain"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            disabled={importing || !importText.trim()}
            onClick={() => void runImport()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50"
          >
            {importing ? "Extracting…" : "Extract into draft"}
          </button>
        </div>
        {importFindings ? (
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {importFindings.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="surface-card rounded-xl p-5 sm:p-6">
        <p className="eyebrow">Firm facts</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Pricing & positioning (B2B SaaS)
        </h2>
        <p className="mt-2 text-sm text-muted">
          Seat prices feed the AI buyer (thin facts only) and scoring. Coaching
          tips below never go into ElevenLabs.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Company name
            <input
              className={fieldClass}
              value={draft.firmName}
              onChange={(e) => update("firmName", e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted sm:col-span-2 lg:col-span-2">
            Vertical
            <input
              className={fieldClass}
              value={draft.vertical}
              onChange={(e) => update("vertical", e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            List seat $/mo
            <input
              type="number"
              min={1}
              max={500}
              className={fieldClass}
              value={draft.standardPermFeePct}
              onChange={(e) =>
                update("standardPermFeePct", Number(e.target.value))
              }
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Floor seat $/mo
            <input
              type="number"
              min={1}
              max={500}
              className={fieldClass}
              value={draft.feeFloorPct}
              onChange={(e) => update("feeFloorPct", Number(e.target.value))}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Competitor quote $/mo
            <input
              type="number"
              min={1}
              max={500}
              className={fieldClass}
              value={draft.competitorQuotePct}
              onChange={(e) =>
                update("competitorQuotePct", Number(e.target.value))
              }
            />
          </label>
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted">
          Value anchors (one per line)
          <textarea
            rows={4}
            className={fieldClass}
            value={listToLines(draft.valueAnchors)}
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
        <p className="mt-2 text-sm text-muted">
          Drive live Soft/Full cue cards and scoring. Not injected into the voice
          client.
        </p>

        <div className="mt-4 space-y-3">
          {draft.talkTracks.map((t) => {
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
                      <textarea
                        rows={2}
                        className={fieldClass}
                        value={t.approvedPlay}
                        onChange={(e) =>
                          updateTrack(t.id, { approvedPlay: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                      Anchor points (one per line)
                      <textarea
                        rows={3}
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
                      <textarea
                        rows={2}
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
                      <textarea
                        rows={2}
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
        <p className="mt-2 text-sm text-muted">
          Freeform dump for humans (and future retrieval). Not pasted wholesale
          into ElevenLabs.
        </p>
        <textarea
          rows={6}
          className={`${fieldClass} mt-4`}
          value={draft.faqNotes}
          onChange={(e) => update("faqNotes", e.target.value)}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save playbook"}
        </button>
        {message ? (
          <p className="text-sm text-ok">{message}</p>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <p className="w-full text-xs text-muted sm:w-auto">
          Updated{" "}
          {draft.updatedAt && draft.updatedAt !== new Date(0).toISOString()
            ? new Date(draft.updatedAt).toLocaleString()
            : "— defaults (not saved yet)"}
        </p>
      </div>
    </div>
  );
}
