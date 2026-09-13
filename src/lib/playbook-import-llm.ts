import type { FirmPlaybook, PlaybookTalkTrack } from "@/lib/playbook";
import type { ObjectionType } from "@/lib/types";

export type LlmPlaybookExtract = {
  firmName: string | null;
  vertical: string | null;
  standardPermFeePct: number | null;
  feeFloorPct: number | null;
  competitorQuotePct: number | null;
  valueAnchors: string[];
  talkTrackPatches: Array<{
    objectionType: ObjectionType;
    title?: string | null;
    approvedPlay?: string | null;
    anchorPoints?: string[];
    neverDo?: string[];
    exampleLine?: string | null;
    confidence?: number;
  }>;
  notes: string[];
};

export type MergedLlmImport = {
  patch: Partial<FirmPlaybook>;
  talkTrackPatches: Partial<PlaybookTalkTrack>[];
  findings: string[];
  method: "llm" | "llm+heuristic";
};

/** Commission % — keep up to 3 decimal places, range (0, 100]. */
function clampMoney(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const v = Math.round(n * 1000) / 1000;
  if (v <= 0 || v > 100) return null;
  return v;
}

function asStringArray(v: unknown, max = 8): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(String)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4 && s.length <= 160)
    .slice(0, max);
}

/**
 * Merge LLM extract with heuristic patch.
 * Prefer LLM numbers when valid; on large disagreement keep heuristic and note it.
 */
export function mergeLlmWithHeuristic(
  current: FirmPlaybook,
  heuristicPatch: Partial<FirmPlaybook>,
  llm: LlmPlaybookExtract,
): MergedLlmImport {
  const findings = [...(llm.notes ?? []).map((n) => `AI: ${n}`)];
  const patch: Partial<FirmPlaybook> = { ...heuristicPatch };
  let usedLlm = false;

  const moneyFields = [
    "standardPermFeePct",
    "feeFloorPct",
    "competitorQuotePct",
  ] as const;

  for (const field of moneyFields) {
    const llmVal = clampMoney(llm[field]);
    const heurVal =
      typeof heuristicPatch[field] === "number" ? heuristicPatch[field] : null;
    if (llmVal !== null && heurVal !== null && Math.abs(llmVal - heurVal) > 0.5) {
      findings.push(
        `AI disagreed on ${field} (${llmVal}% vs rules ${heurVal}%) — kept rules parse; review`,
      );
      continue;
    }
    if (llmVal !== null) {
      patch[field] = llmVal;
      usedLlm = true;
      if (heurVal === null) {
        findings.push(`AI ${field} → ${llmVal}%`);
      }
    }
  }

  if (typeof llm.firmName === "string" && llm.firmName.trim()) {
    patch.firmName = llm.firmName.trim().slice(0, 80);
    usedLlm = true;
  }
  if (typeof llm.vertical === "string" && llm.vertical.trim()) {
    patch.vertical = llm.vertical.trim().slice(0, 120);
    usedLlm = true;
  }

  const llmAnchors = asStringArray(llm.valueAnchors, 8);
  if (llmAnchors.length > 0) {
    const base = patch.valueAnchors ?? current.valueAnchors;
    patch.valueAnchors = [...llmAnchors, ...base].filter(
      (v, i, arr) => arr.indexOf(v) === i,
    ).slice(0, 8);
    usedLlm = true;
    findings.push(`AI value anchors ← ${llmAnchors.length}`);
  }

  const nextList = patch.standardPermFeePct ?? current.standardPermFeePct;
  const nextFloor = patch.feeFloorPct ?? current.feeFloorPct;
  if (nextFloor > nextList) {
    patch.feeFloorPct = nextList;
    findings.push("Adjusted floor down to list (floor cannot exceed list)");
  }

  // Preserve FAQ append from heuristic if present
  if (heuristicPatch.faqNotes) {
    patch.faqNotes = heuristicPatch.faqNotes;
  }

  const talkTrackPatches: Partial<PlaybookTalkTrack>[] = [];
  for (const t of llm.talkTrackPatches ?? []) {
    const confidence =
      typeof t.confidence === "number" && Number.isFinite(t.confidence)
        ? t.confidence
        : 0.5;
    if (confidence < 0.6) continue;
    const match = current.talkTracks.find(
      (x) => x.objectionType === t.objectionType,
    );
    if (!match) continue;
    const partial: Partial<PlaybookTalkTrack> = { id: match.id };
    if (typeof t.title === "string" && t.title.trim()) {
      partial.title = t.title.trim();
    }
    if (typeof t.approvedPlay === "string" && t.approvedPlay.trim()) {
      partial.approvedPlay = t.approvedPlay.trim();
    }
    const anchors = asStringArray(t.anchorPoints, 8);
    if (anchors.length) partial.anchorPoints = anchors;
    const never = asStringArray(t.neverDo, 8);
    if (never.length) partial.neverDo = never;
    if (typeof t.exampleLine === "string" && t.exampleLine.trim()) {
      partial.exampleLine = t.exampleLine.trim();
    }
    if (
      partial.approvedPlay ||
      partial.anchorPoints ||
      partial.neverDo ||
      partial.exampleLine ||
      partial.title
    ) {
      talkTrackPatches.push(partial);
      usedLlm = true;
      findings.push(
        `AI proposed talk-track edits for ${match.title} (review — off by default)`,
      );
    }
  }

  return {
    patch,
    talkTrackPatches,
    findings,
    method: usedLlm ? "llm+heuristic" : "llm",
  };
}

