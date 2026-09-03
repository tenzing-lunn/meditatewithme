# Meditate With Me

Next.js (App Router) + Supabase. A candle is lit at the top of every UTC hour
and everyone on the site is looking at the same one; each person chooses how
long to sit, or sits *until the bell* and finishes with everyone else who did.
Built for a client, Jonny Knowles, against a written proposal — see
`context/VISION.md` for his idea and `context/PRODUCT.md` for what the site is
today, what he has been told, and what he hasn't.

## Start here

Before the first edit of a session, read in this order — it is short:

1. `context/PRODUCT.md` §1 and §5 — the site is live, what is open, what is
   undecided.
2. `plans/launch-readiness.md` — what is still owed, and what Jonny has not
   been told.
3. The `context/ARCHITECTURE.md` section for whatever subsystem you are about
   to touch (§4 sessions, §5 count, §6 time, §7 audio, §8 identity, §16 the
   room).

The SessionStart hook already puts the last fifteen commits and the working
tree in front of you. Everything else is in the folders below.

## Where writing goes

Anything written that isn't code lives in one of three places:

| Folder | Holds | Rule |
|---|---|---|
| `context/` | Standing knowledge about the project as a whole — `VISION.md` (the idea, and v1's place in it), `PRODUCT.md` (the product as built, decisions, what's undecided, what the client knows), `ARCHITECTURE.md` (how it runs and why) | **Read this before working.** Living reference: keep it true. If a change makes something here wrong, fix it in the same commit — a commit that changes what a visitor sees updates `PRODUCT.md`. |
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
| `main` | What the world sees — **the room, live since `626ef93` on 1 September 2026** | meditatewithme.vercel.app, and the custom domain once it's pointed |

`main` auto-deploys on push, so a commit landing there is a release whether or
not it was meant as one. That's the whole reason for the split — not ceremony.
Since the launch there is no holding page in front of it: whatever reaches
`main` is what a visitor at 4am sees.

The rules:

- Start every piece of work on `dev` (`git checkout dev`). Branch off `dev` for
  anything long-running, and merge back into `dev`, not `main`.
- Typecheck, tests and `npm run build` all pass on `dev` before it goes near
  `main`.
- Merging `dev` → `main` is a deliberate act that puts something live. **Ask
  Tenzing first, every time**; don't fold it into a commit that was about
  something else.
- Preview environment variables are set for the `dev` branch specifically, not
  for all preview branches — see §15 of `context/ARCHITECTURE.md`. A new branch
  with a different name won't reach Supabase until its vars are added too.

The branches used to differ at `app/page.tsx` — `main` served a holding page.
That ended with the launch merge; they are now the same tree at the same
commit until the next piece of work lands on `dev`.

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

## Testing in the browser preview

**Open it only for big things.** Typecheck, the tests and `npm run build` cover
most changes; a browser on top of that is ceremony. Open the preview when
rendering is the only way to know — animation and timing, layout that can
overflow or clip (this frame does not scroll), contrast over the photograph, or
a new screen seen for the first time. Not for copy changes, renames, refactors,
doc edits, or anything a passing test already proves. Saying "not visually
checked, it is a label change" is a fine answer.

**When you do open it, it plays out of Tenzing's speakers. Leave it silent.**

Pressing the landing's begin word calls `unlockAudio()` and `mix.ensure()` in
`openSetup` (`components/Room.tsx`), so **the stored ambient beds start playing
the moment the flow opens** — before any mixer is on screen. There is no silent
path through the setup flow, and `rain` is white noise, so it is perceptually
much louder than the other four at the same fader position. A hidden preview
pane keeps playing: the `visibilitychange` handler in `components/useMix.ts`
only ever *resumes*, deliberately, because a sitting must not stop when someone
glances at another tab.

So, for any run that opened the room:

- **Tear the audio graph down as the last action.** Unmounting `Entry` calls
  `handle.stop()`, so navigate to `/world` or `about:blank`, or close the tab.
  Closing the tab is the surest. Do not just take a final screenshot and stop.
- Never leave the pane parked on the sound question or on a live sitting.
- **Do not silence it by writing faders to 0.** `mwm.preferences` in
  localStorage is Tenzing's own stored mix, not scratch state — the same rule
  as everywhere else here: don't edit his data to tidy up after yourself.
- Prefer `read_page` / `javascript_tool` state over actually walking the flow.

The same applies to anything else a test leaves behind: a completed sitting
writes a real entry to the practice log. Say so rather than leaving it to be
discovered.

## Time

This is billed work: **£25/hr, capped at 55 hours.** `TIMELOG.md` at the repo
root is what any invoice is built from.

Session hooks capture each Claude Code session's wall-clock automatically into
`.timelog/pending.tsv` (compaction and resume don't reset it; crashed sessions
are swept up as `unclosed`; Cowork and Codex sessions are *not* captured). At
the end of a day, Tenzing runs `npm run timelog` and confirms each row. **An
agent does not need to record anything, and must not.**

**Never confirm hours.** Do not run `npm run timelog` with a number, do not edit
`TIMELOG.md`'s `Engaged` column, and do not offer an estimate when asked how
long something took. Not a guess from commit timestamps, not a figure inferred
from how much work a session produced. An agent sees a session, not a working
day, and has no idea whether anyone was watching it run. Hours are engaged
time — Tenzing directing, reviewing, testing, deciding — and only Tenzing can
know that number. A fabricated hour on an hourly
invoice is the worst error available on this project.

If asked "where are we against the 55?", read `TIMELOG.md` and answer from the
filled rows only. Say how many rows are unfilled rather than covering the gap
with an estimate.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
