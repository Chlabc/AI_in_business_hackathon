import { NextResponse } from "next/server";
import {
  getPlaybook,
  savePlaybook,
  type FirmPlaybook,
} from "@/lib/playbook";
import { clearPlaybookDraft } from "@/lib/playbook-draft";
import { jsonAuthError, requireRole, requireUser } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();
    const playbook = await getPlaybook();
    return NextResponse.json(playbook);
  } catch (e) {
    return jsonAuthError(e) ?? NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

/** Publish: write live playbook and clear any manager draft. */
export async function PUT(request: Request) {
  try {
    await requireRole("manager");
    let body: Partial<FirmPlaybook>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const playbook = await savePlaybook(body);
    await clearPlaybookDraft();
    return NextResponse.json(playbook);
  } catch (e) {
    return (
      jsonAuthError(e) ??
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed to save playbook" },
        { status: 400 },
      )
    );
  }
}
