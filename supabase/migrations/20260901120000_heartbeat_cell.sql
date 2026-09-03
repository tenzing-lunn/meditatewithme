-- Where a candle was lit, coarsely enough that it is a region and not a person.
--
-- This is what the globe at /world is drawn from, and it is the first thing
-- this project has stored that says anything at all about where somebody is.
-- context/ARCHITECTURE.md §14 held open "do we record any analytics at all?"
-- and noted that the answer needing no cookie banner is "none". It is no longer
-- none, so the shape of it is chosen to keep the answer defensible:
--
--   * The SERVER derives the position, from the edge's own geo headers. The
--     browser is never asked for permission and navigator.geolocation is never
--     called.
--   * It is SNAPPED TO A GRID BEFORE IT IS STORED. These two columns hold the
--     cell, not the reading — see GRID_DEGREES in app/api/heartbeat/route.ts.
--     Nothing more precise than the cell exists in the database at any point,
--     so there is no finer value to leak, subpoena or accidentally log.
--   * It rides on `heartbeats`, which is already anonymous, already keyed to a
--     single UTC hour, and already pruned after two days.
--
-- The bar this was designed against is an ordinary server access log, which
-- holds a full IP address. A grid cell is considerably coarser than that.
--
-- Both columns are nullable and must stay that way. Geo headers are absent on
-- localhost, absent behind some VPNs and absent whenever the edge cannot place
-- an address — and a heartbeat that cannot be placed must still count. The
-- participant count in §5 does not read these columns at all.

alter table public.heartbeats
  add column if not exists cell_lat double precision,
  add column if not exists cell_lon double precision;

-- /api/world groups this hour's rows by cell. Partial, because most of the
-- work is over rows that have a cell, and rows without one are dead weight in
-- an index that exists only to answer that question.
create index if not exists heartbeats_hour_cell_idx
  on public.heartbeats (hour_start, cell_lat, cell_lon)
  where cell_lat is not null;

comment on column public.heartbeats.cell_lat is
  'Latitude of a coarse grid cell, server-derived. Never a precise position.';
comment on column public.heartbeats.cell_lon is
  'Longitude of a coarse grid cell, server-derived. Never a precise position.';
