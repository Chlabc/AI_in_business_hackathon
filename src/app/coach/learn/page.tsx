import { AppShell } from "@/components/AppShell";
import { LearnModule } from "@/components/LearnModule";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { buildFlashcards, buildQuiz } from "@/lib/learn";
import { getPlaybook } from "@/lib/playbook";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  await requireRole("employee");
  const playbook = await getPlaybook();
  const cards = buildFlashcards(playbook);
  const questions = buildQuiz(playbook);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Learn"
        title="Know your own prices before you defend them"
      />

      <LearnModule
        firmName={playbook.firmName}
        cards={cards}
        questions={questions}
      />
    </AppShell>
  );
}
