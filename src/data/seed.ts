import type { CallRecord, Firm, Rep, TalkTrack } from "@/lib/types";

/**
 * Demo firm — real estate (fictional).
 * Fee fields store commission percentages. These are fictional agency policies,
 * excluding GST, with marketing costs separate; not industry benchmarks.
 */
export const FIRM: Firm = {
  id: "firm_northline",
  name: "Northline",
  vertical: "Australian residential real estate",
  standardPermFeePct: 2.5, // fictional standard commission, excluding GST
  feeFloorPct: 2, // never go below 2% without approval
  valueAnchors: [
    "local comparable sales to support the appraisal",
    "a tailored property marketing and inspection plan",
    "buyer qualification, negotiation support and regular seller updates",
  ],
};

export const REPS: Rep[] = [
  {
    id: "rep_demo_alex",
    name: "Alex Chen",
    title: "Real Estate Agent",
    agency: FIRM.name,
    weeksInRole: 14,
  },
];

export const TALK_TRACKS: TalkTrack[] = [
  {
    id: "tt_price_anchor",
    objectionType: "fee",
    title: "Commission pushback — explore, then anchor value",
    approvedPlay:
      "Ask what the lower commission includes, explain the appraisal, marketing and negotiation service, then hold the approved fee. Do not discount in the first response.",
    anchorPoints: [
      "Clarify the comparison (commission, marketing costs and service included)",
      "Anchor on local market evidence, the marketing plan and negotiation support",
      "Review the campaign scope before discussing a commission concession",
    ],
    neverDo: [
      "Immediate discount without a question",
      "Invent a price below the firm floor",
      "Apologise for list price as if it were unjustified",
    ],
  },
  {
    id: "tt_competitor",
    objectionType: "other_agency",
    title: "We already have an agent",
    approvedPlay:
      "Respect their existing agent, ask what matters in selling, and offer a no-obligation appraisal if useful.",
    anchorPoints: [
      "Respect the incumbent relationship",
      "Explore unmet needs in the selling plan",
      "Offer an appraisal without pressuring them to switch",
    ],
    neverDo: ["Badmouth the competitor", "Pressure them to break an existing agency agreement"],
  },
  {
    id: "tt_send_deck",
    objectionType: "just_cvs",
    title: "Just send an appraisal estimate",
    approvedPlay:
      "Ask about the property and selling plans before offering a tailored appraisal appointment. Explain that an appraisal is an estimate, not a formal valuation.",
    anchorPoints: [
      "Understand the property before suggesting a price",
      "Ask about condition, timing and the owner’s priorities",
      "Offer a tailored appraisal, not a guaranteed sale price",
    ],
    neverDo: ["Promise a sale price without understanding the property"],
  },
  {
    id: "tt_timing",
    objectionType: "timing",
    title: "Not selling right now",
    approvedPlay:
      "Ask about their selling timeframe, offer one local market insight, and seek permission for a later check-in.",
    anchorPoints: ["Stay useful without being pushy", "Diary a follow-up"],
    neverDo: ["Push for an appointment after a clear refusal"],
  },
  {
    id: "tt_procurement",
    objectionType: "exclusivity",
    title: "Need to discuss the sales authority",
    approvedPlay:
      "Offer a clear service and fee summary for the seller and their partner or conveyancer, then agree a follow-up date.",
    anchorPoints: ["Sales authority and fee summary ready", "Time-boxed next step with a date"],
    neverDo: ["Pressure a seller to sign before reviewing the authority"],
  },
];

/**
 * Seeded call outcomes for Alex — labelled demo data.
 * Ground truth weak spot: pricing stage / price objection (high discount rate).
 * feeAskedPct / feeEndedPct = commission percentages.
 */
