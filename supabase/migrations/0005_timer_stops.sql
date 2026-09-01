-- The timer's stops, agreed with the client.
--
-- WHY THIS EXISTS
-- 0003 wrote `check (timer_minutes between 5 and 60 and timer_minutes % 5 = 0)`
-- to match a slider that ran five to sixty in five-minute steps. The range is
-- now one minute to an hour: the proposal the client holds promises a
-- one-minute floor, the build spec promised the hour, and the stops are the
-- superset that honours both.
--
-- Without this migration nothing appears to break. A signed-out visitor can
-- pick one minute and sit quite happily, because preferences live in
-- localStorage first. The failure only reaches a signed-in user, only on the
-- write, and it is silent — the sync rejects the row and their laptop and their
-- phone quietly stop agreeing. That is the worst shape a bug can have, which is
-- why the constraint moves in lockstep with `TIMER_STOPS` in lib/timer.ts.
--
-- An explicit `in` list rather than arithmetic, for the same reason `end_bell`
-- uses one: the stops are not evenly spaced, so there is no modulo that
-- describes them, and a list is checkable against the TypeScript array by eye.

-- Nothing stored today should be off-grid — 0003 already snapped everything to
-- a five-minute multiple, and every one of those remains a valid stop. This is
-- here so the migration is safe against a row written by hand.
update public.preferences
set timer_minutes = 10
where timer_minutes not in (1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60);

alter table public.preferences
  drop constraint if exists preferences_timer_minutes_check;

alter table public.preferences
  add constraint preferences_timer_minutes_check
  check (timer_minutes in (1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60));
