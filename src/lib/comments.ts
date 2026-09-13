import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase-admin";

export type ManagerComment = {
  id: string;
  firmId: string;
  fromEmail: string;
  fromName: string;
  toRepId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

type Row = {
  id: string;
  firm_id: string;
  from_email: string;
  from_name: string;
  to_rep_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

function mapRow(row: Row): ManagerComment {
  return {
    id: row.id,
    firmId: row.firm_id,
    fromEmail: row.from_email,
    fromName: row.from_name,
    toRepId: row.to_rep_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export function commentsAvailable(): boolean {
  return supabaseConfigured();
}

export async function createManagerComment(input: {
  fromEmail: string;
  fromName: string;
  toRepId: string;
  body: string;
  firmId?: string;
}): Promise<ManagerComment> {
  const body = input.body.trim();
  if (!body) throw new Error("Comment body is required.");
  if (body.length > 2000) throw new Error("Comment is too long (max 2000).");

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("manager_comments")
    .insert({
      firm_id: input.firmId ?? "northline",
      from_email: input.fromEmail,
      from_name: input.fromName,
      to_rep_id: input.toRepId,
      body,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Row);
}

export async function listInboxForRep(
  repId: string,
): Promise<ManagerComment[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("manager_comments")
    .select("*")
    .eq("to_rep_id", repId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(mapRow);
}

export async function countUnreadForRep(repId: string): Promise<number> {
  const sb = getSupabaseAdmin();
  const { count, error } = await sb
    .from("manager_comments")
    .select("*", { count: "exact", head: true })
    .eq("to_rep_id", repId)
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markCommentRead(input: {
  id: string;
  repId: string;
}): Promise<ManagerComment | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("manager_comments")
    .update({ read_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("to_rep_id", input.repId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as Row) : null;
}
