/**
 * ElevenLabs / LiveKit WebRTC often emits empty or hangup-related errors
 * that look scary in the Next overlay but are not actionable for the user.
 */
export function formatUnknownError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    try {
      const s = JSON.stringify(err);
      if (s && s !== "{}") return s;
    } catch {
      /* ignore */
    }
  }
  return "";
}

const BENIGN_SUBSTRINGS = [
  "signal stream",
  "reading from signal",
  "unknown error",
  "server error: unknown",
  "datachannel error",
  "data channel",
  "user-initiated abort",
  "publisher data channel",
  "closed unexpectedly",
  "websocket error during connection",
  "connection establishment",
  "ice connection",
  "negotiationneeded",
  "pc connection state",
  // Firefox often surfaces WebRTC teardown as a fetch NetworkError overlay.
  "networkerror when attempting to fetch",
  "networkerror when attempting to fetch resource",
] as const;

export function isBenignElevenLabsError(...parts: unknown[]): boolean {
  const text = parts
    .map((a) => {
      if (typeof a === "string") return a;
      return formatUnknownError(a) || String(a);
    })
    .join(" ")
    .toLowerCase()
    .trim();

  if (!text || text === "{}" || text === "[object object]") return true;

  if (/server error:\s*(\{\}|unknown)?\s*$/i.test(text)) return true;
  if (text === "error" || text === "unknown") return true;

  return BENIGN_SUBSTRINGS.some((s) => text.includes(s));
}

/** Map known ElevenLabs config errors to actionable copy for the drill UI. */
export function explainElevenLabsError(raw: string): string {
  const text = raw.trim();
  if (!text) return text;
  if (/missing overrides permissions/i.test(text)) {
    return (
      `${text}\n\n` +
      "Fix in ElevenLabs → Agents → Cornerman Buyer → Security: enable overrides for " +
      "First message and System prompt, then try Start drill again. " +
      "(Cornerman sends per-scenario buyer prompts; those toggles must be on.)"
    );
  }
  if (/conversation not found/i.test(text)) {
    return (
      `${text}\n\n` +
      "Usually a follow-on from a failed start (e.g. overrides not enabled). " +
      "Hard-refresh, fix any override error above, then Start drill again."
    );
  }
  return text;
}
