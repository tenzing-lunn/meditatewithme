-- More than one email on an account.
--
-- A Supabase user holds exactly one address (`auth.users.email`), and signing
-- in with any other makes a new user. Tenzing's call, 30 September 2026: an
-- account can connect further addresses, each proved by a six-digit code, and
-- every one of them signs in to the same account; any can be removed while one
-- is left. `auth.users.email` stays the main address, the one the mailing list
-- uses. The rest live here.
--
-- Both tables have RLS on and no policies, like `heartbeats`: only the route
-- handlers, with the service role, read or write them. A browser can neither
-- list whose address is whose nor read a code.
--
-- Apply with `supabase db query --linked -f`, never `db push`; then read the
-- tables back — see CLAUDE.md.

create table if not exists public.account_emails (
  email      text primary key
             check (email = lower(email) and char_length(email) between 3 and 254),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists account_emails_user_id on public.account_emails (user_id);

comment on table public.account_emails is
  'Addresses connected to an account beyond auth.users.email. Each signs in to it.';

-- One live code per address. `connect` proves a signed-in person owns a new
-- address; `sign-in` signs somebody in with a connected one. Only a hash is
-- kept, and a code dies after five wrong tries or ten minutes.
create table if not exists public.email_codes (
  email      text primary key check (email = lower(email)),
  purpose    text not null check (purpose in ('connect', 'sign-in')),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  code_hash  text not null,
  attempts   int  not null default 0,
  sent_at    timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.account_emails enable row level security;
alter table public.email_codes    enable row level security;

-- Who holds this address, as a main address or a connected one. Null if
-- nobody. auth.users is not reachable through the API, hence a function;
-- executable by the service role only.
create or replace function public.email_owner(addr text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select id from auth.users where lower(email) = lower(addr) limit 1),
    (select user_id from public.account_emails where email = lower(addr))
  );
$$;

revoke execute on function public.email_owner(text) from public, anon, authenticated;
grant execute on function public.email_owner(text) to service_role;
