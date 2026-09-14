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
  /** Override model; defaults to SCORING_LLM_MODEL / PLAYBOOK_LLM_MODEL / grok-4.5 */
  model?: string;
};

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

export function readScoringModel(): string {
  const env = process.env;
  return (
    env["SCORING_LLM_MODEL"]?.trim() ||
    env["PLAYBOOK_LLM_MODEL"]?.trim() ||
    "grok-4.5"
  );
}

function defaultModel(): string {
  return readScoringModel();
}

/** Extract the first JSON object from a model reply (allows markdown fences). */
export function extractJsonObject(content: string): unknown | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() || content;
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
 * Returns null on missing key, HTTP error, timeout, or bad JSON.
 *
 * Uses both AbortSignal.timeout and a Promise.race wall clock so a stuck
 * upstream can never hang the Next.js score route (browser NetworkError).
 */
export async function xaiChatJson(
  opts: XaiChatJsonOptions,
): Promise<unknown | null> {
  const apiKey = readXaiApiKey();
  if (!apiKey) return null;

  const model = opts.model?.trim() || defaultModel();
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const run = async (): Promise<unknown | null> => {
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
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error(
          "[xai] chat failed",
          res.status,
          await res.text().catch(() => ""),
        );
        return null;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      return extractJsonObject(content);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name !== "AbortError" && name !== "TimeoutError") {
        console.error("[xai] chat error", err);
      } else {
        console.warn("[xai] chat timed out after", timeoutMs, "ms");
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  return Promise.race([
    run(),
    new Promise<null>((resolve) => {
      setTimeout(() => {
        controller.abort();
        resolve(null);
      }, timeoutMs + 500);
    }),
  ]);
}

export function xaiConfigured(): boolean {
  return Boolean(readXaiApiKey());
}
