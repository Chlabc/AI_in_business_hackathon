import type { FirmPlaybook, PlaybookTalkTrack } from "@/lib/playbook";

export type PlaybookImportResult = {
  /** Partial patch to merge into the current playbook draft */
  patch: Partial<FirmPlaybook>;
  /** Human-readable notes about what was detected */
  findings: string[];
  /** Optional coaching-copy patches (fee track from sample docs, etc.) */
  talkTrackPatches: Partial<PlaybookTalkTrack>[];
};

type MoneyHit = { value: number; index: number; line: string };

function moneyHits(text: string): MoneyHit[] {
  const hits: MoneyHit[] = [];
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") lineStarts.push(i + 1);
  }
  const re =
    /\b(\d{1,3}(?:\.\d+)?)\s*(?:%|percent\b|per cent\b)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const n = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0 || n > 100) continue;
    const idx = match.index;
    let lineStart = 0;
    for (const s of lineStarts) {
      if (s <= idx) lineStart = s;
      else break;
    }
    const lineEnd = text.indexOf("\n", idx);
    const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
    hits.push({ value: n, index: idx, line });
  }
  return hits;
}

function pickMoneyNear(
  hits: MoneyHit[],
  keywords: RegExp,
): number | null {
  let best: { value: number; score: number } | null = null;
  for (const hit of hits) {
    if (!keywords.test(hit.line)) continue;
    // Prefer amounts on a line that mentions the keyword (same-line wins).
    const score = 1000 - hit.line.length;
    if (!best || score > best.score) best = { value: hit.value, score };
  }
  return best?.value ?? null;
}

function pickAnchors(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const bullets = lines
    .filter((l) => /^[-*•]\s+\S/.test(l) || /^\d+\.\s+\S/.test(l))
    .map((l) => l.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter((l) => l.length >= 12 && l.length <= 160);
  const scored = bullets.filter((l) =>
    /value|appraisal|comparable|market|inspection|negotiation|seller|support/i.test(l),
  );
  const chosen = (scored.length >= 2 ? scored : bullets).slice(0, 5);
  return [...new Set(chosen)];
}

function sectionBullets(text: string, heading: RegExp): string[] {
  const lines = text.split(/\r?\n/);
  let capturing = false;
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (capturing && out.length) break;
      continue;
    }
    if (heading.test(line)) {
      capturing = true;
      continue;
    }
    if (capturing) {
      if (/^[A-Za-z].{0,40}$/.test(line) && !/^[-*•\d]/.test(line)) {
        // Next heading-ish line
        break;
      }
      if (/^[-*•]\s+\S/.test(line) || /^\d+\.\s+\S/.test(line)) {
        const bullet = line
          .replace(/^[-*•]\s+/, "")
          .replace(/^\d+\.\s+/, "")
          .trim();
        if (bullet.length >= 8 && bullet.length <= 200) out.push(bullet);
      }
    }
  }
  return [...new Set(out)].slice(0, 8);
}

function pickApprovedPlay(text: string): string | null {
  const patterns = [
    /(?:fee|commission)\s*\/?\s*(?:commission\s+)?objection[^\n]*approved play\s*([\s\S]{40,600}?)(?=\n\s*\n|\nNever do\b|\nThis PDF\b|\nT\s*h\s*i\s*s\s*P\s*D\s*F\b|$)/i,
    /approved play\s*[:\-–]?\s*([\s\S]{40,600}?)(?=\n\s*\n|\nNever do\b|\nThis PDF\b|\nT\s*h\s*i\s*s\s*P\s*D\s*F\b|$)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const play = m[1]
      .replace(/\s+/g, " ")
      .replace(/\s*T h i s P D F[\s\S]*$/i, "")
      .trim();
    if (play.length >= 40) return play.slice(0, 600);
  }
  return null;
}

/** Fill the primary fee/commission talk-track from common playbook headings. */
function pickFeeTalkTrackPatch(
  text: string,
  current: FirmPlaybook,
): Partial<PlaybookTalkTrack> | null {
  const feeTrack =
    current.talkTracks.find((t) => t.objectionType === "fee") ??
    current.talkTracks[0];
  if (!feeTrack) return null;

  const approvedPlay = pickApprovedPlay(text);
  const neverDo = sectionBullets(text, /^never do\b/i);
  const anchorPoints = pickAnchors(text);
  const partial: Partial<PlaybookTalkTrack> = {
    id: feeTrack.id,
    objectionType: feeTrack.objectionType,
  };
  if (approvedPlay) partial.approvedPlay = approvedPlay;
  if (neverDo.length) partial.neverDo = neverDo;
  if (anchorPoints.length) partial.anchorPoints = anchorPoints;

  if (!partial.approvedPlay && !partial.neverDo && !partial.anchorPoints) {
    return null;
  }
  return partial;
}

