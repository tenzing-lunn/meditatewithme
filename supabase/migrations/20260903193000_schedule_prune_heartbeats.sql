-- Actually run prune_heartbeats().
--
-- 0001 wrote the function and left a comment saying to "run this on a schedule
-- (pg_cron on Supabase, or a Vercel cron hitting a route)". Neither was ever
-- set up. The function has sat in the database since August doing nothing, and
-- on 3 September the oldest heartbeat row was from 26 August — eight days, on a
-- table documented everywhere as keeping two.
--
-- That was a tidiness problem until 20260901120000 added cell_lat/cell_lon, at
-- which point the un-pruned rows held coarse location data. It is also a
-- correctness problem for what we have written down: the draft privacy copy in
-- plans/privacy-data-inventory.md tells people the location square "is deleted
-- with the rest of the session record after two days", and that sentence was
-- false the day it was drafted. The retention has to be enforced by something,
-- not asserted.
--
-- pg_cron rather than a Vercel cron, for three reasons:
--
--   * No new front door. 0002 exists because prune_heartbeats() was reachable
--     over PostgREST by anyone holding the publishable key. A Vercel cron needs
--     a route handler that deletes rows, guarded by a shared secret — the same
--     shape of exposure 0002 closed, reintroduced with a lock on it. pg_cron
--     never leaves the database, so there is nothing to authenticate and
--     nothing to leave unauthenticated by mistake.
--   * No new secret and no dependency on the deploy. A route means a CRON_SECRET
--     to set in two environments and rotate; and it stops working if the route
--     is renamed, the deploy fails, or the project changes plan (Hobby crons
--     are once a day, best effort). The database prunes itself whatever the
--     front end is doing.
--   * It can be a migration. The schedule belongs in the same forward-only
--     history as the function it calls, next to the RLS that makes these rows
--     unreadable — not in a vercel.json three directories away.
--
-- 0002 is not re-opened by any of this. It revoked EXECUTE from public, anon
-- and authenticated; it did not touch the owner. cron.schedule() records the
-- role that called it and runs the job as that role, which here is postgres —
-- the function's owner, whose EXECUTE never went anywhere. No grant is added
-- back, and the browser still cannot call it (verified: anon gets 401).

create extension if not exists pg_cron;

-- Hourly, not nightly, and not on the hour.
--
-- The function deletes rows older than two days, so how often it runs is what
-- decides the real retention: nightly would mean a row lives up to two days
-- *plus* however long until the next run, i.e. nearly three. "Two days" is a
-- number we have put in writing for people to rely on, so run often enough that
-- it is true to within an hour rather than within a day. The delete is indexed
-- on hour_start over a table with a few dozen rows in it; twenty-four of those
-- a day costs nothing worth measuring.
--
-- At :07 because :00 is when the candle changes — every client in the world
-- rolls to a new hour_start and writes a heartbeat at once (§6, §11). Nothing
-- here would actually contend with that (this only ever touches rows two days
-- old, which no live query reads) but there is no reason to aim a write at the
-- one moment of the hour that is busy.
--
-- Named, deliberately: cron.schedule() upserts on the job name, so re-running
-- this migration re-points the existing job instead of scheduling a second one.

select cron.schedule(
  'prune-heartbeats',
  '7 * * * *',
  $$select public.prune_heartbeats()$$
);
