-- Make the accounts layer usable.
--
-- 0001 created `profiles` and `preferences` and then nothing touched them for
-- three build steps. Wiring them up turned over three things that would each
-- have failed on the first real sign-in.

-- ---------------------------------------------------------------------------
-- 1. timer_minutes bounds were left behind by the client's own change
--
-- 0001 wrote `check (timer_minutes between 1 and 45)`, matching the original
-- 45-minute session. The slider is now 5 to 60 in five-minute steps, so the
-- single most likely first action of a newly registered user — picking the
-- hour, the value the presets deliberately put on offer — would have been
-- rejected by the database with a constraint violation and no useful message.
--
-- Nothing caught this because no code had ever written to the table.
-- ---------------------------------------------------------------------------

-- No rows exist yet, but a migration must not assume that. Snap anything
-- outside the new bounds to the nearest stop, mirroring clampMinutes() in
-- lib/timer.ts, rather than letting the ALTER fail.
update public.preferences
set timer_minutes = least(60, greatest(5, round(timer_minutes / 5.0) * 5))
where timer_minutes not between 5 and 60
   or timer_minutes % 5 <> 0;

alter table public.preferences
  drop constraint if exists preferences_timer_minutes_check;

alter table public.preferences
  add constraint preferences_timer_minutes_check
  check (timer_minutes between 5 and 60 and timer_minutes % 5 = 0);

-- ---------------------------------------------------------------------------
-- 2. end_bell was an unconstrained text column
--
-- In TypeScript this is a union (`BellKind`), specifically so a hand-edited
-- localStorage value cannot reach the audio graph and fail silently at the end
-- of somebody's sitting. That guarantee stopped at the database, which would
-- happily store 'asdf' and sync it back down to every device.
-- ---------------------------------------------------------------------------

alter table public.preferences
  drop constraint if exists preferences_end_bell_check;

alter table public.preferences
  add constraint preferences_end_bell_check
  check (end_bell in ('singing-bowl', 'gong', 'struck-bell'));

-- ---------------------------------------------------------------------------
-- 3. Nothing ever created a profile row
--
-- `preferences.user_id` references `profiles(id)`, and `profiles.id` references
-- `auth.users(id)`. Signing up creates the auth.users row and nothing else, so
-- the first preferences INSERT would have failed on a foreign key — for every
-- user, on their first sync.
--
-- SECURITY DEFINER because the trigger runs as the signing-up user, who has no
-- rights to insert into profiles under its RLS policy.
--
-- ON CONFLICT DO NOTHING so this is safe if a profile is ever created by
-- another path, and so re-running the trigger cannot break a signup.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Same reasoning as 0002: Postgres grants EXECUTE to PUBLIC by default and
-- Supabase exposes public-schema functions over PostgREST. A trigger function
-- called directly errors rather than doing damage, but there is no reason for
-- it to be reachable at all.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. updated_at never updated
--
-- It defaulted to now() on insert and then stayed at the row's creation time
-- forever, which makes it worse than not having the column: it looks like a
-- modification time and isn't one.
--
-- Set in a trigger rather than trusted from the client. The RLS policy lets a
-- user write every column of their own row, so a client-supplied timestamp is
-- whatever the client felt like sending.
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public;
revoke all on function public.touch_updated_at() from anon;
revoke all on function public.touch_updated_at() from authenticated;

drop trigger if exists preferences_touch_updated_at on public.preferences;
create trigger preferences_touch_updated_at
  before update on public.preferences
  for each row execute function public.touch_updated_at();
