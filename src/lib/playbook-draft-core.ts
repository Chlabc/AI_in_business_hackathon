import type { FirmPlaybook, PlaybookTalkTrack } from "@/lib/playbook";

/** Scalar / collection fields that import may propose (not talk-tracks). */
export type PlaybookScalarField =
  | "firmName"
  | "vertical"
  | "standardPermFeePct"
  | "feeFloorPct"
  | "competitorQuotePct"
  | "valueAnchors"
  | "faqNotes";

export type PlaybookProposalField =
  | PlaybookScalarField
  | `talkTrack:${string}`;

export type PlaybookProposal = {
  id: string;
  field: PlaybookProposalField;
  label: string;
  before: unknown;
  after: unknown;
  /** Manager toggle — firm facts default true; talk-tracks default false */
  accepted: boolean;
  source: "heuristic" | "llm" | "manual";
};

export type PlaybookDraft = {
  /** Working copy shown in the editor (accepted proposals + manual edits) */
  working: FirmPlaybook;
  /** Live stamp when this draft was created / last synced from live */
  liveUpdatedAt: string;
  proposals: PlaybookProposal[];
  importExcerpt?: string;
  /** locked = unpublished proposals or dirty vs live */
  status: "locked" | "ready";
  updatedAt: string;
  method?: "heuristic" | "llm" | "llm+heuristic";
};

const SCALAR_LABELS: Record<PlaybookScalarField, string> = {
  firmName: "Company name",
  vertical: "Vertical",
  standardPermFeePct: "List seat $/mo",
  feeFloorPct: "Floor seat $/mo",
  competitorQuotePct: "Competitor quote $/mo",
  valueAnchors: "Value anchors",
  faqNotes: "FAQ / notes",
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function isTalkTrackField(
  field: PlaybookProposalField,
): field is `talkTrack:${string}` {
  return field.startsWith("talkTrack:");
}

export function talkTrackIdFromField(field: `talkTrack:${string}`): string {
  return field.slice("talkTrack:".length);
}

/**
 * Build proposals by diffing live against an import patch (+ optional track patches).
 * Firm-fact proposals default accepted; talk-track proposals default rejected.
 */
export function buildProposals(
  live: FirmPlaybook,
  patch: Partial<FirmPlaybook>,
  opts?: {
    talkTrackPatches?: Partial<PlaybookTalkTrack>[];
    source?: "heuristic" | "llm";
  },
): PlaybookProposal[] {
  const source = opts?.source ?? "heuristic";
  const proposals: PlaybookProposal[] = [];

  const scalars: PlaybookScalarField[] = [
    "firmName",
    "vertical",
    "standardPermFeePct",
    "feeFloorPct",
    "competitorQuotePct",
    "valueAnchors",
    "faqNotes",
  ];

  for (const field of scalars) {
    if (!(field in patch) || patch[field] === undefined) continue;
    const after = patch[field];
    const before = live[field];
    if (valuesEqual(before, after)) continue;
    proposals.push({
      id: newId(),
      field,
      label: SCALAR_LABELS[field],
      before,
      after,
      accepted: true,
      source,
    });
  }

  for (const partial of opts?.talkTrackPatches ?? []) {
    const id =
      typeof partial.id === "string"
        ? partial.id
        : live.talkTracks.find((t) => t.objectionType === partial.objectionType)
            ?.id;
    if (!id) continue;
    const before = live.talkTracks.find((t) => t.id === id);
    if (!before) continue;
    const after: PlaybookTalkTrack = {
      ...before,
      ...Object.fromEntries(
        Object.entries(partial).filter(
          ([, v]) => v !== undefined && v !== null,
        ),
      ),
      id: before.id,
      objectionType: before.objectionType,
    };
    if (valuesEqual(before, after)) continue;
    proposals.push({
      id: newId(),
      field: `talkTrack:${id}`,
      label: `Talk-track · ${before.title}`,
      before,
      after,
      accepted: false,
      source,
    });
  }

  return proposals;
}

/**
 * Apply accepted proposals onto live. Rejected proposals are ignored.
 * Does not write to disk — caller runs savePlaybook.
 */
export function applyAcceptedProposals(
  live: FirmPlaybook,
  proposals: PlaybookProposal[],
): FirmPlaybook {
  const next: FirmPlaybook = {
    ...live,
    valueAnchors: [...live.valueAnchors],
    talkTracks: live.talkTracks.map((t) => ({
      ...t,
      anchorPoints: [...t.anchorPoints],
      neverDo: [...t.neverDo],
    })),
  };

  for (const p of proposals) {
    if (!p.accepted) continue;
    if (isTalkTrackField(p.field)) {
      const trackId = talkTrackIdFromField(p.field);
      const after = p.after as PlaybookTalkTrack;
      next.talkTracks = next.talkTracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              title: typeof after.title === "string" ? after.title : t.title,
              approvedPlay:
                typeof after.approvedPlay === "string"
                  ? after.approvedPlay
                  : t.approvedPlay,
              anchorPoints: Array.isArray(after.anchorPoints)
                ? after.anchorPoints.map(String)
                : t.anchorPoints,
              neverDo: Array.isArray(after.neverDo)
                ? after.neverDo.map(String)
                : t.neverDo,
              exampleLine:
                typeof after.exampleLine === "string"
                  ? after.exampleLine
                  : t.exampleLine,
            }
          : t,
      );
      continue;
    }
    switch (p.field) {
      case "firmName":
      case "vertical":
      case "faqNotes":
        if (typeof p.after === "string") next[p.field] = p.after;
        break;
      case "standardPermFeePct":
      case "feeFloorPct":
      case "competitorQuotePct":
        if (typeof p.after === "number" && Number.isFinite(p.after)) {
          next[p.field] = p.after;
        }
        break;
      case "valueAnchors":
        if (Array.isArray(p.after)) next.valueAnchors = p.after.map(String);
        break;
      default:
        break;
    }
  }

  return next;
}

/** Working editor state = live + accepted proposals (pure). */
export function workingFromProposals(
  live: FirmPlaybook,
  proposals: PlaybookProposal[],
): FirmPlaybook {
  return applyAcceptedProposals(live, proposals);
}

export function draftStatus(
  live: FirmPlaybook,
  working: FirmPlaybook,
  proposals: PlaybookProposal[],
): "locked" | "ready" {
  const pending = proposals.some((p) => p.accepted);
  const dirty = !valuesEqual(
    { ...live, updatedAt: "" },
    { ...working, updatedAt: "" },
  );
  return pending || dirty ? "locked" : "ready";
}

export function emptyDraft(live: FirmPlaybook): PlaybookDraft {
  return {
    working: live,
    liveUpdatedAt: live.updatedAt,
    proposals: [],
    status: "ready",
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeDraft(
  raw: Partial<PlaybookDraft> | null,
): PlaybookDraft | null {
  if (!raw || typeof raw !== "object" || !raw.working) return null;
  const working = raw.working as FirmPlaybook;
  const proposals = Array.isArray(raw.proposals)
    ? (raw.proposals as PlaybookProposal[])
    : [];
  return {
    working,
    liveUpdatedAt:
      typeof raw.liveUpdatedAt === "string"
        ? raw.liveUpdatedAt
        : working.updatedAt,
    proposals,
    importExcerpt:
      typeof raw.importExcerpt === "string" ? raw.importExcerpt : undefined,
    status: raw.status === "ready" ? "ready" : "locked",
    updatedAt:
      typeof raw.updatedAt === "string"
        ? raw.updatedAt
        : new Date().toISOString(),
    method: raw.method,
  };
}
