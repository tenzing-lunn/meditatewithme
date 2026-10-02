-- A stream key can belong to an account, and its guide can be named.
--
-- Tenzing's call, 2 October 2026: a person approved to stream signs in and
-- finds their server and key in their account, whenever they need them,
-- instead of being sent a key once by hand. Approving is still Tenzing's
-- alone: `npm run live:key -- approve <email> "Name"` writes the row; nobody
-- can ask for one from the site.
--
-- The key is still never stored. An account's key is worked out on the
-- server from the slug and `key_version` (`app/api/live/secret.ts`), so it
-- can be shown again at any time; a new key is `key_version + 1`, and only
-- its hash goes in `key_hash`, which /api/live/auth checks as before. Keys
-- made by the script for people without an account are unchanged.
--
-- `show_name`: viewers see the guide's name only if the guide turns it on
-- in their account. Off by default — /api/live never sent it before, and
-- nobody on camera agreed to be named.
--
-- Apply with `supabase db query --linked -f`, never `db push`; then read the
-- columns back — see CLAUDE.md.

alter table public.stream_keys
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists key_version int not null default 0,
  add column if not exists show_name boolean not null default false;

-- One working key per account.
create unique index if not exists stream_keys_one_per_account
  on public.stream_keys (user_id)
  where user_id is not null and revoked_at is null;

comment on column public.stream_keys.user_id is
  'The account this key belongs to, if any. Its owner can see the key in their account.';
comment on column public.stream_keys.key_version is
  'Bumped for a new key. An account key is derived from slug and version; only its hash is kept.';
comment on column public.stream_keys.show_name is
  'Whether viewers are told the guide''s name. The guide''s choice; off by default.';

-- An account deleted takes its streaming with it. The row stays (live_hours
-- points at its slug) but is revoked, so the key is refused at its next
-- connection; `on delete set null` alone would leave it working.
create or replace function public.revoke_stream_keys_of_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stream_keys
     set revoked_at = now()
   where user_id = old.id and revoked_at is null;
  return old;
end;
$$;

revoke execute on function public.revoke_stream_keys_of_profile() from public, anon, authenticated;

drop trigger if exists revoke_stream_keys on public.profiles;
create trigger revoke_stream_keys
  before delete on public.profiles
  for each row execute function public.revoke_stream_keys_of_profile();
