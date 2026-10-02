-- Becoming a guide, and running the guides.
--
-- Tenzing's call, 2 October 2026: anyone signed in can apply to guide from
-- their account; an admin (Jonny, Tenzing) accepts or declines, or adds
-- someone directly; each guide either goes on air by themselves or waits
-- for an admin's go-ahead; and an admin can shut a stream off — the key is
-- revoked, viewers are told it will be back soon, and the server cuts the
-- connection at its next 30-second beat (`infra/mediamtx/hook.sh`).
--
-- All three tables are service role only: RLS on, no policies. The routes
-- check who is an admin; nothing here is readable with the anon key.
--
-- Apply with `supabase db query --linked -f`, never `db push`; then read
-- the tables back — see CLAUDE.md.

create table if not exists public.admins (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

comment on table public.admins is
  'Who may use /admin. Added with npm run live:key -- admin <email>. Service role only.';

create table if not exists public.guide_applications (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  about      text not null check (char_length(about) between 1 and 1000),
  status     text not null default 'pending' check (status in ('pending', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table public.guide_applications enable row level security;
revoke all on public.guide_applications from anon, authenticated;

comment on table public.guide_applications is
  'Asking to guide. Deleted when accepted (the stream key is the record then). Service role only.';

alter table public.stream_keys
  -- Goes on air as soon as they connect; otherwise waits for an admin.
  add column if not exists on_air_alone boolean not null default false,
  -- An admin's go-ahead, good to the end of the hour it was given in.
  add column if not exists cleared_until timestamptz,
  -- When an admin shut this stream off, for the notice viewers see.
  add column if not exists stopped_at timestamptz;

-- Everyone streaming before this existed went on air by themselves; they
-- keep doing so.
update public.stream_keys set on_air_alone = true where created_at < '2026-10-02T14:50:00Z';

comment on column public.stream_keys.on_air_alone is
  'True: shown as soon as they connect. False: waits for an admin to put them on air.';
comment on column public.stream_keys.cleared_until is
  'An admin put them on air; good until this time (the end of that hour).';
comment on column public.stream_keys.stopped_at is
  'An admin shut the stream off at this time. Viewers are told it will be back soon.';
