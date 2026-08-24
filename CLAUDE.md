# Meditate With Me

Next.js (App Router) + Supabase. A synchronised global meditation session, one
new session at the top of every UTC hour.

## Where writing goes

Anything written that isn't code lives in one of two places, and which one
depends only on whether the work is still live:

| Folder | Holds | Rule |
|---|---|---|
| `plans/` | Active plans — specs, proposals, build orders, anything we're still working from | Working documents. Edit them freely as the work moves. |
| `docs/` | Everything finished — completed plans, delivered client documents, reference we still read but no longer act on | Archive. Don't rewrite history here; if a doc needs to change, it's probably active again. |

**When a plan is finished, `git mv` it from `plans/` to `docs/`** in the same
commit that finishes the work, and fix any links that pointed at the old path.
That move is the only signal that something is done — so don't skip it, and
don't leave a finished plan sitting in `plans/`.

New plans go in `plans/` from the start. Never write a plan straight into `docs/`.

`README.md` stays at the repo root — it's the front door, not a document.

## Code layout

- `app/api/` — route handlers (`time`, `count`, `heartbeat`)
- `lib/` — no React, no I/O beyond explicit fetches. `session.ts` and `clock.ts`
  are pure and unit-tested; keep them that way.
- `supabase/migrations/` — SQL, forward-only
- `tests/` — mirrors `lib/`

## The one thing that must not break

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. It has no `NEXT_PUBLIC_`
prefix so Next.js won't inline it into the client bundle — never import
`serviceClient()` from `lib/supabase.ts` into a component, and never add that
prefix. See `.env.example`.
