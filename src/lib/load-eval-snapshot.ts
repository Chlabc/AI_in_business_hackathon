import raw from "@/data/eval-snapshot.json";
import type { EvalSnapshot } from "@/lib/eval-snapshot";

/**
 * Load the committed eval snapshot.
 * Keep the JSON import here - not in `page.tsx` - so Turbopack/HMR cannot
 * confuse the JSON default export with the page component default (which
 * surfaces as “Element type is invalid … got: object”).
 */
export function loadEvalSnapshot(): EvalSnapshot {
  return raw as EvalSnapshot;
}