/**
 * When AI is unavailable, invent coaching plays for every empty talk-track
 * from extracted firm facts (rates + anchors + never-dos) - not stale defaults.
 */
export function synthesizeTalkTracksFromFacts(
  current: FirmPlaybook,
  patch: Partial<FirmPlaybook>,
  existing: Partial<PlaybookTalkTrack>[],
): Partial<PlaybookTalkTrack>[] {
  const list = patch.standardPermFeePct ?? current.standardPermFeePct;
  const floor = patch.feeFloorPct ?? current.feeFloorPct;
  const competitor = patch.competitorQuotePct ?? current.competitorQuotePct;
  const firm = patch.firmName ?? current.firmName;
  const anchors = (patch.valueAnchors ?? current.valueAnchors).slice(0, 4);
  const feeExisting = existing.find((t) => t.objectionType === "fee");
  const neverFromDoc = feeExisting?.neverDo?.length
    ? feeExisting.neverDo
    : [
        "Do not match a competitor quote in the first response",
        "Do not go below the floor without manager approval",
      ];
  const valueLine =
    anchors[0] ?? "the concrete value you deliver in the campaign";

  const templates: Record<
    string,
    Omit<Partial<PlaybookTalkTrack>, "id" | "objectionType">
  > = {
    fee: {
      approvedPlay:
        feeExisting?.approvedPlay ??
        `Ask what “too expensive” is measured against, restate ${valueLine}, then hold near ${list}% (floor ${floor}%). Trade scope before commission.`,
      anchorPoints: feeExisting?.anchorPoints ?? anchors,
      neverDo: neverFromDoc,
      exampleLine:
        feeExisting?.exampleLine ??
        `Before we talk rate, what are you comparing ${list}% to? Here’s how we protect your net proceeds…`,
    },
    other_agency: {
      approvedPlay: `Acknowledge the other relationship, ask what they’re still missing, then contrast ${firm}’s plan and ${valueLine}. Don’t trash the other agent.`,
      anchorPoints: [
        ...anchors.slice(0, 2),
        "What would make you open to a second conversation?",
        "Where the current campaign may be leaving money on the table",
      ].filter(Boolean).slice(0, 5),
      neverDo: [
        "Don’t badmouth the other agency",
        "Don’t invent exclusivity the seller hasn’t agreed to",
      ],
      exampleLine:
        "Totally fair you’ve spoken to someone else, what’s the one outcome you’re not sure they’ll deliver?",
    },
    just_cvs: {
      approvedPlay: `Reframe an appraisal-only request into a short discovery: purpose of the estimate, timeline, and how ${firm} would market if they listed. Offer a brief consult, not a free dump.`,
      anchorPoints: [
        "Clarify why they want the figure",
        "Share how appraisals differ from a campaign plan",
        valueLine,
      ].filter(Boolean),
      neverDo: [
        "Don’t email a number with no conversation",
        "Don’t commit to listing terms in the first message",
      ],
      exampleLine:
        "Happy to share how we’d appraise it, can I ask what decision the number is feeding?",
    },
    timing: {
      approvedPlay: `Respect “not selling now.” Ask permission to stay useful: market updates, street comps, and a light touch-back when timing changes.`,
      anchorPoints: [
        "Confirm timeline without pressure",
        "Offer low-effort value until they’re ready",
        "Ask how they’d like follow-up",
      ],
      neverDo: [
        "Don’t push for an immediate listing appointment",
        "Don’t guilt them about missing the market",
      ],
      exampleLine:
        "No rush, want me to send a quiet update when similar homes nearby move?",
    },
    exclusivity: {
      approvedPlay: `Treat authority/exclusivity concerns as process, not pressure. Explain what a sales authority covers, when it starts, and how ${firm} reports, then invite questions.`,
      anchorPoints: [
        "What the authority does and doesn’t lock in",
        "Reporting and cancellation expectations",
        "How commission at ${list}% (floor ${floor}%) sits in the agreement",
      ],
      neverDo: [
        "Don’t rush a signature on the first call",
        "Don’t hide term length or fees",
      ],
      exampleLine:
        "Before any paperwork, want a plain-English walkthrough of the authority and what you can change later?",
    },
  };

  // competitor mention for fee never-do when we know a quote
  if (competitor > 0 && !neverFromDoc.some((n) => /competitor/i.test(n))) {
    templates.fee.neverDo = [
      ...(templates.fee.neverDo ?? []),
      `Don’t match a ~${competitor}% competitor quote in the opening turn`,
    ].slice(0, 6);
  }

  const byId = new Map(existing.filter((t) => t.id).map((t) => [t.id!, t]));
  const out: Partial<PlaybookTalkTrack>[] = [];

  for (const track of current.talkTracks) {
    const prior = byId.get(track.id);
    const empty =
      !prior?.approvedPlay?.trim() &&
      !(prior?.anchorPoints?.length) &&
      !(prior?.neverDo?.length) &&
      !track.approvedPlay.trim() &&
      track.anchorPoints.length === 0 &&
      track.neverDo.length === 0;
    if (!empty && prior) {
      out.push(prior);
      continue;
    }
    if (!empty && !prior) continue;

    const tmpl = templates[track.objectionType];
    if (!tmpl) continue;
    out.push({
      id: track.id,
      objectionType: track.objectionType,
      ...tmpl,
      ...(prior ?? {}),
    });
  }

  return out;
}

