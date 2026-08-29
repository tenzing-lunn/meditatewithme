# Meditate With Me

Next.js (App Router) + Supabase. A synchronised global meditation session, one
new session at the top of every UTC hour.

## Where writing goes

Anything written that isn't code lives in one of three places:

| Folder | Holds | Rule |
|---|---|---|
| `context/` | Standing knowledge about the project as a whole — how the system works, why it's built this way, constraints that bind every decision | **Read this before working.** Living reference: keep it true. If a change makes something here wrong, fix it in the same commit. |
| `plans/` | Active plans — specs, proposals, build orders, anything we're still working from | Working documents. Edit them freely as the work moves. |
| `docs/` | Everything finished — completed plans, delivered client documents, anything we keep but no longer act on | Archive. Don't rewrite history here; if a doc needs changing, it's probably active again. |

**When a plan is finished, `git mv` it from `plans/` to `docs/`** in the same
commit that finishes the work, and fix any links that pointed at the old path.
That move is the only signal that something is done — so don't skip it, and
don't leave a finished plan sitting in `plans/`.

New plans go in `plans/` from the start. Never write a plan straight into `docs/`.

`context/` sits outside that lifecycle — it isn't a stage plans pass through.
A finished plan goes to `docs/`; what that plan *established* about the project
gets folded into `context/`. Nothing in `context/` is ever archived, only
corrected.

`README.md` stays at the repo root — it's the front door, not a document.

## Branches

**Work on `dev`. Never commit straight to `main`.**

| Branch | Is | Deploys to |
|---|---|---|
| `dev` | Where everything is built and tested | A preview URL, per push |
| `main` | What the world sees | meditatewithme.vercel.app, and the custom domain once it's pointed |

`main` auto-deploys on push, so a commit landing there is a release whether or
not it was meant as one. That's the whole reason for the split — not ceremony.

The rules:

- Start every piece of work on `dev` (`git checkout dev`). Branch off `dev` for
  anything long-running, and merge back into `dev`, not `main`.
- Typecheck, tests and `npm run build` all pass on `dev` before it goes near
  `main`.
- Merging `dev` → `main` is a deliberate act that puts something live. Ask
  first; don't fold it into a commit that was about something else.
- Preview environment variables are set for the `dev` branch specifically, not
  for all preview branches — see §15 of `context/ARCHITECTURE.md`. A new branch
  with a different name won't reach Supabase until its vars are added too.

The two branches deliberately differ at `app/page.tsx`: `main` serves the
holding page, `dev` serves the room. **Merging `dev` into `main` is the launch.**

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
