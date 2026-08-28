-- Presence proof: distinguish arriving in the room from beginning a sitting.
--
-- `heartbeats` remains one ephemeral row per browser and UTC hour. `began_at`
-- is deliberately nullable: most people who open the room never press Begin,
-- and a missing value means exactly that rather than inventing another table
-- or a row per start event. The route handler stamps it; browsers never write
-- this table directly.

alter table public.heartbeats
  add column if not exists began_at timestamptz;

-- The one query made at Begin asks only about recent starts in this hour.
-- Keep the leading hour key so it stays narrow even after a long-running room
-- accumulates rows from earlier sessions.
create index if not exists heartbeats_hour_began_idx
  on public.heartbeats (hour_start, began_at)
  where began_at is not null;
