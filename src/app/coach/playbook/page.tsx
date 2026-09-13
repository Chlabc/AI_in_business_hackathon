import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { PlaybookEditor } from "@/components/PlaybookEditor";
import { getPlaybook } from "@/lib/playbook";
import { getPlaybookDraft } from "@/lib/playbook-draft";

export const dynamic = "force-dynamic";

export default async function PlaybookPage() {
  const [playbook, draft] = await Promise.all([
    getPlaybook(),
    getPlaybookDraft(),
  ]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Playbook"
        title="Firm knowledge"
        description="Upload or edit approved agency commissions, talk-tracks, and FAQ. Parse into a locked draft, accept proposals, then Publish — agents pick up changes in Learn, cue cards, scoring, and the next voice drill. Thin firm facts go to ElevenLabs automatically; coaching tips never do."
      />

      <PlaybookEditor live={playbook} initialDraft={draft} />
    </AppShell>
  );
}
