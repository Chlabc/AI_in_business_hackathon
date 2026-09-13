import { extractText, getDocumentProxy } from "unpdf";

export type ExtractedDocument = {
  text: string;
  source: "pdf" | "text";
  filename?: string;
  pageCount?: number;
  warning?: string;
};

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_CHARS = 200_000;

function isPdf(filename: string, mime: string): boolean {
  return (
    mime === "application/pdf" ||
    mime === "application/x-pdf" ||
    /\.pdf$/i.test(filename)
  );
}

/**
 * Pull plain text from an uploaded buffer.
 * Text-layer PDFs only — scanned/image PDFs need OCR (out of scope).
 */
export async function extractDocumentText(
  data: ArrayBuffer | Uint8Array,
  opts: { filename?: string; mime?: string } = {},
): Promise<ExtractedDocument> {
  const filename = opts.filename ?? "upload";
  const mime = opts.mime ?? "";
  // unpdf/pdf.js require a true Uint8Array (Node Buffer is rejected).
  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  if (bytes.byteLength > MAX_BYTES) {
    throw new Error("File too large (max 8MB)");
  }

  if (!isPdf(filename, mime)) {
    const text = new TextDecoder("utf-8", { fatal: false })
      .decode(bytes)
      .replace(/\u0000/g, "")
      .trim();
    if (!text) throw new Error("Empty document — nothing to extract");
    return {
      text: text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text,
      source: "text",
      filename,
      warning:
        text.length > MAX_CHARS
          ? "Text truncated to 200k characters"
          : undefined,
    };
  }

  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const joined = (Array.isArray(text) ? text.join("\n\n") : String(text ?? ""))
    .replace(/\u0000/g, "")
    .trim();

  if (!joined) {
    throw new Error(
      "No extractable text in this PDF. Scanned/image PDFs need OCR (not supported yet). Export as text or a text-layer PDF.",
    );
  }

  const clipped =
    joined.length > MAX_CHARS ? joined.slice(0, MAX_CHARS) : joined;

  return {
    text: clipped,
    source: "pdf",
    filename,
    pageCount: totalPages,
    warning:
      joined.length > MAX_CHARS
        ? `Extracted ${totalPages} page(s); truncated to 200k characters`
        : `Extracted text from ${totalPages} PDF page(s)`,
  };
}
