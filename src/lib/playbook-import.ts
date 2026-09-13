import type { FirmPlaybook } from "@/lib/playbook";

export type PlaybookImportResult = {
  /** Partial patch to merge into the current playbook draft */
  patch: Partial<FirmPlaybook>;
  /** Human-readable notes about what was detected */
  findings: string[];
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

/**
 * Deterministic heuristic import — no LLM required.
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
    return { patch: {}, findings: ["Empty document — nothing imported."] };
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
    findings.unshift("No priced fields detected — FAQ notes updated only");
  }

  const nextList = patch.standardPermFeePct ?? current.standardPermFeePct;
  const nextFloor = patch.feeFloorPct ?? current.feeFloorPct;
  if (nextFloor > nextList) {
    patch.feeFloorPct = nextList;
    findings.push("Adjusted floor down to list (floor cannot exceed list)");
  }

  return { patch, findings };
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
