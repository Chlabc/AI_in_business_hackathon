import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { PlaybookEditor } from "@/components/PlaybookEditor";
import { getPlaybook } from "@/lib/playbook";

export const dynamic = "force-dynamic";

export default async function PlaybookPage() {
  const playbook = await getPlaybook();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Playbook"
        title="Firm knowledge"
        description="Dump and edit approved SaaS pricing, talk-tracks, and FAQ here. AEs use this in drills via live cue cards and scoring — they don’t edit it. You never open ElevenLabs; we wire thin firm facts into the voice client automatically."
      />

      <PlaybookEditor initial={playbook} />
    </AppShell>
  );
}
