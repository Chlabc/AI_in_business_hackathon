import { NextResponse } from "next/server";
import { jsonAuthError, requireRole } from "@/lib/auth";
import { getPlaybook } from "@/lib/playbook";
import {
  clearPlaybookDraft,
  emptyDraft,
  getPlaybookDraft,
  savePlaybookDraft,
  type PlaybookDraft,
} from "@/lib/playbook-draft";

export async function GET() {
  try {
    await requireRole("manager");
    const live = await getPlaybook();
    const draft = await getPlaybookDraft();
    return NextResponse.json({
      live,
      draft: draft ?? null,
    });
  } catch (e) {
    return (
      jsonAuthError(e) ??
      NextResponse.json({ error: "Failed to load draft" }, { status: 500 })
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole("manager");
    let body: PlaybookDraft;
    try {
      body = (await request.json()) as PlaybookDraft;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body?.working || !Array.isArray(body.proposals)) {
      return NextResponse.json(
        { error: "Draft must include working playbook and proposals[]" },
        { status: 400 },
      );
    }
    const saved = await savePlaybookDraft({
      ...body,
      status: body.status === "ready" ? "ready" : "locked",
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json(saved);
  } catch (e) {
    return (
      jsonAuthError(e) ??
      NextResponse.json({ error: "Failed to save draft" }, { status: 500 })
    );
  }
}

export async function DELETE() {
  try {
    await requireRole("manager");
    await clearPlaybookDraft();
    const live = await getPlaybook();
    return NextResponse.json({ ok: true, live, draft: emptyDraft(live) });
  } catch (e) {
    return (
      jsonAuthError(e) ??
      NextResponse.json({ error: "Failed to discard draft" }, { status: 500 })
    );
  }
}
