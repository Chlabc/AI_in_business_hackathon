import type { ScoringMode } from "@/lib/score-llm";

/** Safe diagnostics for why a drill used AI vs heuristic (never includes secrets). */
export type ScoringMeta = {
  mode: ScoringMode;
  /** True if a non-empty XAI_API_KEY is visible to this serverless process. */
  xaiKeyPresent: boolean;
  llmUsed: boolean;
  /** Set when method is heuristic after an AI attempt was expected. */
  fallbackReason?:
    | "mode_heuristic"
    | "xai_key_missing"
    | "llm_timeout_or_null"
    | "llm_invalid_json"
    | "llm_empty_content"
    | "llm_incomplete_rubric"
    | "llm_http_error"
    | "ok";
  model?: string;
  vercelEnv?: string | null;
  /** Safe detail e.g. "HTTP 404" — never includes secrets. */
  detail?: string;
};
