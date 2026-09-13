import { NextResponse } from "next/server";
import { jsonAuthError, requireRole } from "@/lib/auth";
import { getPlaybook, type PlaybookTalkTrack } from "@/lib/playbook";
import { extractDocumentText } from "@/lib/playbook-doc-extract";
import { extractPlaybookFromDocument } from "@/lib/playbook-import";
import {
  extractPlaybookWithLlm,
  mergeLlmWithHeuristic,
  resolvePlaybookLlmProvider,
} from "@/lib/playbook-import-llm";
import {
  buildProposals,
  draftStatus,
  savePlaybookDraft,
  workingFromProposals,
  type PlaybookDraft,
} from "@/lib/playbook-draft";

type ImportMode = "heuristic" | "llm" | "auto";

function normalizeMode(raw: unknown): ImportMode {
  const modeRaw = String(raw ?? "auto").toLowerCase();
  if (modeRaw === "heuristic" || modeRaw === "llm" || modeRaw === "auto") {
    return modeRaw;
  }
  return "auto";
}

async function readImportPayload(request: Request): Promise<{
  text: string;
  mode: ImportMode;
  extractNote?: string;
  extractedText?: string;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const mode = normalizeMode(form.get("mode"));
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new HttpError("Upload a file (PDF, .txt, or .md)", 400);
    }
    const buffer = await file.arrayBuffer();
    const extracted = await extractDocumentText(buffer, {
      filename: file.name,
      mime: file.type,
    });
    return {
      text: extracted.text,
      mode,
      extractNote: extracted.warning,
      extractedText: extracted.text,
    };
  }

  let body: {
    text?: string;
    mode?: string;
    pdfBase64?: string;
    filename?: string;
  };
  try {
    body = await request.json();
  } catch {
    throw new HttpError("Invalid JSON", 400);
  }

  const mode = normalizeMode(body.mode);

  if (typeof body.pdfBase64 === "string" && body.pdfBase64.trim()) {
    const raw = body.pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(raw, "base64");
    const extracted = await extractDocumentText(buffer, {
      filename: body.filename ?? "upload.pdf",
      mime: "application/pdf",
    });
    return {
      text: extracted.text,
      mode,
      extractNote: extracted.warning,
      extractedText: extracted.text,
    };
  }

  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) {
    throw new HttpError("Paste or upload document text / PDF first", 400);
  }
  return { text, mode };
}

class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("manager");

    let payload: Awaited<ReturnType<typeof readImportPayload>>;
    try {
      payload = await readImportPayload(request);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      const msg = e instanceof Error ? e.message : "Could not read document";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { text, mode, extractNote, extractedText } = payload;

    if (text.length > 200_000) {
      return NextResponse.json(
        { error: "Document too large (max ~200k characters)" },
        { status: 400 },
      );
    }

    const current = await getPlaybook();
    const heuristic = extractPlaybookFromDocument(text, current);

    let patch = heuristic.patch;
    const findings = [...heuristic.findings];
    if (extractNote) findings.unshift(extractNote);

    let talkTrackPatches: Partial<PlaybookTalkTrack>[] = [];
    let method: "heuristic" | "llm" | "llm+heuristic" = "heuristic";
    let source: "heuristic" | "llm" = "heuristic";

    const wantLlm =
      mode === "llm" ||
      (mode === "auto" && resolvePlaybookLlmProvider() !== "off");

    if (wantLlm) {
      const llm = await extractPlaybookWithLlm(text, current);
      if (llm) {
        const merged = mergeLlmWithHeuristic(current, heuristic.patch, llm);
        patch = merged.patch;
        talkTrackPatches = merged.talkTrackPatches;
        findings.push(...merged.findings);
        method = merged.method;
        source = "llm";
      } else {
        findings.push("AI parse unavailable — used rules only");
      }
    }

    const proposals = buildProposals(current, patch, {
      talkTrackPatches,
      source,
    });
    const working = workingFromProposals(current, proposals);
    const draft: PlaybookDraft = {
      working,
      liveUpdatedAt: current.updatedAt,
      proposals,
      importExcerpt: text.length > 500 ? `${text.slice(0, 500)}…` : text,
      status: draftStatus(current, working, proposals),
      updatedAt: new Date().toISOString(),
      method,
    };
    await savePlaybookDraft(draft);

    return NextResponse.json({
      patch,
      findings,
      proposals,
      draft: working,
      storedDraft: draft,
      method,
      extractedText: extractedText ?? text,
    });
  } catch (e) {
    return (
      jsonAuthError(e) ??
      NextResponse.json({ error: "Import failed" }, { status: 500 })
    );
  }
}
