-- Whether a signed-in person wants email when the app is ready, and news.
--
-- Asked at sign-in, beside *Continue with Google* and the email code, as an
-- unticked switch: consent to marketing mail has to be given, not assumed.
-- Null means never asked (every account made before this). The client only
-- ever writes true, or false over null, so a returning person who signs in
-- on a second device without ticking it is not quietly unsubscribed.
--
-- email_updates_at is when the answer last changed, set here rather than by
-- the browser, because it is the record of consent and a client clock is not.
--
-- The list: select u.email from auth.users u
--   join public.profiles p on p.id = u.id where p.email_updates;
--
-- Apply with `supabase db query --linked -f`, never `db push`; then read the
-- columns back — see CLAUDE.md.

alter table public.profiles
  add column if not exists email_updates boolean,
  add column if not exists email_updates_at timestamptz;

comment on column public.profiles.email_updates is
  'Null until asked. True: may be emailed when the app is ready, and with news.';
comment on column public.profiles.email_updates_at is
  'When email_updates last changed, set by trigger. The record of consent.';

create or replace function public.stamp_email_updates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email_updates is distinct from old.email_updates then
    new.email_updates_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.stamp_email_updates() from public, anon, authenticated;

drop trigger if exists stamp_email_updates on public.profiles;
create trigger stamp_email_updates
  before update of email_updates on public.profiles
  for each row execute function public.stamp_email_updates();
