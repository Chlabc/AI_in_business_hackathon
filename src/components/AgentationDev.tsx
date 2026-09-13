"use client";

import { Agentation } from "agentation";

/**
 * Dev-only visual feedback toolbar (Agentation).
 * Must stay behind NODE_ENV so it never ships in production.
 */
export function AgentationDev() {
  if (process.env.NODE_ENV !== "development") return null;
  return <Agentation />;
}
