import { promises as fs } from "fs";
import path from "path";
import { FIRM, TALK_TRACKS } from "@/data/seed";
import { dataStorePath } from "@/lib/file-store";
import type { ObjectionType, TalkTrack } from "@/lib/types";

/** Editable firm knowledge — source of truth for coach UI + client overrides. */
export type PlaybookTalkTrack = {
  id: string;
  objectionType: ObjectionType;
  title: string;
  approvedPlay: string;
  anchorPoints: string[];
  neverDo: string[];
  /** Optional speakable example for Full hints */
  exampleLine: string;
};

export type FirmPlaybook = {
  firmId: string;
  firmName: string;
  vertical: string;
  standardPermFeePct: number;
  feeFloorPct: number;
  /** What the AI client claims a competitor quoted */
  competitorQuotePct: number;
  valueAnchors: string[];
  talkTracks: PlaybookTalkTrack[];
  /** Freeform dump — FAQ, policies, notes (not injected wholesale into ElevenLabs) */
  faqNotes: string;
  updatedAt: string;
};

const STORE = dataStorePath("playbook.json");

const DEFAULT_EXAMPLES: Partial<Record<ObjectionType, string>> = {
  fee: "Before we discuss commission — what matters most when choosing your agent? Let’s compare the local market evidence, marketing plan and negotiation support included in our service.",
  other_agency:
    "I respect that relationship — is there anything you still need from your selling plan? If useful, we can arrange a no-obligation appraisal so you can compare approaches.",
  just_cvs:
    "A useful appraisal starts with your property and plans. What is your timeframe, and would a short appraisal appointment help?",
  timing:
    "Totally fair. Would a local market update be useful, and may I check in next month? If you prefer no follow-up, I’ll respect that.",
  exclusivity:
    "Shall I send the sales authority and fee summary for you and your partner to review, then check in on Thursday?",
  other:
    "Help me understand your selling plans and priorities before we discuss the agency agreement.",
};

export function defaultPlaybook(): FirmPlaybook {
  return {
    firmId: FIRM.id,
    firmName: FIRM.name,
    vertical: FIRM.vertical,
    standardPermFeePct: FIRM.standardPermFeePct,
    feeFloorPct: FIRM.feeFloorPct,
    competitorQuotePct: 1.75, // fictional competing commission
    valueAnchors: [...FIRM.valueAnchors],
    talkTracks: TALK_TRACKS.map((t) => talkTrackToPlaybook(t)),
    faqNotes:
      "Fictional Australian residential agency for practice. Commission examples are agency-specific demo assumptions, not market benchmarks. Rates exclude GST; marketing costs are separate. An appraisal is an estimated selling price, not a formal valuation. Respect a clear refusal and ask permission before following up.",
    updatedAt: new Date(0).toISOString(),
  };
}

function talkTrackToPlaybook(t: TalkTrack): PlaybookTalkTrack {
  return {
    id: t.id,
    objectionType: t.objectionType,
    title: t.title,
    approvedPlay: t.approvedPlay,
    anchorPoints: [...t.anchorPoints],
    neverDo: [...t.neverDo],
    exampleLine: DEFAULT_EXAMPLES[t.objectionType] ?? "",
  };
}

function normalize(raw: Partial<FirmPlaybook> | null | undefined): FirmPlaybook {
  const base = defaultPlaybook();
  if (!raw || typeof raw !== "object") return base;

  const standard =
    typeof raw.standardPermFeePct === "number"
      ? raw.standardPermFeePct
      : base.standardPermFeePct;
  const floor =
    typeof raw.feeFloorPct === "number" ? raw.feeFloorPct : base.feeFloorPct;

  const tracks =
    Array.isArray(raw.talkTracks) && raw.talkTracks.length > 0
      ? raw.talkTracks.map((t, i) => {
          const fallback = base.talkTracks[i] ?? base.talkTracks[0];
          return {
            id: typeof t.id === "string" ? t.id : fallback.id,
            objectionType: (t.objectionType ??
              fallback.objectionType) as ObjectionType,
            title: typeof t.title === "string" ? t.title : fallback.title,
            approvedPlay:
              typeof t.approvedPlay === "string"
                ? t.approvedPlay
                : fallback.approvedPlay,
            anchorPoints: Array.isArray(t.anchorPoints)
              ? t.anchorPoints.map(String)
              : fallback.anchorPoints,
            neverDo: Array.isArray(t.neverDo)
              ? t.neverDo.map(String)
              : fallback.neverDo,
            exampleLine:
              typeof t.exampleLine === "string"
                ? t.exampleLine
                : (DEFAULT_EXAMPLES[
                    (t.objectionType ?? fallback.objectionType) as ObjectionType
                  ] ?? ""),
          };
        })
      : base.talkTracks;

  return {
    firmId: typeof raw.firmId === "string" ? raw.firmId : base.firmId,
    firmName: typeof raw.firmName === "string" ? raw.firmName : base.firmName,
    vertical: typeof raw.vertical === "string" ? raw.vertical : base.vertical,
    standardPermFeePct: standard,
    feeFloorPct: Math.min(floor, standard),
    competitorQuotePct:
      typeof raw.competitorQuotePct === "number"
        ? raw.competitorQuotePct
        : base.competitorQuotePct,
    valueAnchors: Array.isArray(raw.valueAnchors)
      ? raw.valueAnchors.map(String).filter(Boolean)
      : base.valueAnchors,
    talkTracks: tracks,
    faqNotes: typeof raw.faqNotes === "string" ? raw.faqNotes : base.faqNotes,
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt,
  };
}

export async function getPlaybook(): Promise<FirmPlaybook> {
  try {
    const raw = await fs.readFile(STORE, "utf8");
    return normalize(JSON.parse(raw) as Partial<FirmPlaybook>);
  } catch {
    return defaultPlaybook();
  }
}

export async function savePlaybook(
  input: Partial<FirmPlaybook>,
): Promise<FirmPlaybook> {
  const next = normalize({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  if (next.feeFloorPct > next.standardPermFeePct) {
    throw new Error("Fee floor cannot be above standard fee");
  }
  if (
    !Number.isFinite(next.standardPermFeePct) ||
    next.standardPermFeePct <= 0 ||
    next.standardPermFeePct > 100
  ) {
    throw new Error("Standard commission must be greater than 0% and at most 100%");
  }
  await fs.mkdir(path.dirname(STORE), { recursive: true });
  await fs.writeFile(STORE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function getPlaybookTalkTrack(
  playbook: FirmPlaybook,
  objectionType: ObjectionType,
): PlaybookTalkTrack {
  return (
    playbook.talkTracks.find((t) => t.objectionType === objectionType) ??
    playbook.talkTracks[0] ??
    defaultPlaybook().talkTracks[0]
  );
}

/** Map playbook track into the legacy TalkTrack shape used by seed helpers. */
export function asTalkTrack(track: PlaybookTalkTrack): TalkTrack {
  return {
    id: track.id,
    objectionType: track.objectionType,
    title: track.title,
    approvedPlay: track.approvedPlay,
    anchorPoints: track.anchorPoints,
    neverDo: track.neverDo,
  };
}
