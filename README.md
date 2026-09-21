# Meditate With Me

A warm screen asks one thing at a time — your name, where you are from, with
others or by yourself, how long, which bell, any sound — and leads to a bowl.
Strike it and the light goes down: you are seated in front of the earth, where
everyone sitting this hour is a candle and one line says who is with you.
Choose *with others* and you finish on the same bell, at the same second, as
everyone else who did.

**Status:** live at meditatewithme.vercel.app since 1 September 2026
(`626ef93`), with step 08 — legal copy, real-device QA, auth SMTP, custom
domain — still open behind it. See
[`context/PRODUCT.md`](context/PRODUCT.md) for what the product is today and
what is still undecided, [`context/VISION.md`](context/VISION.md) for the
client's larger idea and where v1 sits in it,
[`plans/launch-readiness.md`](plans/launch-readiness.md) for the live checklist,
[`context/ARCHITECTURE.md`](context/ARCHITECTURE.md) for the system design, and
[`plans/v1-build-spec.html`](plans/v1-build-spec.html) for the original scope.

---

## Setup

```bash
npm install
cp .env.example .env.local     # fill in your Supabase keys
npm run dev
```

Apply a migration one file at a time, never with `db push` (`CLAUDE.md` says
why):

```bash
supabase db query --linked -f supabase/migrations/<file>.sql
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Local dev server |
| `npm test` | Unit tests for the pure logic (no build step, no deps) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run contrast` | Every colour pair in `DESIGN.md` against its threshold |

---

## How it works, briefly

**There is no scheduler.** A session exists for every UTC hour whether or not a
database row does. `resolveSession()` floors the clock to the hour, looks for an
override row, and returns an ambient candle when it finds nothing. There is no
cron, no job queue, nothing to fail at 3am — and the empty-hour fallback isn't a
feature we built, it's what happens when the lookup returns null.

**Three different clocks, deliberately.**

- `serverNow()` (`lib/clock.ts`) — device clock corrected against the server.
  Used for anything about *which session is running*. A laptop three minutes
  fast would otherwise light its candle three minutes early and silently break
  the one thing the product promises.
- `performance.now()` — the personal timer. Monotonic, so an NTP correction
  mid-session can't move someone's bell.
- `AudioContext.currentTime` — when the bell actually fires. Background tabs
  throttle `setTimeout` to roughly once a minute, and a meditation app whose
  bell arrives ninety seconds late has failed at its only job.

**The room is polled, not pushed.** Realtime presence looks like the obvious
fit and isn't: presence sync costs O(N) messages per join, and everyone joins
at the top of the hour simultaneously. What the room needs — how many are here
now, how many lit a candle this hour, how many began with you — is low-value,
low-frequency, and identical for every viewer, so it caches. One 10-second edge
cache entry serves the whole world. Full reasoning in ARCHITECTURE.md §5.

**The screens are a rail.** `components/Journey.tsx` owns which questions a
visitor sees (`lib/journey.ts` decides, and is tested), `Rail.tsx` slides them
in from the right one at a time, and the bowl at the end is the only thing that
starts a sitting. `Sitting.tsx` is the dusk frame with the earth; `Home.tsx` is
the signed-in page with the two doors. ARCHITECTURE.md §16 has the rules and
DESIGN.md the visual system.

**Nothing shows an error screen.** Every failure hides a control or degrades
quietly. Supabase down still leaves you a working candle, timer, and sound mix.

---

## Layout

```
app/api/time       server clock, never cached
app/api/count      participant count, edge-cached 10s
app/api/world      lit cells and the labels of people who chose to be seen, 10s
app/api/origin     the town and country the edge sees, to suggest; never stored
app/api/heartbeat  presence write, service role only
lib/session.ts     the scheduler — pure functions
lib/clock.ts       drift correction — pure functions
lib/journey.ts     which screens, in which order — pure functions
lib/label.ts       "Ana from Lisbon": cleaned, capped, composed — pure functions
lib/supabase.ts    browser vs service clients
supabase/          migrations
tests/             unit tests for lib/
```

`lib/session.ts` and `lib/clock.ts` contain no React and no I/O. That's
intentional — they hold the logic where a bug would be least visible in manual
testing, so they're the parts worth testing properly.

---

## Security notes

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS completely. It has no `NEXT_PUBLIC_`
prefix so Next.js won't inline it into the client bundle, and `serviceClient()`
must never be imported into a component — route handlers only.

`heartbeats` has RLS enabled with **no browser policy**, which means the anon
key cannot touch it at all. Reads and writes both go through route handlers.
The count is a public number; the rows behind it are not.
