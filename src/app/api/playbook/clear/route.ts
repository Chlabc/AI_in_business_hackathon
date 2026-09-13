import { NextResponse } from "next/server";
import { jsonAuthError, requireRole } from "@/lib/auth";
import { clearPlaybookKnowledge } from "@/lib/playbook";
import { clearPlaybookDraft } from "@/lib/playbook-draft";

/**
 * Judge/demo helper: wipe live knowledge + any draft so a sample PDF can be
 * reparsed from a blank slate.
 */
export async function POST() {
  try {
    await requireRole("manager");
    const playbook = await clearPlaybookKnowledge();
    await clearPlaybookDraft();
    return NextResponse.json({ playbook });
  } catch (e) {
    return (
      jsonAuthError(e) ??
      NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Failed to clear knowledge base",
        },
        { status: 500 },
      )
    );
  }
}
