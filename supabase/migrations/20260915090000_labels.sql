-- ---------------------------------------------------------------------------
-- A name and an origin, shown to others while sitting together.
--
-- "Ana from Lisbon is meditating with you." Since 14 September 2026 a person
-- may choose to be seen by name and origin on the earth while they sit with
-- others. Two columns carry that, and both are null in the ordinary case.
--
-- heartbeats.label: the composed, cleaned label, written only while the
-- person is sitting with others and has the switch on. It is pruned with the
-- row after two days, and `/api/world` hands out at most a few per cell.
--
-- profiles.origin and profiles.share_label: what a signed-in person typed,
-- and whether they share it. share_label null means never asked; the rail
-- asks once. Guests keep the same two answers in localStorage only.
--
-- Apply with `supabase db query --linked -f`, never `db push`; then read the
-- columns back — see CLAUDE.md.
-- ---------------------------------------------------------------------------

alter table public.heartbeats
  add column if not exists label text
  check (label is null or char_length(label) between 1 and 60);

comment on column public.heartbeats.label is
  'Cleaned "Name from Origin", written only while the person opted to be seen. Pruned with the row.';

alter table public.profiles
  add column if not exists origin text
    check (origin is null or char_length(origin) <= 32),
  add column if not exists share_label boolean;

comment on column public.profiles.origin is
  'Where they said they are from, as typed and cleaned. Optional.';
comment on column public.profiles.share_label is
  'Null until asked. True: show name and origin to others while sitting together.';
