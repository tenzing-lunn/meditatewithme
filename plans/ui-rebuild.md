# Meditate with me — the warm rail (UI rebuild)

## Context

The 13 September audit (`plans/audit-2026-09-13.md`) scored the dark photographic room and fixed its three P1s. Tenzing's decision on 14 September is to step away from that room entirely and rebuild the UI around the same functionality with a different setup:

- a soft brown / warm orange light screen, "Meditate with me" in a rounded face, that invites you to join a session;
- one question per screen, moving left to right as a sequence that leads to the session (name → where from → with others or by yourself → time → bell → sound → bowl);
- nothing in the background until the meditating screen; a singing bowl you strike to begin; the camera lifts to the seated view: the earth, who is meditating with you by name and origin, the clock small in the top right;
- a signed-in home that goes straight to the two doors, a three-line menu for account and settings, and a "use my usual settings" skip.

Scoping answers already given: rounded Google Font (Samsara is not on Google Fonts); "with others" is the existing shared hour (sit until the bell at :55, see them on the earth); origin is detected and confirmed; each person is a candle flame on the earth; the sitting itself is a full-screen warm dusk, and the flame sprites are redrawn.

Everything non-visual stays: `lib/` (session clock, timer stops, shared bell, practice log, preferences, geo, projection), the hooks, the audio graph, presence, accounts, the practice log, `/world`. Only the screens change, plus the small data additions that "Ana from Lisbon is meditating with you" needs.

## Before code (Phase 0, done first on approval)

1. **Hours.** Billed hourly. The session hooks already capture wall-clock into `.timelog/pending.tsv`; Tenzing confirms rows with `npm run timelog`. The agent records nothing and never edits `TIMELOG.md`, per `CLAUDE.md`.
2. **Commit the dirty tree** on `dev` so it does not get in the way: the 13 September work (`Room.tsx` P1 fixes, `DESIGN.md`, the audit, `context/JONNY-IDEAS.md`, `plans/meeting-with-jonny.md`, doc edits, `TIMELOG.md`, `.claude/settings.local.json`) as one or two commits, then `git checkout -b ui-warm`.
3. **Preview env vars for `ui-warm`.** Preview vars are scoped to `dev` (`context/ARCHITECTURE.md` §15). The Vercel MCP tools in this session have no env-var command, so they are added with the CLI, values from `.env.local`:

   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL preview ui-warm
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview ui-warm
   vercel env add SUPABASE_SERVICE_ROLE_KEY preview ui-warm
   ```

   Verified with `vercel env ls preview ui-warm`. Done in Phase 0 so the first push previews properly.
4. **Names and origins shown to others** are kept the way a meditation app should be: simple. Opt-in, cleaned, capped, gone with the heartbeat row after two days. No moderation machinery beyond that.

## Kept, modified, retired, new

**Kept (additive only):** all of `lib/`; `useAuth`, `usePreferences`, `useSyncPreferences`, `usePractice`, `useCount`, `useWorld`, `useSession`, `useMix`, `mix.ts`, `audio.ts`, `settingsLine.ts`, `FlameMark.tsx`, `worldDemo.ts`, `Practice.tsx` and `Document.tsx` (restyle), `Account.tsx` (panel restyled; its menu mode replaced by `Menu.tsx`), API routes other than the two below, migrations, tests.

**Modified:** `components/usePresence.ts` (optional label), `components/WorldMap.tsx` (`you` prop, reduced-motion static mode, redrawn candle sprite), `components/Entry.tsx`, `app/api/heartbeat/route.ts`, `app/api/world/route.ts`, `app/layout.tsx`, `app/globals.css`, `app/privacy/page.tsx`, `components/World.tsx`, `components/controls.ts`, `lib/geo.ts` (`WorldPoint.labels?`), `scripts/contrast.mjs`.

**Retired (git rm):** `components/Room.tsx`, `components/CandleScene.tsx`, `components/Settings.tsx`, `components/SoundMixer.tsx`, `public/room-base.{avif,jpg,png}`, `scripts/contrast-room.js`. `DESIGN.md` is rewritten from scratch.

**New (flat in `components/`, so `tests/caps.test.ts` needs no change):** `Journey.tsx`, `Rail.tsx`, `Screen.tsx`, `Wordmark.tsx`, `Menu.tsx`, `WelcomeScreen.tsx`, `NameScreen.tsx`, `OriginScreen.tsx`, `ModeScreen.tsx`, `TimeScreen.tsx`, `BellScreen.tsx`, `SoundScreen.tsx`, `BowlScreen.tsx`, `Bowl.tsx`, `Sitting.tsx`, `Afterwards.tsx`, `Home.tsx` (rewritten), `useProfile.ts`, `useOrigin.ts`, `useUsual.ts`, `useClock.ts`, `useReducedMotion.ts`, `useFullscreen.ts`. Plus `lib/label.ts`, `lib/journey.ts`, `tests/label.test.ts`, `tests/journey.test.ts`, `app/api/origin/route.ts`, `supabase/migrations/20260915090000_labels.sql`, `plans/ui-rebuild.md` (this plan, in the repo).

## Design tokens

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `paper` | `#f6e9d8` | page ground | |
| `surface` | `#fdf6ec` | fields, cards, doors | |
| `ink` | `#3b2a1d` | headings, wordmark | 11.4 on paper |
| `ink-2` | `#6a5342` | body | 6.0 on paper |
| `ink-3` | `#76604f` | captions | 4.9 on paper |
| `rule` | `#e6d5c1` | hairline, decorative | |
| `ember` | `#9c3d12` | the action colour: primary fill, selected, focus, links | 5.7 on paper; white on it 6.8 |
| `ember-soft` | `#f8d7b8` | selected chip, switch-on fill | ember on it 5.0 |
| `glow` | `#d9661f` | decorative orange only: bowl rim, flame tints, gradients; never text or a control edge | 3.0 on paper |
| `dusk` | `#2b1a10` | the sitting ground | |
| `dusk-ink` | `#f6e9d8` | type on dusk | 14.0 |
| `dusk-ink-2` | `#d7bfa6` | secondary on dusk | 9.5 |
| `flame` | `#e0a057` | sprite family | 7.4 on dusk |

