-- Employee share-progress flag (durable across Vercel instances).
-- Run in Supabase SQL editor if migration wasn't applied via MCP.

create table if not exists public.share_settings (
  rep_id text primary key,
  share_progress_with_manager boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.share_settings enable row level security;

revoke all on table public.share_settings from anon, authenticated;
grant all on table public.share_settings to service_role;
