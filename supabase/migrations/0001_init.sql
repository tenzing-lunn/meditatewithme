-- Meditate With Me — initial schema
--
-- Four tables. Two are effectively empty in v1 (sessions, profiles), one is
-- ephemeral (heartbeats), one holds the only durable user data (preferences).
--
-- The design principle: this app has almost no state. The session is derived
-- from the clock, the timer and audio mix are client-local. Resist adding
-- tables — if something can be computed, compute it.

-- ---------------------------------------------------------------------------
-- sessions
--
-- OVERRIDES, not the schedule. A session exists for every UTC hour whether or
-- not a row does; `resolveSession()` falls back to an ambient candle when the
-- lookup returns nothing. That fallback is why the site can never be empty.
--
-- In v1 this table stays empty. It exists now so that adding live video in v2
-- is an INSERT, not a migration + refactor.
-- ---------------------------------------------------------------------------

create table if not exists public.sessions (
  hour_start  timestamptz primary key,
  kind        text not null default 'ambient'
              check (kind in ('ambient', 'live')),
  focus_slug  text not null default 'candle',
  stream_url  text,                        -- v2 only
  lighter_id  uuid,                        -- v2 only, FK added with that phase
  created_at  timestamptz not null default now(),

  -- hour_start must be exactly on the hour, or the lookup silently misses.
  -- Enforce it here rather than trusting every future insert path.
  constraint sessions_on_the_hour
    check (hour_start = date_trunc('hour', hour_start))
);

comment on table public.sessions is
  'Overrides for specific hours. Absence means the ambient default, which is the v1 norm.';

-- ---------------------------------------------------------------------------
-- heartbeats
--
-- Powers the participant count. Deliberately NOT Supabase Realtime presence:
-- presence sync is O(N) messages per join and everyone joins at the top of the
-- hour simultaneously, which blows the free-tier limit by orders of magnitude
-- at exactly the wrong moment. See docs/ARCHITECTURE.md §5.
--
-- Instead: clients upsert every 30s, and read a count endpoint cached for 10s
-- at the edge. One cache entry serves the whole world.
-- ---------------------------------------------------------------------------

create table if not exists public.heartbeats (
  anon_id     uuid        not null,
  hour_start  timestamptz not null,
  last_seen   timestamptz not null default now(),
  primary key (anon_id, hour_start)
);

-- The count query filters on both columns; this index covers it.
create index if not exists heartbeats_hour_seen_idx
  on public.heartbeats (hour_start, last_seen);

comment on table public.heartbeats is
  'Ephemeral liveness rows for the participant count. Safe to truncate at any time.';

-- ---------------------------------------------------------------------------
-- profiles / preferences
--
-- localStorage is PRIMARY for preferences; these tables are a sync target for
-- users who choose to register. That ordering is what makes the whole account
-- layer cuttable if week three disappears.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create table if not exists public.preferences (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  timer_minutes int     not null default 10
                check (timer_minutes between 1 and 45),
  end_bell      text    not null default 'singing-bowl',
  focus_slug    text    not null default 'candle',
  sound_mix     jsonb   not null default '{}'::jsonb,  -- {"rain":0.4,"wind":0.15}
  show_count    boolean not null default true,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- RLS is default-deny once enabled: with RLS on and no policy, NOBODY can read
-- the table, including via the anon key. Every table below is enabled and then
-- given exactly the access it needs.
--
-- On the two clauses:
--   using      -> which rows you may SEE and DELETE
--   with check -> which rows you may WRITE
-- Omit `with check` and a user can UPDATE their row, set user_id to someone
-- else's id, and take over that record. Always write both.
-- ---------------------------------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.preferences enable row level security;
alter table public.sessions    enable row level security;
alter table public.heartbeats  enable row level security;

-- Preferences: yours and only yours.
drop policy if exists "own preferences" on public.preferences;
create policy "own preferences" on public.preferences
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Profiles: same.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all
  using      (auth.uid() = id)
  with check (auth.uid() = id);

-- Sessions: world-readable, nobody writes from the browser.
-- Writes happen through the service role in v2's booking flow.
drop policy if exists "sessions are public" on public.sessions;
create policy "sessions are public" on public.sessions
  for select
  using (true);

-- Heartbeats: NO browser policy at all.
--
-- Deliberate. With RLS enabled and no policy, the anon key cannot touch this
-- table — reads and writes both go through route handlers using the service
-- role, which bypasses RLS. That means nobody can inflate the participant
-- count from the browser console, and nobody can enumerate who is meditating.
--
-- The count is a public number; the rows behind it are not.

-- ---------------------------------------------------------------------------
-- Housekeeping
--
-- Heartbeat rows are worthless after the hour ends. Run this on a schedule
-- (pg_cron on Supabase, or a Vercel cron hitting a route) — but note that
-- nothing breaks if it never runs, the rows are tiny and the count query is
-- indexed on hour_start.
-- ---------------------------------------------------------------------------

create or replace function public.prune_heartbeats()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.heartbeats
  where hour_start < now() - interval '2 days';
$$;
