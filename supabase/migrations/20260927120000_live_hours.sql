-- ---------------------------------------------------------------------------
-- Who held each hour of live video.
--
-- One row per hour that someone was on air: the first /api/live request in
-- the hour that finds a collaborator live claims it for whoever has waited
-- longest (lib/live.ts, onAir). The primary key makes the claim a race that
-- only one request can win. Kept after the hour, so the next hour's choice
-- can see who has already had a turn — and as a plain record of who sat
-- when.
--
-- Service role only: RLS on, no policies.
--
-- Apply with `supabase db query --linked -f`, never `db push`; then read the
-- table back — see CLAUDE.md.
-- ---------------------------------------------------------------------------

create table if not exists public.live_hours (
  hour       timestamptz primary key check (date_trunc('hour', hour) = hour),
  slug       text not null references public.stream_keys (slug),
  created_at timestamptz not null default now()
);

create index if not exists live_hours_slug_hour on public.live_hours (slug, hour desc);

comment on table public.live_hours is
  'Which collaborator held each hour of live video. Service role only.';

alter table public.live_hours enable row level security;

revoke all on public.live_hours from anon, authenticated;
