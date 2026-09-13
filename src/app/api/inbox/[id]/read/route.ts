import { NextResponse } from "next/server";
import { DEMO_REP_ID } from "@/data/seed";
import { jsonAuthError, requireRole } from "@/lib/auth";
import { commentsAvailable, markCommentRead } from "@/lib/comments";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const user = await requireRole("employee");
    if (!commentsAvailable()) {
      return NextResponse.json(
        { error: "Supabase is not configured." },
        { status: 503 },
      );
    }
    const { id } = await ctx.params;
    const repId = user.repId ?? DEMO_REP_ID;
    const comment = await markCommentRead({ id, repId });
    if (!comment) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }
    return NextResponse.json({ comment });
  } catch (err) {
    const auth = jsonAuthError(err);
    if (auth) return auth;
    const message =
      err instanceof Error ? err.message : "Failed to mark read.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
