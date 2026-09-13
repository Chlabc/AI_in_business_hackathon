-- Practice session logs for manager calibration (transcript + score).
-- Run in Supabase SQL editor. Same project as manager_comments / inbox.

create table if not exists practice_sessions (
  id text primary key,
  firm_id text not null default 'northline',
  rep_id text not null,
  scenario_id text not null,
  created_at timestamptz not null default now(),
  conversation_id text,
  cue_mode text,
  score jsonb not null,
  turns jsonb not null default '[]'::jsonb,
  reflection jsonb,
  calibration jsonb
);

create index if not exists practice_sessions_rep_created
  on practice_sessions (rep_id, created_at desc);

create index if not exists practice_sessions_firm_created
  on practice_sessions (firm_id, created_at desc);

-- Optional: durable agency scoring standards (manager calibrate → future drills)
create table if not exists scoring_standards (
  id text primary key,
  firm_id text not null default 'northline',
  scenario_id text not null,
  criterion_id text not null,
  target_score double precision not null,
  reason text not null,
  set_by_email text not null,
  set_by_name text not null,
  source_attempt_id text not null,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

create index if not exists scoring_standards_active_lookup
  on scoring_standards (firm_id, scenario_id, criterion_id, active);
