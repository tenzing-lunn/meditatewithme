# ARCHITECTURE

Scanned 2026-10-03. Verified against code; deeper rationale lives in `context/ARCHITECTURE.md` (section numbers refer to it) and `context/PRODUCT.md`. Note `context/ARCHITECTURE.md` still mentions `components/Home.tsx`, which no longer exists (Entry/Journey now serve everyone).

## Shape in one paragraph
A mostly static, fully client-rendered Next.js 16 App Router site (`app/page.tsx` -> `components/Entry.tsx` -> `components/Journey.tsx`) that talks to a handful of cache-friendly route handlers, which talk to Supabase with the service role. Shared time is the product: everyone sits the same hour (`:00`-`:55`, bell at `:55`), derived by pure functions from a server-corrected clock. There is no WebSocket server, queue, Redis, or Realtime; the participant count is an edge-cached poll. An Expo app in `mobile/` reuses `lib/` in place.

## Layers (top depends on bottom)
1. `app/` - routing shell. `layout.tsx` (font, metadata, inline pre-paint room script), `page.tsx` (renders `Entry`), `privacy/`, `terms/`, `credits/`, `admin/`, `live-test/`, OG/apple icon generators, and `app/api/**` server handlers.
2. `components/` - all React plus platform access:
   - Screens/UI: `Journey`, `Rail`, `Arrive`, `Screen`, `NameScreen`, `OriginScreen`, `Picker`, `Sitting`, `Afterwards`, `AgainSetup`, `Practice`, `Remember`, `Account`, `AccountCorner`, `Sounds`, `SoundLine`, `Streaming`, `Admin`, `Emails`, `Document`, marks (`BowlMark`, `FlameMark`, `Pebble`), `Pond` (one canvas redrawn every frame).
   - Hooks (`use*.ts`): the only place browser APIs and network calls live: `useAuth`, `usePreferences`, `useSyncPreferences`, `usePractice`, `useProfile`, `useOrigin`, `usePresence`, `useWorld`, `useLive`, `useClock`, `useMix`, `useWakeLock`, `useFullscreen`, `useReducedMotion`, `useUsual`, `usePlaces`, `useEmailUpdates`, `useTypedOut`.
   - Imperative engines (no React): `audio.ts` (Web Audio: beds, bells, `unlockAudio`, `scheduleBell`, `openingBell`, `previewBell`), `mix.ts` (mixer graph with silent `ensure`/`unmute`/`restore`), `liveVideo.ts`, `controls.ts`, `settingsLine.ts`.
   - Dev-only fixtures: `Demo.tsx`, `worldDemo.ts` (gated by `process.env.NODE_ENV === 'development'` + dynamic import so they never ship).
3. `lib/` - pure domain logic. No React, no I/O except explicit `fetch` and the two Supabase factories. Unit-tested in `tests/`. Imported by web (`@/lib/...`) and by `mobile/` (relative paths, Metro `watchFolders`).
4. `supabase/migrations/` - schema, RLS, one pg_cron job; forward-only SQL applied by hand.
5. `infra/mediamtx/` - external video server config (separate deploy target, not part of the Next app).

## Hard boundaries
### `lib/` portability rule
- Never use `window`, `document`, `localStorage`, `navigator`, `AudioContext` etc. in `lib/`. `tests/portability.test.ts` scans `lib/` and fails the build. Take the value as a parameter (pattern: `lib/clock.ts` takes `fetchImpl`). `fetch` and `performance` are allowed (exist in React Native).
- Platform access goes in `components/` behind a hook. Do not build storage/audio adapter layers in anticipation.
- `lib/` imports siblings with explicit `./name.ts` extensions (Node strip-types tests and the mobile tsconfig need it).
- `lib/supabase.ts` reads `process.env.NEXT_PUBLIC_*` and is web/server only; `mobile/` imports only pure modules (currently `lib/format.ts`, `lib/timer.ts`).

