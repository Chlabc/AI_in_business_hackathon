/**
 * Run: npx tsx src/lib/playbook-draft.selftest.ts
 */
import { defaultPlaybook } from "@/lib/playbook";
import {
  applyAcceptedProposals,
  buildProposals,
  workingFromProposals,
} from "@/lib/playbook-draft-core";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const live = defaultPlaybook();

const proposals = buildProposals(
  live,
  {
    standardPermFeePct: 120,
    feeFloorPct: 90,
    competitorQuotePct: 75,
    valueAnchors: ["New anchor A", ...live.valueAnchors].slice(0, 8),
  },
  {
    talkTrackPatches: [
      {
        id: live.talkTracks[0]!.id,
        approvedPlay: "Ask what too expensive means before moving price.",
      },
    ],
    source: "heuristic",
  },
);

assert(proposals.length >= 4, "expected firm + track proposals");
const list = proposals.find((p) => p.field === "standardPermFeePct");
const track = proposals.find((p) => p.field.startsWith("talkTrack:"));
assert(list?.accepted === true, "firm facts default accepted");
assert(track?.accepted === false, "talk-tracks default rejected");

const working = workingFromProposals(live, proposals);
assert(working.standardPermFeePct === 120, "accepted list applied");
assert(
  working.talkTracks[0]!.approvedPlay === live.talkTracks[0]!.approvedPlay,
  "rejected talk-track must not change working",
);

const published = applyAcceptedProposals(
  live,
  proposals.map((p) =>
    p.field.startsWith("talkTrack:") ? { ...p, accepted: true } : p,
  ),
);
assert(
  published.talkTracks[0]!.approvedPlay.includes("too expensive"),
  "accepted talk-track should publish",
);

// Uncheck anchors — should not appear
const noAnchors = applyAcceptedProposals(
  live,
  proposals.map((p) =>
    p.field === "valueAnchors" ? { ...p, accepted: false } : p,
  ),
);
assert(
  !noAnchors.valueAnchors.includes("New anchor A"),
  "unchecked anchors must not publish",
);

console.log("playbook-draft.selftest: ok");
