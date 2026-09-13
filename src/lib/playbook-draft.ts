import { promises as fs } from "fs";
import path from "path";
import { dataStorePath } from "@/lib/file-store";
import {
  emptyDraft,
  normalizeDraft,
  type PlaybookDraft,
} from "@/lib/playbook-draft-core";

export type {
  PlaybookDraft,
  PlaybookProposal,
  PlaybookProposalField,
  PlaybookScalarField,
} from "@/lib/playbook-draft-core";

export {
  applyAcceptedProposals,
  buildProposals,
  draftStatus,
  emptyDraft,
  isTalkTrackField,
  talkTrackIdFromField,
  workingFromProposals,
} from "@/lib/playbook-draft-core";

const DRAFT_STORE = dataStorePath("playbook-draft.json");

export async function getPlaybookDraft(): Promise<PlaybookDraft | null> {
  try {
    const raw = await fs.readFile(DRAFT_STORE, "utf8");
    return normalizeDraft(JSON.parse(raw) as Partial<PlaybookDraft>);
  } catch {
    return null;
  }
}

export async function savePlaybookDraft(
  input: PlaybookDraft,
): Promise<PlaybookDraft> {
  const next: PlaybookDraft = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(DRAFT_STORE), { recursive: true });
  await fs.writeFile(DRAFT_STORE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function clearPlaybookDraft(): Promise<void> {
  try {
    await fs.unlink(DRAFT_STORE);
  } catch {
    // already gone
  }
}

export { emptyDraft as emptyPlaybookDraft };
