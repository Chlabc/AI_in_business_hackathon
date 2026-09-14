import { NextResponse } from "next/server";
import { jsonAuthError, requireUser } from "@/lib/auth";
import { resolveScoringMode } from "@/lib/score-llm";
import { readScoringModel, xaiConfigured } from "@/lib/xai";

/**
 * Safe diagnostics for whether this deployment can AI-score.
 * Does not return the key — only presence + mode.
 */
export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({
      mode: resolveScoringMode(),
      xaiKeyPresent: xaiConfigured(),
      model: readScoringModel(),
      vercelEnv: process.env["VERCEL_ENV"] ?? null,
      commit: process.env["VERCEL_GIT_COMMIT_SHA"]?.slice(0, 7) ?? null,
    });
  } catch (e) {
    return (
      jsonAuthError(e) ??
      NextResponse.json({ error: "Error" }, { status: 500 })
    );
  }
}
