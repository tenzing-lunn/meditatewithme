-- Lock down prune_heartbeats().
--
-- 0001 created it as SECURITY DEFINER, which is correct — it must bypass RLS to
-- delete heartbeat rows. What 0001 missed is that Postgres grants EXECUTE to
-- PUBLIC by default, and Supabase exposes every public-schema function over
-- PostgREST. Net effect: anyone holding the publishable key — which ships in the
-- browser bundle, so anyone at all — could POST /rest/v1/rpc/prune_heartbeats
-- and make the database run an unbounded DELETE. Verified returning 204 before
-- this migration.
--
-- The damage was bounded (it only removes rows already older than two days, and
-- those are worthless by design) but it is still an unauthenticated write that
-- bypasses RLS, and repeated calls are a cheap way to force scan work on a free
-- tier instance.
--
-- Nothing legitimate needs these grants: the function is called by pg_cron or by
-- a Vercel cron hitting a route handler, and both use the service role, which is
-- unaffected by grants to anon/authenticated.

revoke all on function public.prune_heartbeats() from public;
revoke all on function public.prune_heartbeats() from anon;
revoke all on function public.prune_heartbeats() from authenticated;
