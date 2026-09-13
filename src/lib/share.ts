import { promises as fs } from "fs";
import path from "path";
import { DEMO_REP_ID } from "@/data/seed";
import { dataStorePath } from "@/lib/file-store";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase-admin";

export type ShareSettings = {
  repId: string;
  shareProgressWithManager: boolean;
  updatedAt: string;
};

const STORE = dataStorePath("share-settings.json");

type Row = {
  rep_id: string;
  share_progress_with_manager: boolean;
  updated_at: string;
};

function mapRow(row: Row): ShareSettings {
  return {
    repId: row.rep_id,
    shareProgressWithManager: row.share_progress_with_manager,
    updatedAt: row.updated_at,
  };
}

function defaultSettings(repId: string): ShareSettings {
  return {
    repId,
    shareProgressWithManager: false,
    updatedAt: new Date(0).toISOString(),
  };
}

async function readAllFile(): Promise<Record<string, ShareSettings>> {
  try {
    const raw = await fs.readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, ShareSettings>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAllFile(map: Record<string, ShareSettings>): Promise<void> {
  await fs.mkdir(path.dirname(STORE), { recursive: true });
  await fs.writeFile(STORE, JSON.stringify(map, null, 2), "utf8");
}

async function getShareFromSupabase(
  repId: string,
): Promise<ShareSettings | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("share_settings")
    .select("*")
    .eq("rep_id", repId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as Row) : null;
}

async function setShareInSupabase(
  repId: string,
  shareProgressWithManager: boolean,
): Promise<ShareSettings> {
  const sb = getSupabaseAdmin();
  const updatedAt = new Date().toISOString();
  const { data, error } = await sb
    .from("share_settings")
    .upsert(
      {
        rep_id: repId,
        share_progress_with_manager: shareProgressWithManager,
        updated_at: updatedAt,
      },
      { onConflict: "rep_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Row);
}

export async function getShareSettings(
  repId: string = DEMO_REP_ID,
): Promise<ShareSettings> {
  if (supabaseConfigured()) {
    try {
      const cloud = await getShareFromSupabase(repId);
      if (cloud) return cloud;
    } catch (err) {
      console.error("[share] supabase get failed; using file", err);
    }
  }
  const all = await readAllFile();
  return all[repId] ?? defaultSettings(repId);
}

export async function setShareSettings(
  repId: string,
  shareProgressWithManager: boolean,
): Promise<ShareSettings> {
  // Prefer Supabase so Vercel instances agree; keep a local file mirror.
  if (supabaseConfigured()) {
    try {
      const row = await setShareInSupabase(repId, shareProgressWithManager);
      try {
        const all = await readAllFile();
        all[repId] = row;
        await writeAllFile(all);
      } catch {
        /* file mirror best-effort */
      }
      return row;
    } catch (err) {
      console.error("[share] supabase set failed; falling back to file", err);
    }
  }

  const all = await readAllFile();
  const row: ShareSettings = {
    repId,
    shareProgressWithManager,
    updatedAt: new Date().toISOString(),
  };
  all[repId] = row;
  await writeAllFile(all);
  return row;
}
