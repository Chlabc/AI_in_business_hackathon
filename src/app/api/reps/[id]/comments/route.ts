import { NextResponse } from "next/server";
import { TEAM } from "@/data/team";
import { DEMO_REP_ID } from "@/data/seed";
import { jsonAuthError, requireRole } from "@/lib/auth";
import { commentsAvailable, createManagerComment } from "@/lib/comments";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireRole("manager");
    if (!commentsAvailable()) {
      return NextResponse.json(
        {
          error:
            "Supabase service role key missing. Set SUPABASE_SERVICE_ROLE_KEY in .env.local (local) or Vercel Environment Variables (deploy), then redeploy.",
        },
        { status: 503 },
      );
    }

    const { id: toRepId } = await ctx.params;
    const known =
      toRepId === DEMO_REP_ID || TEAM.some((t) => t.id === toRepId);
    if (!known) {
      return NextResponse.json({ error: "Unknown employee." }, { status: 404 });
    }

    const json = (await req.json()) as { body?: string };
    const body = typeof json.body === "string" ? json.body : "";
    const comment = await createManagerComment({
      fromEmail: user.email,
      fromName: user.name,
      toRepId,
      body,
    });
    return NextResponse.json({ comment });
  } catch (err) {
    const auth = jsonAuthError(err);
    if (auth) return auth;
    const message = err instanceof Error ? err.message : "Failed to post note.";
    const status =
      message.includes("required") || message.includes("too long") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
