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
        description={
          <>
            You can&apos;t hold a price you can&apos;t remember. These cards
            drill the handful of facts you need at your fingertips mid-call —
            what{" "}
            <strong className="font-medium text-foreground">
              {playbook.firmName}
            </strong>{" "}
            charges, how low you&apos;re allowed to go, and what to point at
            instead of discounting.
          </>
        }
      />

      {/* People kept asking what this page was for and where "Northline" came
          from, so the answer sits at the top rather than in a corner pill. */}
      <div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted">
        Every card below is generated from{" "}
        <strong className="font-medium text-foreground">
          {playbook.firmName}
        </strong>
        &apos;s playbook — the same one the AI client argues against and the
        scorer marks you on. Change the playbook and these cards change too;
        they are not a generic sales course.
      </div>

      <LearnModule
        firmName={playbook.firmName}
        cards={cards}
        questions={questions}
      />
    </AppShell>
  );
}