### Service-role-key boundary
- `serviceClient()` (`lib/supabase.ts`) is for `app/api/**` route handlers only. Components use `browserClient()` (anon key, RLS). `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix. After any change to `serviceClient()` callers or shape, grep `.next/static` for the key (and for the publishable key as a control) - `context/ARCHITECTURE.md` section 15.
- The service key is also an HMAC secret (`hash()` in `app/api/_email/codes.ts`, `accountKey()` in `app/api/live/secret.ts`); rotating it invalidates outstanding codes and derived account stream keys.
- Routes acting for a user verify a Bearer JWT with `callerOf()`; admin routes also check the `admins` table (`app/api/admin/route.ts`).

## Core abstractions and data flow
### Shared hour (`lib/session.ts`, `lib/clock.ts`, `lib/timer.ts`)
- `hourStart/nextHourStart/msIntoHour/msUntilNextSession`: all session maths from a timestamp; `SESSION_MINUTES` 55.
- `resolveSession(now, lookup)`: `sessions` rows are overrides; no row = `ambientSession`. Lookup injected (`app/api/session/route.ts` supplies the Supabase query). Failure degrades to ambient, never an error.
- `lib/clock.ts`: module-level device/server offset; `syncClock()` hits `/api/time` (never cached); `serverNow()` used by all screens (`components/useClock.ts` re-syncs on focus).
- `lib/timer.ts`: duration stops, `nextSharedBellAt` ("until the bell"), `monotonicEndAtFromServerTarget` (maps a server target onto the monotonic `performance` clock), `remainingMs`, `mmss`.

### Presence and the earth
- `components/usePresence.ts`: `begin()` posts a heartbeat (`POST /api/heartbeat`, anon UUID, optional label, `began` flag), repeats ~30 s, polls `/api/count`.
- `app/api/heartbeat/route.ts`: validates UUID, snaps Vercel IP geo headers to a coarse cell (`lib/geo.ts`), upserts `heartbeats (anon_id, hour_start)`.
- `app/api/count/route.ts` (live within 90 s, lit this hour) and `app/api/world/route.ts` (per-cell points, max 600, labels max 60): service-role reads with `s-maxage=10, stale-while-revalidate=20`; errors return 200 with nulls and the UI hides the number.
- `components/useWorld.ts` -> `Pond.tsx` with `lib/projection.ts`, `lib/earthView.ts`, `lib/candle.ts`; `lib/pond.ts` and `lib/fish.ts` are the water/fish simulation maths.

### The journey (`lib/journey.ts`, `components/Journey.tsx`)
- `Entry` calls every shared hook exactly once (auth, preferences, practice, mix, email updates) and waits for all to load (a guest does not wait for auth) before rendering `Journey`, so screens are decided once at mount.
- `screensFor(facts)` returns the ordered rail (mode/name/origin/time/bell/sound -> bowl); `step`, `doorPatch`, `usualFingerprint` are pure.
- Bowl press = `begin()` (audio `ensure`+`restore`, opening bell, presence). `Sitting.tsx` schedules the end bell on the Web Audio clock, then `Afterwards` records to the practice log (`usePractice` -> localStorage and, signed in, `sittings`).
- Audio privacy: doors build the graph silent (`mix.ensure({silent:true})`); only the Sound switch and the bowl raise the master.

### Preferences, practice, profile, account
- Pure: `lib/preferences.ts` (`normalize`, `toRow/fromRow`, `samePreferences`), `lib/practice.ts` (streaks, merge). Stateful: `usePreferences` + `useSyncPreferences` (localStorage `mwm.preferences` + Supabase), `usePractice` (`mwm.practice` + `sittings`).
- `useAuth.ts` state machine (loading / signed-out / signed-in; Google, OTP, connected-address code); UI in `AccountCorner.tsx`, `Account.tsx`.

### Live video (details in INTEGRATIONS.md)
Guide -> MediaMTX (RTMP/SRT) -> HLS; MediaMTX calls `/api/live/auth` and `/api/live/hook`; viewers poll `/api/live`; `lib/live.ts` holds all selection rules. Hour ownership is claimed by an upsert (ignoreDuplicates) on `live_hours` then re-read.

## Entry points
- Page: `app/page.tsx` -> `components/Entry.tsx`. Other pages: `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/credits/page.tsx`, `app/admin/page.tsx`, `app/live-test/page.tsx`.
- API (all `force-dynamic`): `GET /api/time`, `/api/session`, `/api/count`, `/api/world`, `/api/origin`, `/api/live`; `POST /api/heartbeat`; `POST|PUT /api/signin`; `DELETE /api/account`; `/api/account/emails`; `/api/account/stream`; `/api/admin`; `POST /api/live/auth`, `/api/live/hook`.
- Mobile: `mobile/index.ts` -> `mobile/App.tsx` (single-screen "bell on a locked phone" test).
- Scripts: `scripts/live-key.mjs`, `build-*.mjs`, `contrast.mjs`, `timelog.mjs`. Database: `supabase/migrations/*.sql`, applied manually.

## Patterns to follow
- Cache by headers at the CDN anything identical across viewers; never cache `/api/time`.
- Degrade, never error visibly: count, world, session, live routes return a valid shape on failure.
- Inject I/O into pure functions (`resolveSession` lookup, `syncClock(fetchImpl)`).
- One instance of shared state, called high (`Entry`), handed down as props; no context providers or state library.
- Heavy libraries via dynamic `import()` (`@supabase/supabase-js`, `hls.js`, `Demo`).
- Comments explain why at length; keep `context/` and `DESIGN.md` true in the same commit as any behaviour change.

## Known gaps and caveats
- Migration history table and local files disagree; schema is not deployed with the app, so a deploy can precede its columns.
- `ROOM_BEFORE_PAINT` inline script in `app/layout.tsx` is a hand copy of `lib/room.ts` logic (only the original is tested).
- Preview env vars are scoped to branch `dev` only.
- `npm run lint` is defined but no linter is configured.
- Mobile shares only pure `lib/` modules; audio and screens are separate.