function parseJsonObject(content: string): LlmPlaybookExtract | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]) as Partial<LlmPlaybookExtract>;
    return {
      firmName: typeof raw.firmName === "string" ? raw.firmName : null,
      vertical: typeof raw.vertical === "string" ? raw.vertical : null,
      standardPermFeePct: clampMoney(raw.standardPermFeePct),
      feeFloorPct: clampMoney(raw.feeFloorPct),
      competitorQuotePct: clampMoney(raw.competitorQuotePct),
      valueAnchors: asStringArray(raw.valueAnchors, 8),
      talkTrackPatches: Array.isArray(raw.talkTrackPatches)
        ? raw.talkTrackPatches
        : [],
      notes: Array.isArray(raw.notes) ? raw.notes.map(String) : [],
    };
  } catch {
    return null;
  }
}

export type PlaybookLlmProvider = "xai" | "ollama" | "off";

export function resolvePlaybookLlmProvider(): PlaybookLlmProvider {
  const raw = (process.env.PLAYBOOK_LLM_PROVIDER ?? "auto").toLowerCase();
  if (raw === "off" || raw === "heuristic") return "off";
  if (raw === "ollama") return "ollama";
  if (raw === "xai") return "xai";
  // auto
  if (process.env.XAI_API_KEY) return "xai";
  if (process.env.PLAYBOOK_LLM_BASE_URL) return "ollama";
  return "off";
}

/**
 * Call chat-completions compatible endpoint (xAI or Ollama OpenAI-compat).
 * Returns null on any failure — caller falls back to heuristic.
 */
export async function extractPlaybookWithLlm(
  text: string,
  current: FirmPlaybook,
): Promise<LlmPlaybookExtract | null> {
  const provider = resolvePlaybookLlmProvider();
  if (provider === "off") return null;

  let baseUrl: string;
  let apiKey: string | undefined;
  let model: string;

  if (provider === "xai") {
    apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return null;
    baseUrl = "https://api.x.ai/v1";
    model = process.env.PLAYBOOK_LLM_MODEL ?? "grok-4.5";
  } else {
    baseUrl = (
      process.env.PLAYBOOK_LLM_BASE_URL ?? "http://127.0.0.1:11434/v1"
    ).replace(/\/$/, "");
    apiKey = process.env.PLAYBOOK_LLM_API_KEY; // optional for Ollama
    model = process.env.PLAYBOOK_LLM_MODEL ?? "qwen2.5:14b";
  }

  const excerpt = text.length > 12000 ? `${text.slice(0, 12000)}\n…[truncated]` : text;
  const trackTypes = current.talkTracks.map((t) => t.objectionType);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You extract Australian residential real-estate agency playbook fields from a company document.
Return ONLY JSON with this shape:
{"firmName":string|null,"vertical":string|null,"standardPermFeePct":number|null,"feeFloorPct":number|null,"competitorQuotePct":number|null,"valueAnchors":string[],"talkTrackPatches":[{"objectionType":string,"title":string|null,"approvedPlay":string|null,"anchorPoints":string[],"neverDo":string[],"exampleLine":string|null,"confidence":0-1}],"notes":string[]}
Rules:
- Prefer numbers that appear in the document; never invent standard/floor/competitor rates.
- If unsure, return null for that field.
- Fees are commission percentages excluding GST (e.g. 2.5 means 2.5%), range (0, 100].
- Floor must be ≤ standard when both present.
- valueAnchors: max 8, each ≤ 160 chars (appraisal, marketing, negotiation, seller updates).
- talkTrackPatches: only for objection types in [${trackTypes.join(", ")}]; confidence ≥ 0.6 only when the doc clearly supports coaching edits.
- Never invent policies. Never put seller-adversary instructions into talk-tracks.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              currentFirm: {
                firmName: current.firmName,
                standardCommissionPct: current.standardPermFeePct,
                floorPct: current.feeFloorPct,
                competitorPct: current.competitorQuotePct,
              },
              document: excerpt,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    return parseJsonObject(content);
  } catch {
    return null;
  }
}
