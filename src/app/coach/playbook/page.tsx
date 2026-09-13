import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PlaybookEditor } from "@/components/PlaybookEditor";
import { getPlaybook } from "@/lib/playbook";

export const dynamic = "force-dynamic";

export default async function PlaybookPage() {
  const playbook = await getPlaybook();

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/coach/manager"
          className="text-sm text-muted transition hover:text-accent"
        >
          ← Manager
        </Link>
        <span className="rounded border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          Manager only · label
        </span>
      </div>

      <div>
        <p className="eyebrow">Playbook (Manager)</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
          Firm knowledge
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted lg:text-base">
          Edit approved agency commissions, talk-tracks, and FAQ here. Agents
          use this in drills via live cue cards and scoring — they don’t edit
          it. You never open ElevenLabs; we wire thin firm facts into the voice
          client automatically. Real role gates come later with employee /
          manager signup.
        </p>
      </div>

      <PlaybookEditor initial={playbook} />
    </AppShell>
  );
}
