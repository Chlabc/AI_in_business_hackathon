/**
 * Run from repo root: npx tsx --tsconfig tsconfig.json src/lib/playbook-draft.selftest.ts
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
    standardPermFeePct: 2.75,
    feeFloorPct: 2.1,
    competitorQuotePct: 1.8,
    valueAnchors: ["New campaign cadence anchor", ...live.valueAnchors].slice(
      0,
      8,
    ),
  },
  {
    talkTrackPatches: [
      {
        id: live.talkTracks[0]!.id,
        approvedPlay:
          "Ask what the lower commission includes before discussing any concession.",
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
assert(working.standardPermFeePct === 2.75, "accepted list applied");
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
  published.talkTracks[0]!.approvedPlay.includes("lower commission"),
  "accepted talk-track should publish",
);

const noAnchors = applyAcceptedProposals(
  live,
  proposals.map((p) =>
    p.field === "valueAnchors" ? { ...p, accepted: false } : p,
  ),
);
assert(
  !noAnchors.valueAnchors.includes("New campaign cadence anchor"),
  "unchecked anchors must not publish",
);

console.log("playbook-draft.selftest: ok (real-estate %)");
