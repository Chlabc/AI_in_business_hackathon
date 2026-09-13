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
      />

      <PlaybookEditor live={playbook} initialDraft={draft} />
    </AppShell>
  );
}