export const CALLS: CallRecord[] = [
  {
    id: "call_01",
    repId: "rep_demo_alex",
    date: "2026-08-04",
    client: "Jordan Hale · Richmond",
    role: "Homeowner",
    stage: "fee",
    objectionType: "fee",
    outcome: "conceded",
    feeAskedPct: 2.5,
    feeEndedPct: 2.125,
    transcriptSnippet:
      "Client: 2.5% is too high — another agency is 1.75%. Alex: Okay, we can do 2.125% if you sign this week.",
    notes: "Conceded in under 30s; no exploration of ‘too expensive’.",
  },
  {
    id: "call_02",
    repId: "rep_demo_alex",
    date: "2026-08-07",
    client: "Sam Taylor · Carlton",
    role: "Homeowner",
    stage: "needs",
    objectionType: "just_cvs",
    outcome: "won",
    feeAskedPct: 2.5,
    feeEndedPct: 2.5,
    transcriptSnippet:
      "Owner wanted a quick price estimate. Alex clarified the property details and booked an appraisal.",
    notes: "Strong discovery before the appraisal.",
  },
  {
    id: "call_03",
    repId: "rep_demo_alex",
    date: "2026-08-11",
    client: "Casey Morgan · Hawthorn",
    role: "Homeowner",
    stage: "fee",
    objectionType: "fee",
    outcome: "lost",
    feeAskedPct: 2.5,
    feeEndedPct: 2.2,
    transcriptSnippet:
      "Alex dropped to 2.2% after one pushback. Seller still chose their existing agent.",
    notes: "Concession without value anchor; still lost.",
  },
  {
    id: "call_04",
    repId: "rep_demo_alex",
    date: "2026-08-14",
    client: "Avery Wilson · Brunswick",
    role: "Homeowner",
    stage: "intro",
    objectionType: "timing",
    outcome: "no_decision",
    feeAskedPct: 2.5,
    feeEndedPct: null,
    transcriptSnippet:
      "Owner is not selling until next year. Alex obtained permission for a later check-in and offered a local market update.",
    notes: "Fine handling of timing.",
  },
  {
    id: "call_05",
    repId: "rep_demo_alex",
    date: "2026-08-18",
    client: "Riley Patel · South Yarra",
    role: "Homeowner",
    stage: "fee",
    objectionType: "fee",
    outcome: "conceded",
    feeAskedPct: 2.5,
    feeEndedPct: 1.75,
    transcriptSnippet:
      "Client: 2.5% won’t work. Alex: What’s your budget? … Fine, 1.75% and we’ll move fast.",
    notes: "Broke firm floor (2%). Critical failure.",
  },
  {
    id: "call_06",
    repId: "rep_demo_alex",
    date: "2026-08-21",
    client: "Jamie Brooks · Fitzroy",
    role: "Homeowner",
    stage: "proposal",
    objectionType: "other_agency",
    outcome: "won",
    feeAskedPct: 2.5,
    feeEndedPct: 2.5,
    transcriptSnippet:
      "They know another local agent. Alex offered a no-obligation appraisal to compare selling approaches.",
    notes: "Good competitor handling.",
  },
  {
    id: "call_07",
    repId: "rep_demo_alex",
    date: "2026-08-25",
    client: "Morgan Lee · Kew",
    role: "Property co-owner",
    stage: "fee",
    objectionType: "fee",
    outcome: "conceded",
    feeAskedPct: 2.5,
    feeEndedPct: 2.05,
    transcriptSnippet:
      "Price objection. Alex apologised and offered 2.05% before asking any clarifying question.",
    notes: "Apologetic concession pattern repeats.",
  },
  {
    id: "call_08",
    repId: "rep_demo_alex",
    date: "2026-08-28",
    client: "Taylor Reed · Northcote",
    role: "Homeowner",
    stage: "close",
    objectionType: "exclusivity",
    outcome: "won",
    feeAskedPct: 2.5,
    feeEndedPct: 2.5,
    transcriptSnippet:
      "Sent the sales authority and fee summary; held the commission while the seller reviewed with their conveyancer.",
    notes: "Clear authority review and follow-up worked.",
  },
  {
    id: "call_09",
    repId: "rep_demo_alex",
    date: "2026-09-02",
    client: "Cameron Ellis · Prahran",
    role: "Homeowner",
    stage: "fee",
    objectionType: "fee",
    outcome: "lost",
    feeAskedPct: 2.5,
    feeEndedPct: 2.25,
    transcriptSnippet:
      "Alex offered 2.25% immediately. Client said they’d ‘think about it’ and went dark.",
    notes: "Early drop signalled desperation.",
  },
  {
    id: "call_10",
    repId: "rep_demo_alex",
    date: "2026-09-05",
    client: "Drew Campbell · Coburg",
    role: "Homeowner",
    stage: "needs",
    objectionType: "just_cvs",
    outcome: "won",
    feeAskedPct: 2.5,
    feeEndedPct: 2.5,
    transcriptSnippet:
      "Clarified property condition and selling plans before arranging a tailored appraisal.",
    notes: "Talk-track followed.",
  },
  {
    id: "call_11",
    repId: "rep_demo_alex",
    date: "2026-09-08",
    client: "Alex Parker · South Melbourne",
    role: "Homeowner",
    stage: "fee",
    objectionType: "fee",
    outcome: "conceded",
    feeAskedPct: 2.5,
    feeEndedPct: 1.95,
    transcriptSnippet:
      "‘another agency quoted 1.75%.’ Alex matched toward 1.95% without asking what was included.",
    notes: "No comparison clarification; below approval floor.",
  },
  {
    id: "call_12",
    repId: "rep_demo_alex",
    date: "2026-09-10",
    client: "Robin Quinn · Preston",
    role: "Homeowner",
    stage: "proposal",
    objectionType: "other_agency",
    outcome: "no_decision",
    feeAskedPct: 2.5,
    feeEndedPct: null,
    transcriptSnippet:
      "Happy with their current agent. Permission obtained to follow up if their selling plans change.",
    notes: "Acceptable hold pattern.",
  },
];

/** Gold label for eval harness (Phase 5). */
export const GOLD_DIAGNOSIS = {
  repId: "rep_demo_alex",
  primaryStage: "fee" as const,
  primaryObjection: "fee" as const,
};

export function getRep(repId: string): Rep | undefined {
  return REPS.find((r) => r.id === repId);
}

export function getCallsForRep(repId: string): CallRecord[] {
  return CALLS.filter((c) => c.repId === repId).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function getTalkTrackForObjection(
  objectionType: TalkTrack["objectionType"],
): TalkTrack {
  return (
    TALK_TRACKS.find((t) => t.objectionType === objectionType) ?? TALK_TRACKS[0]
  );
}

export const DEMO_REP_ID = "rep_demo_alex";
