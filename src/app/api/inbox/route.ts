import { NextResponse } from "next/server";
import { DEMO_REP_ID } from "@/data/seed";
import { jsonAuthError, requireRole } from "@/lib/auth";
import {
  commentsAvailable,
  countUnreadForRep,
  listInboxForRep,
} from "@/lib/comments";

export async function GET() {
  try {
    const user = await requireRole("employee");
    const repId = user.repId ?? DEMO_REP_ID;
    if (!commentsAvailable()) {
      return NextResponse.json({
        configured: false,
        unread: 0,
        comments: [],
      });
    }
    const [comments, unread] = await Promise.all([
      listInboxForRep(repId),
      countUnreadForRep(repId),
    ]);
    return NextResponse.json({ configured: true, unread, comments });
  } catch (err) {
    const auth = jsonAuthError(err);
    if (auth) return auth;
    const message =
      err instanceof Error ? err.message : "Failed to load inbox.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