/**
 * Deterministic heuristic import - no LLM required.
 * Same-line keyword matching so short docs don’t assign one rate to every field.
 */
export function extractPlaybookFromDocument(
  rawText: string,
  current: FirmPlaybook,
): PlaybookImportResult {
  const text = rawText.replace(/\u0000/g, "").trim();
  const findings: string[] = [];
  const patch: Partial<FirmPlaybook> = {};

  if (!text) {
    return {
      patch: {},
      findings: ["Empty document, nothing imported."],
      talkTrackPatches: [],
    };
  }

  const hits = moneyHits(text);
  const list = pickMoneyNear(
    hits,
    /\b(list|standard|our fee|our commission|pricing)\b/i,
  );
  const floor = pickMoneyNear(
    hits,
    /\b(floor|minimum|never (go )?below|do not (go )?below|approval)\b/i,
  );
  const competitor = pickMoneyNear(
    hits,
    /\b(competitor|alternative|quotes?|quoted|incumbent)\b/i,
  );

  if (list !== null) {
    patch.standardPermFeePct = list;
    findings.push(`Standard commission → ${list}%`);
  }
  if (floor !== null) {
    patch.feeFloorPct = floor;
    findings.push(`Fee floor → ${floor}%`);
  }
  if (competitor !== null) {
    patch.competitorQuotePct = competitor;
    findings.push(`Competitor quote → ${competitor}%`);
  }

  const anchors = pickAnchors(text);
  if (anchors.length > 0) {
    const merged = [...anchors, ...current.valueAnchors].filter(
      (v, i, arr) => arr.indexOf(v) === i,
    );
    patch.valueAnchors = merged.slice(0, 8);
    findings.push(`Value anchors ← ${anchors.length} from document`);
  }

  const firm = text.match(
    /(?:company|firm|agency)\s*(?:name)?\s*[:\-–]\s*([A-Za-z0-9][A-Za-z0-9 .,&-]{1,60})/i,
  );
  if (firm?.[1]) {
    patch.firmName = firm[1].trim();
    findings.push(`Company name → ${patch.firmName}`);
  }

  const stamp = new Date().toISOString();
  const excerpt =
    text.length > 4000 ? `${text.slice(0, 4000)}\n…[truncated]` : text;
  patch.faqNotes = [
    current.faqNotes.trim(),
    "",
    `--- Imported ${stamp} ---`,
    excerpt,
  ]
    .filter((s, i, arr) => !(s === "" && arr[i - 1] === ""))
    .join("\n")
    .trim();
  findings.push("Appended source text to FAQ / notes");

  if (
    findings.length === 1 ||
    (findings.length === 2 && findings[0]?.startsWith("Appended"))
  ) {
    findings.unshift("No priced fields detected, FAQ notes updated only");
  }

  const nextList = patch.standardPermFeePct ?? current.standardPermFeePct;
  const nextFloor = patch.feeFloorPct ?? current.feeFloorPct;
  if (nextFloor > nextList) {
    patch.feeFloorPct = nextList;
    findings.push("Adjusted floor down to list (floor cannot exceed list)");
  }

  const talkTrackPatches: Partial<PlaybookTalkTrack>[] = [];
  const feePatch = pickFeeTalkTrackPatch(text, current);
  if (feePatch) {
    talkTrackPatches.push(feePatch);
    findings.push(
      "Talk-track · fee/commission play filled from document (review before Publish)",
    );
  }

  return { patch, findings, talkTrackPatches };
}

export function mergePlaybookImport(
  current: FirmPlaybook,
  patch: Partial<FirmPlaybook>,
): FirmPlaybook {
  return {
    ...current,
    ...patch,
    valueAnchors: patch.valueAnchors ?? current.valueAnchors,
    talkTracks: current.talkTracks,
    faqNotes: patch.faqNotes ?? current.faqNotes,
  };
}
