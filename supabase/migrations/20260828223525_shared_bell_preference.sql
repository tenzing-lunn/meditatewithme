-- "Until the bell" is a mode, not a magic number in timer_minutes.
-- Keeping the flag separate means the existing explicit stop constraint stays
-- truthful and a future slider edit does not have to chase another sentinel.

alter table public.preferences
  add column if not exists until_bell boolean not null default false;
