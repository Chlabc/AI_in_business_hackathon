/**
 * Shared SpaceXAI (xAI) chat-completions helper.
 * Used by playbook import and practice scoring — keep keys server-side only.
 */

export type XaiChatJsonOptions = {
  system: string;
  user: string;
  temperature?: number;
  /** Default 25s — matches playbook import budget. */
  timeoutMs?: number;
  /** Override model; defaults to SCORING_LLM_MODEL / PLAYBOOK_LLM_MODEL / fast non-reasoning. */
  model?: string;
  /** Request JSON object mode when the API supports it (default true). */
  jsonMode?: boolean;
};

export type XaiChatJsonFailure =
  | "xai_key_missing"
  | "llm_timeout_or_null"
  | "llm_http_error"
  | "llm_empty_content"
  | "llm_invalid_json";

export type XaiChatJsonResult =
  | { ok: true; value: unknown; model: string; ms: number }
  | { ok: false; reason: XaiChatJsonFailure; detail?: string; model?: string; ms?: number };

/**
 * Read server secrets via bracket access so the bundler cannot replace them
 * with `undefined` at build time when the key was missing during `next build`.
 */
export function readXaiApiKey(): string | undefined {
  const env = process.env;
  const raw =
    env["XAI_API_KEY"]?.trim() ||
    env["xai_api_key"]?.trim() ||
    undefined;
  return raw || undefined;
}

/**
 * Prefer a fast non-reasoning model for live scoring.
 * Override with SCORING_LLM_MODEL / PLAYBOOK_LLM_MODEL if needed.
 */
export function readScoringModel(): string {
  const env = process.env;
  return (
    env["SCORING_LLM_MODEL"]?.trim() ||
    env["PLAYBOOK_LLM_MODEL"]?.trim() ||
    "grok-4-1-fast-non-reasoning"
  );
}

/** Try these in order when the preferred scoring model returns HTTP errors. */
export function scoringModelFallbackChain(): string[] {
  const preferred = readScoringModel();
  const chain = [
    preferred,
    "grok-4-1-fast-non-reasoning",
    "grok-4-fast-non-reasoning",
    "grok-4.5",
    "grok-4.3",
  ];
  return [...new Set(chain.filter(Boolean))];
}

function defaultModel(): string {
  return readScoringModel();
}

/** Extract the first JSON object from a model reply (allows markdown fences). */
export function extractJsonObject(content: string): unknown | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let raw = (fenced?.[1] ?? trimmed).trim();

  // Strip common prose prefixes before the first `{`.
  const brace = raw.indexOf("{");
  if (brace > 0) raw = raw.slice(brace);

  // Try direct parse first.
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    /* fall through */
  }

  // Balance braces in case of trailing commentary.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as unknown;
  } catch {
    return null;
  }
}

/**
 * Call xAI chat completions and parse a JSON object from the reply.
 * Returns a typed result so callers can show accurate fallback reasons.
 */
export async function xaiChatJsonResult(
  opts: XaiChatJsonOptions,
): Promise<XaiChatJsonResult> {
  const apiKey = readXaiApiKey();
  if (!apiKey) return { ok: false, reason: "xai_key_missing" };

  const model = opts.model?.trim() || defaultModel();
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const jsonMode = opts.jsonMode !== false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  const ms = () => Date.now() - started;

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: opts.temperature ?? 0.2,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[xai] chat failed", res.status, detail.slice(0, 400));
      return {
        ok: false,
        reason: "llm_http_error",
        detail: `HTTP ${res.status}`,
        model,
        ms: ms(),
      };
    }

    const data = (await res.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          reasoning_content?: string | null;
        };
      }[];
    };
    const message = data.choices?.[0]?.message;
    const content = (message?.content ?? "").trim();
    if (!content) {
      console.warn(
        "[xai] empty content",
        model,
        "reasoning?",
        Boolean(message?.reasoning_content),
      );
      return { ok: false, reason: "llm_empty_content", model, ms: ms() };
    }

    const value = extractJsonObject(content);
    if (value === null || typeof value !== "object") {
      console.warn("[xai] invalid JSON", model, content.slice(0, 240));
      return {
        ok: false,
        reason: "llm_invalid_json",
        detail: content.slice(0, 120),
        model,
        ms: ms(),
      };
    }

    return { ok: true, value, model, ms: ms() };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      console.warn("[xai] chat timed out after", timeoutMs, "ms", model);
      return { ok: false, reason: "llm_timeout_or_null", model, ms: ms() };
    }
    console.error("[xai] chat error", err);
    return {
      ok: false,
      reason: "llm_http_error",
      detail: err instanceof Error ? err.message : "error",
      model,
      ms: ms(),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Back-compat wrapper used by playbook import. */
export async function xaiChatJson(
  opts: XaiChatJsonOptions,
): Promise<unknown | null> {
  const result = await xaiChatJsonResult(opts);
  return result.ok ? result.value : null;
}

export function xaiConfigured(): boolean {
  return Boolean(readXaiApiKey());
}