The brighter orange `#b5491a` fails AA on paper (4.5 needed, 4.47 measured), which is why the action colour is the deeper ember and the bright orange is decorative.

**Type.** Comfortaa (display: wordmark, question titles, ending minutes; 400 and 700) and Nunito (body, controls; 400 and 600), both via `next/font/google` in `app/layout.tsx` (both present in Next's font data). Clock numerals: Nunito with `tabular-nums`, checked in Phase 3; fall back to keeping IBM Plex Mono for the clock if digits jitter. Instrument Serif and Plex Sans go. Scale: wordmark 2.25rem → 3rem at `sm`; question title 1.75 → 2.25 (Comfortaa 700, line-height 1.15); ending minutes 3.5; body 1; control 0.9375 (Nunito 600); label 0.8125; clock 1.25 tabular. Radii: control 1rem, card 1.5rem, pill. Every control `min-h-11`; doors `min-h-24`. Sentence case everywhere; `uppercase` budget stays 1 with zero uses.

**Motion.** CSS custom properties in `globals.css`: `--rail-ms: 520ms`, `--ease-rail: cubic-bezier(0.22,1,0.36,1)`; content fade-up 240ms with 60ms stagger; control colour 200ms; bowl strike: rim wobble 600ms plus three ripple rings 1400ms staggered 180ms; camera lift 1400ms; ending hold 10s then 600ms fades.

**Approach: first-party CSS, no `motion` package.** Every move here is a translateX on a track, a class-toggled keyframe on an SVG, or a two-layer crossfade. React `<ViewTransition>` is rejected: it only fires inside `startTransition`, and Safari differs. Reduced motion is honoured in one place: `useReducedMotion()` plus a global `@media (prefers-reduced-motion: reduce)` block setting `--rail-ms: 0ms`; rail jumps with a 200ms crossfade, the strike is one opacity pulse, the lift is a 400ms crossfade, `WorldMap` holds `breath = 1` and `pulse = 0.5` (`components/WorldMap.tsx:716` and `:732`).

## The screens

### Stage machine

`lib/journey.ts` (pure, tested):

```ts
export type Screen = 'welcome'|'name'|'origin'|'mode'|'time'|'bell'|'sound'|'bowl';
export function screensFor(i: { signedIn: boolean; usual: boolean; hasAnswers: boolean; originAsked: boolean }): Screen[];
// guest, first time:  welcome name origin mode time bell sound bowl
// guest, usual on:    welcome mode bowl
// signed in, first:   mode origin time bell sound bowl   (origin only until asked once)
// signed in, usual:   mode bowl
// Settings from the menu: time bell sound, exiting to home (no bowl)
export function step(screens: Screen[], at: Screen, dir: 1 | -1): Screen | null;
```

`components/Journey.tsx` owns `Stage = rail | sitting | finished` (the `sitting` shape as `Room.tsx:80-97`), `useClock()` (the 250ms tick lifted from `Room.tsx:589-615`), `usePresence({ label })`, `useSession`, and carries over `begin()` (`Room.tsx:712-763`: `unlockAudio(); mix.ensure(); mix.restore()`, shared-bell target via `nextSharedBellAt`, `scheduleBell`, `openingBell`, `recordBegin`), `endEarly()` (`Room.tsx:820-845`) and the finishing effect (`Room.tsx:848-878`). **The auto-start effect at `Room.tsx:797-808` is deleted**: every sitting starts from the bowl strike, a real gesture, so `Entry.startSitting`'s pre-unlock goes too.

**Audio unlock points.** The first Next on Welcome, and a door on Home, call `unlockAudio(); mix.ensure({ silent: true })`. The Sound switch calls `mix.unmute()` when turned on and writes zeros to the beds when turned off. The bowl strike calls `mix.ensure(); mix.restore()`; a first-timer has an empty mix and hears only the bell. `previewBell` on the Bell screen is audible on select, as today.

### Rail and Screen

`Rail.tsx`: a flex track of `w-full shrink-0 h-dvh` panels, `translateX(calc(var(--i) * -100%))`, `overflow: hidden` frame. All screens of the current list are mounted; non-current panels get `inert` and `aria-hidden`, and `visibility: hidden` after `transitionend`. Focus moves to the new panel's heading. Escape is Back. Each panel scrolls itself; the page never does.

`Screen.tsx`: title (Comfortaa), one line of body, the control, then Back (quiet) and Next (ember fill, white text) on the safe-area inset. Optional "Skip" as a quiet word.

| Screen | Reads | Writes | Notes |
|---|---|---|---|
| Welcome | `useCount`, `useUsual`, `hasAnswers` | | Wordmark, one sentence, "Join a session". When ≥ 2 are live: "3 people are sitting right now". Returning guests see "Your usual: 10 minutes · singing bowl · in silence" (from `settingsLine`) and a switch "Skip the questions next time". Menu top-right. |
| Name | `profile.name` | `profile.name` | Optional, Skip. Signed-in never sees it. 24-char cap. |
| Origin | `useOrigin()` suggestion, `profile.origin`, `profile.share` | both | "Where are you sitting?" pre-filled with "Lisbon, Portugal" when the edge knows; confirm, edit, or leave blank. A switch, default off: "Let others see *Ana from Lisbon* while you sit with them". One line: nothing is kept on our side until you say yes. Empty in dev. |
| Mode | `prefs.showCount` | `prefs.showCount` (true = with others), `prefs.untilBell` | Two doors. "With others: sit until the bell at 12:55 with everyone, and see them on the earth." "By yourself: your own timer, nobody shown." `showCount` is reused as the mode flag; no preferences migration. `ARCHITECTURE.md` §8 must say so. |
| Time | `timerMinutes`, `untilBell` | both | Slider over `TIMER_STOPS` with `aria-valuetext`, plus a number field that snaps through `clampMinutes`. With others: a 13th stop "Until the bell at 12:55" (`nextSharedBellAt`, same roll-forward under 5 minutes). |
| Bell | `endBell` | `endBell` | Three chips; `previewBell(kind)` on select. Audible. |
| Sound | `soundMix` | via `onSound` | Switch off by default (`TRACKS.some(up)` as `Settings.tsx:126`); on → `mix.unmute()` and the five bed chips; "Adjust levels" reveals faders and a master. |
| Bowl | `settingsLine(prefs, now)` | | "Until 12:55 · singing bowl · rain" under a drawn bowl, "Strike the bowl to begin". Pressing = `begin()` + `Bowl.strike()`. Desktop only (`document.fullscreenEnabled` and `pointer: fine`): a quiet "Full screen" toggle remembered in `mwm.display`, `requestFullscreen()` called inside the same click. |

### Bowl → sitting: the camera lift

Two layers in `Journey`: the bowl panel scales 1 → 0.55, translates down 28vh, fades out; `Sitting` mounts at scale 1.06 / opacity 0 and settles to 1 / 1; the frame's background transitions `paper → dusk`. 1400ms, one easing. Under reduce: 400ms crossfade, no transforms.

### Sitting

Ground `dusk`. **With others:** `WorldMap` full width, with a new `you?: Cell | null` prop drawn as a slightly larger sprite with a soft ring, from `useOrigin().cell` (the client marks itself; the server never does, per `app/api/world/route.ts:21-23`). **Flame sprites redrawn** as small candles on dusk: a short wick stem, a teardrop flame with a paler core, still additive so the pings keep their glow; the existing sprite cache and `breath`/`pulse` loop stay. Under the earth, one line built from `/api/world` labels and `/api/count`:

- "Ana from Lisbon is meditating with you" (own label excluded client-side)
- "Ana from Lisbon and 3 others are meditating with you" (`others = max(0, count − 1 − shown)`, omitted when count is null)
- "4 others are meditating with you"
- "You are the first here this hour" (`litCount === 1`)
- nothing when the count is unavailable. Never invented.

Labels rotate every 20s when several, picked from time so two devices agree. Clock small, top-right, `mm:ss` tabular, `role="timer"`. Foot: "Sound" (opens the Sound controls as a sheet; `mix.unmute()` on open) and "End". **By yourself:** same ground, no earth, no line; the bowl stays faintly centred; clock top-right; same two controls.

### Afterwards

Ten-second hold with the bell tail, then: minutes at display size; streak/total only when they say something (`summarise` in `lib/practice.ts`); "With you this hour · 3 others" only for with-others sittings and only when `withOthers !== null`; "Sit again" (calls `begin()` inside the click) and "Done" (signed-in → home) or "Finish" (guest → Welcome); guests get the account offer at the foot. Exits fullscreen. The ground lifts back to paper on Done/Finish.

### Signed-in Home

Wordmark; "Hello, Ana" (`displayName`); the two doors (`ModeScreen` compact); under them "Your usual: until 12:55 · singing bowl · rain" and the switch "Skip the questions and use these"; one line from `useCount` when ≥ 2 live. A door: `unlockAudio(); mix.ensure({ silent: true })`, mount `Journey` starting at `time` (or `bowl` when usual is on; `origin` first if never asked). Three-line `Menu` top-right: Account (email, editable name via `supabase.auth.updateUser({ data: { name } })` added to `useAuth`; origin and share switch; delete account), Settings (rail at `time`, exit home, no bowl), Practice, Sign out. Foot: Privacy, Terms (still gated until the controller is named).

### "Usual settings" (`useUsual.ts`, `mwm.usual`)

`{ enabled, fingerprint }` where fingerprint = `settingsLine(prefs)` + mode at the moment the switch was turned on. Honoured only while the fingerprint matches; any preference change (a settings edit, a sync from another device) turns the skip off, which is what "when nothing changed" means. Guests get the same; `hasAnswers` is `mwm.flow.answeredAt`, written on the first bowl strike.

## Data and API

### `lib/label.ts` (pure, `tests/label.test.ts`)

```ts
export const NAME_MAX = 24; export const ORIGIN_MAX = 32; export const LABEL_MAX = 60;
export function cleanText(v: unknown, max: number): string | null; // trim, NFC, strip controls/zero-width/bidi, collapse whitespace, cap by code points
export function composeLabel(name: string | null, origin: string | null): string | null; // "Ana from Lisbon" | "Ana" | "Someone from Lisbon" | null
export interface Profile { name: string | null; origin: string | null; share: boolean | null }
export function normalizeProfile(v: unknown): Profile;
```

### Migration `supabase/migrations/20260915090000_labels.sql`

```sql
alter table public.heartbeats
  add column if not exists label text
  check (label is null or char_length(label) between 1 and 60);
alter table public.profiles
  add column if not exists origin text check (origin is null or char_length(origin) <= 32),
  add column if not exists share_label boolean;  -- null = never asked
```

Apply with `supabase db query --linked -f`, then read the columns back with a second query. `profiles` already has the own-row RLS policy (`0001_init.sql`); `display_name` stays unused, the name stays in `auth.users.user_metadata.name`.

### `/api/heartbeat`

Body gains `label?: { name?, origin? } | null`. `undefined` leaves the column alone (same spread pattern as `cell` at `route.ts:84-90`); `null` clears it; an object is cleaned and composed server-side. `usePresence({ label })` sends the label only while `stage.kind === 'sitting' && sit.together && profile.share`, beats immediately on change, and sends `null` on End.

### `/api/world`

`points[].labels?: string[]` for live cells only, at most 3 per cell and 60 in total, busiest cells first. Still identical for every caller, so `s-maxage=10` stays. `WorldPoint.labels?` added to `lib/geo.ts`.

### `/api/origin` (new)

`force-dynamic`, `private, no-store`. Returns `{ city, country, cell }` from `x-vercel-ip-city` (percent-decoded), `x-vercel-ip-country` (ISO-2, turned into a name client-side with `Intl.DisplayNames`), and `snapToCell`. Nothing stored. Null on localhost. `useOrigin()` fetches once, memory only. `ARCHITECTURE.md` §14's "deliberately not read" becomes "read to suggest, never stored until confirmed".

### Guest profile

`mwm.profile` via `useProfile(auth)`: guests in localStorage; signed-in pulls `origin`/`share` from `profiles` once and pushes on change, shaped like `useSyncPreferences`.

### Privacy page and inventory

`app/privacy/page.tsx`: "Where you are" gains the suggestion sentence; new section "Your name and where you are from" (optional; on your device and in your profile; sent with the being-counted record only while you sit with others and the switch is on; shown as "Ana from Lisbon"; gone with that record after two days). `plans/privacy-data-inventory.md` gains two rows.

### `scripts/contrast.mjs`

Drop the `runtime` (`:root`) mode since the dark override is deleted; read `@theme` only; pairs: `ink`, `ink-2`, `ink-3`, `ember` on `paper` and `surface` (4.5); `ember` on `ember-soft`; white on `ember`; `dusk-ink`, `dusk-ink-2`, `flame` on `dusk` (4.5); `glow` on `dusk` (3.0, decorative). `contrast-room.js` retired.

## Phases

Each phase ends with `npm run typecheck && npm test && npm run build` green, and `npm run contrast` from Phase 1. Browser via `.claude/launch.json`; `127.0.0.1:3000` is a guest, `localhost:3000` is Tenzing signed in. **No sitting is started in a browser until Phase 7.**

0. **Commit, branch, vars.** Commit the 13 September work on `dev`; `git checkout -b ui-warm`; add the three preview vars for `ui-warm` with the Vercel CLI; copy this plan to `plans/ui-rebuild.md`. Check: clean tree, `vercel env ls preview ui-warm` shows three, baseline green.
1. **Foundations.** `layout.tsx` (fonts, `colorScheme: 'light'`, `themeColor`), `globals.css` (new `@theme`, motion vars, reduced-motion block), `controls.ts`, `useReducedMotion`, `useClock`, `useFullscreen`, `contrast.mjs`. Check: contrast passes; build. Not visually checked; the old room looks wrong for one commit and is deleted in the next.
2. **The rail and the questions.** `lib/journey.ts` + tests, `Journey`, `Rail`, `Screen`, `Wordmark`, `Menu`, the eight screens, `Bowl` (drawing + strike, wired to `begin()` with a stub sitting), `Account` restyled, `Entry` rewired (guests → `Journey`; signed-in → old Home temporarily). Retire Room, CandleScene, Settings, SoundMixer, the room images, contrast-room. Check in browser at `127.0.0.1:3000`, 375×812 and 1280×800: walk Welcome → Sound; rail motion; Back; Escape; `read_page` confirms `inert` on other panels and 44px targets; reduced-motion emulation. **Do not tap a bell chip, flip the Sound switch, or press the bowl.** Close the tab at the end.
3. **Sitting and ending.** `Sitting`, `Afterwards`, the lift, `WorldMap` (`you`, reduced motion, redrawn candle sprite), by-yourself variant, fullscreen toggle. Add a dev-only preview: `/?demo=sitting` and `/?demo=finished` mount the screens with `DEMO_POINTS` from `worldDemo.ts`, a frozen clock, no presence, no audio graph, behind the same dev-only guard as `useWorld.ts:52-64`. Check on the demo params only: both modes, both viewports, reduced motion; the new sprite at 1× and 2×; Nunito tabular digits.
4. **Data.** `lib/label.ts` + tests, migration, heartbeat and world routes, `/api/origin`, `useOrigin`, `useProfile`, Origin/Name wired, `usePresence({ label })`, the sitting line, Account origin/share, privacy page and inventory. Push. Check: migration read back; on the preview `GET /api/origin` returns a city; one `POST /api/heartbeat` with a test label, `GET /api/world` shows it and `x-vercel-cache` still hits; delete that row straight away (it inflates the live count while it exists).
5. **Signed-in home and the skip.** `Home` rewritten, `Menu` items, `useUsual`, Settings-from-menu, Practice/Account restyled, `useAuth.updateName`. Check on `localhost:3000`: home, menu, toggle usual, a door lands on Time or Bowl as expected; `journey.test.ts` covers every `screensFor` case. Do not strike the bowl.
6. **Docs and second-order surfaces.** `DESIGN.md` rewritten; `PRODUCT.md` §2; `ARCHITECTURE.md` §8 (showCount means mode), §12, §14 point 4, §16 → "The screens", §17; `CLAUDE.md` browser-testing section rewritten (silent up to the Bell screen; a bell chip is audible; the Sound switch starts beds; the bowl starts a sitting; the demo params); `README.md`; `World.tsx` chrome on the light palette with the map in a dusk panel; `Document.tsx`; OG card on the warm ground with Comfortaa. Check: `grep -rn "photograph\|Room.tsx\|CandleScene\|Instrument" context/ CLAUDE.md DESIGN.md README.md` returns only history; build.
7. **Deliberate end-to-end, then merge to `dev`.** On the preview with speakers acknowledged: one 1-minute by-yourself sitting; one with-others sitting with share on from a second origin to see "… is meditating with you"; fullscreen on the Mac; reduced motion; iPhone Safari (fullscreen hidden); keyboard only. Name the practice-log entries and heartbeat rows this creates. Then merge `ui-warm` → `dev`; `main` untouched until Tenzing says.

## Risks and open questions

- Two caches, one sentence: labels from `/api/world`, counts from `/api/count`, up to 30s apart. The line omits rather than contradicts.
- `x-vercel-ip-city` is percent-encoded and absent on VPNs and localhost: decode, and the field is simply empty.
- Comfortaa is never used under 1.25rem; clock digits checked in Phase 3.
- Migration history is unreconciled: apply one file with `db query`, read back.
- Open: whether "with others" still allows a private length (proposed yes, the bell chip is the default); whether the ending keeps the ten-second hold (proposed yes); whether the OG card moves now or with Jonny's imagery.

## Critical files

- `components/Room.tsx:589-878` — the clock tick, `begin`, `endEarly`, finishing effect that `Journey.tsx` carries over before the file is deleted
- `components/Entry.tsx` — the Home / journey switch and hook ownership
- `app/api/heartbeat/route.ts`, `app/api/world/route.ts` — label in, bounded labels out, cacheability kept
- `components/WorldMap.tsx` — `you` prop, reduced motion, the sprite redraw (additive light at `:422` and `:718`)
- `app/globals.css`, `scripts/contrast.mjs` — the palette and its gate
