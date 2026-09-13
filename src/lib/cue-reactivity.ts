export type CueMode = "off" | "soft" | "full";

export const CUE_MODE_STORAGE_KEY = "cornerman.cueMode";

export function parseCueMode(raw: string | null | undefined): CueMode {
  if (raw === "off" || raw === "soft" || raw === "full") return raw;
  return "soft";
}

/**
 * Pick which talk-track anchor to spotlight from the latest client (agent) turn.
 * Heuristic only — coaching stays in our UI, never in ElevenLabs.
 */
export function pickSpotlightIndex(
  agentText: string,
  anchorPoints: string[],
): number {
  if (!anchorPoints.length) return 0;
  const t = agentText.toLowerCase();

  const find = (re: RegExp) =>
    anchorPoints.findIndex((a) => re.test(a.toLowerCase()));

  if (
    /too high|too expensive|\$|commission|fee|price|cost|cheaper|quoted|discount|budget/.test(
      t,
    )
  ) {
    const i = find(/compar|clarif|expensive|against|switch|anchor|value|price/);
    if (i >= 0) return i;
  }
  if (
    /competitor|already (have|use)|relationship|switch|incumbent|rival/.test(
      t,
    )
  ) {
    const i = find(/relationship|gap|incumbent|pilot|trial|respect/);
    if (i >= 0) return i;
  }
  if (/think|get back|later|not sure|partner|conveyancer|authority/.test(t)) {
    const i = find(/next|follow|check-in|diary|date|step|authority|summary/);
    if (i >= 0) return i;
  }
  if (/not (looking|buying|interested)|no thanks|brush|not evaluating/.test(t)) {
    const i = find(/pushy|insight|check-in|useful|roadmap/);
    if (i >= 0) return i;
  }
  if (/appraisal|estimate|send me/.test(t)) {
    const i = find(/quality|property|condition|appraisal|timing/);
    if (i >= 0) return i;
  }

  return 0;
}
