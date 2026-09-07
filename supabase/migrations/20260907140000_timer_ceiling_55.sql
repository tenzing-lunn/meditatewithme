-- The timer's ceiling drops from the hour to 55 minutes.
--
-- WHY
-- The client's decision, 7 September 2026: an hour is 55 minutes of sitting
-- and 5 minutes clear. The five are a handover window — when an hour is led by
-- a person rather than by nobody, whoever lit this candle has to hand over to
-- whoever lights the next, and a handover with no gap happens on top of
-- somebody's closing bell. `until the bell` now rings at :55 for the same
-- reason, so the shared ceiling and the slider's ceiling are one number.
--
-- WHY IT MATTERS HERE AND NOT ONLY IN THE UI
-- The same argument 0005 made, in the other direction. `TIMER_STOPS` no longer
-- contains 60, so the browser can never offer it; but the constraint is what
-- decides whether a *write* succeeds, and a constraint looser than the slider
-- is a constraint that silently stops describing it. This one stays a literal
-- list precisely so it can be checked against lib/timer.ts by eye, and it has
-- now chased the slider three times.
--
-- Nothing here loses a preference anyone can see: `clampMinutes` already snaps
-- a stored 60 to 55 on read, so a signed-in user whose row still said 60 has
-- been shown 55 since the moment the code deployed. This makes the stored row
-- agree with what they are looking at.

-- Verified against qcwgquwjazhsettuemgt on 7 September 2026: three preference
-- rows, at 10, 10 and 20. None is off-grid. This runs anyway, because the
-- window between writing this file and applying it is long enough for someone
-- to set an hour, and an ALTER that fails on one row leaves the constraint as
-- it was with no error anybody sees.
update public.preferences
set timer_minutes = 55
where timer_minutes not in (1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55);

alter table public.preferences
  drop constraint if exists preferences_timer_minutes_check;

alter table public.preferences
  add constraint preferences_timer_minutes_check
  check (timer_minutes in (1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55));
