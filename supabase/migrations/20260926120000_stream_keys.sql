-- ---------------------------------------------------------------------------
-- Stream keys for live video, and who is live on them.
--
-- One row per collaborator. They publish to MediaMTX at `live/<slug>` with
-- their key; MediaMTX asks /api/live/auth, which hashes the key and looks for
-- an unrevoked row here. The key itself is never stored — only its SHA-256.
--
-- live_since / live_seen are written by /api/live/hook, which MediaMTX calls
-- when a stream comes online, every 30 seconds while it stays online, and when
-- it goes offline. /api/live treats a row as live only while live_seen is
-- recent, so a server that dies without saying so drops out on its own.
--
-- Revoking is setting revoked_at: the key stops working at the next publish.
--
-- Service role only: RLS on, no policies. Nothing here is readable with the
-- anon key.
--
-- Apply with `supabase db query --linked -f`, never `db push`; then read the
-- table back — see CLAUDE.md.
-- ---------------------------------------------------------------------------

create table if not exists public.stream_keys (
  slug        text primary key check (slug ~ '^[a-z0-9]{8}$'),
  name        text not null check (char_length(name) between 1 and 60),
  key_hash    text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  live_since  timestamptz,
  live_seen   timestamptz,
  live_server text check (live_server is null or char_length(live_server) <= 40)
);

comment on table public.stream_keys is
  'One per live-video collaborator. SHA-256 of the key only. Service role only.';

alter table public.stream_keys enable row level security;

revoke all on public.stream_keys from anon, authenticated;
