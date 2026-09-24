# UI/UX fixes — the plan from the 21 September audit

Acts on `docs/audit-2026-09-21.md`. Finding numbers (H1, M4, L13…) are that
document's. Everything below is on `dev`; nothing goes to `main` without
Tenzing's word, as always.

Sizes are S, M and L relative to each other. They are not hours and must not
be read as hours.

## 1. Recommendations

Three kinds of thing came out of the audit, and they want three different
treatments.

**Do, no decision needed.** Defects and untrue copy. The product already says
what it should be; the code disagrees. Commits 1, 2, 3, 4, 7, 8, 9, 10, 11
below.

**Decide first, then do.** Four places where the audit's fix is one of two
reasonable designs and the choice changes what a person meets:

| Question | Recommendation | Why |
|---|---|---|
| Should the skip default on? (M1) | **On after the first completed sitting**, for guests and members alike. Off before. The switch stays as the way off. | The second visit should be one press. A first-timer has not yet got a "usual" to skip to. |
| Gate the origin push on *share*, or rewrite the sentence? (H3) | **Rewrite the sentence.** | Gating changes what syncs between devices for a signed-in person; the sentence is the only thing that is wrong. |
| Keep asking name and origin first? (H4) | **Defer them**: drop both from the first-time branch and ask once, on the rail, on the visit after a first with-others sitting. | By default nobody sees either answer. Jonny's own direction (13 September, `PRODUCT.md` §5) is name and location *if the person chooses*, which is an offer, not an entrance fee. |
| `/world`: link it or delete it? (M14) | **Delete it**: `app/world/page.tsx` and `components/World.tsx`. `useWorld` stays; Home, Journey and Entry use it. | The earth is Home's background and the sitting's view. A third copy is a surface to maintain. `CLAUDE.md` names `/world` as an audio-teardown target; change that line to `/terms` in the same commit. |

These are Tenzing's calls. The plan below assumes the recommendations; if a
call goes the other way, only that commit changes.

**Not in this plan.** M9 (candles merging on phones) is *partly* confirmed and
was inferred, not seen. It goes on the real-phone QA list in
`launch-readiness.md`, and gets built only if a phone shows it. Nothing here
is new scope Jonny has not been told about: the wake lock is the only new
capability, and it exists to keep a promise the product already makes.

**What this supersedes.** `plans/audit-2026-09-13.md` Part A rows 11, 12, 13,
15 and 17 and Part B rows 4 and 5 refer to `Room.tsx`, `Settings.tsx` and
`SoundMixer.tsx`, deleted on 14 September with the photographic room. Those
rows are closed by the rebuild, not by this plan. Its rows 1–10, 14, 16 and 18
(the account panel, safe-area corners, OG alt, skip link, Plex weights) still
stand and are folded into commit 11 here.

## 2. The order, and why

1. The phone heading (H1). Visible to every phone user today; one class.
2. Words that are untrue (H3, M3, M12, M13). Cheap, and a copy lie is worse
   than a layout bug on a site about trust.
3. The wake lock (H2). The biggest functional gap.
4. The ending (H6 + M5). Hold the earth, drop the scoreboard.
5. The skip and the doors (M1 + M2 + M18). One design decision, one commit.
6. Name and origin later (H4). A rail change with a journey test.
7. Errors in the house voice (H5).
8. The sitting's quiet (M4, M6, M7, M8, L7).
9. System hygiene (H7, M10, M16, M19, L13, L14). DESIGN.md corrected in the
   same commit.
10. The dial (M15).
11. The rest of the Lows, plus what survives of the 13 September list.

Commits 1–4 are the ones worth releasing on their own. 5–11 can go in one
release after them.

## 3. The commits

Each commit: what changes, where, how it is verified, and which document it
must keep true. "Docs" means the same commit, per `CLAUDE.md`.

### Commit 1 — The heading clear of the bar on phones (H1, L14) — S

- `components/Screen.tsx:140-144`: the `middle` branch becomes
  `pt-[clamp(3rem,9vh,5rem)] md:pt-0 md:justify-center`. Nothing else.
- Verify: browser, guest origin, 375×812, Time, Bell, Sound. The `h2`'s top
  edge below `RailBar`'s bottom edge; `scrollHeight === innerHeight` still
  true on all six questions. This is the one thing in the plan that only
  rendering can prove.
- Docs: `DESIGN.md` near line 366 says "one baseline for every question"; it
  is true only below `md`. Say so.

### Commit 2 — Words that are untrue (H3, M3, M12, M13) — S

- `components/OriginScreen.tsx:237`: "Nothing is kept on our side until you
  say yes" → "Saved on this device, and to your account if you're signed in.
  Shown to others only while this is on."
- `components/ModeScreen.tsx:132-135`, `components/TimeScreen.tsx:180-181`:
  "N others are sitting right now" → "N others are here right now". The
  count is anyone with the page open (`usePresence.ts:117-124`).
- `app/layout.tsx:35-40`: one description sentence, the same one the OG image
  and the terms use: the earth, everyone who is sitting, the bell at :55.
  `themeColor` (`:57`) → dusk, since Home is full-bleed dusk.
- `app/opengraph-image.tsx:101,113-114`: same sentence; "Meditate With Me" in
  title case to match `layout.tsx:40`.
- `app/terms/page.tsx:94-95`: "*Your account*, at the foot of your home page"
  → "*Account*, in the menu", as `privacy/page.tsx:150` already has it.
- `app/privacy/page.tsx:43-44`: there is no cookie. The session lives in
  localStorage (`lib/supabase.ts:47`). Say that.
- Verify: typecheck, tests, build. Not visually checked; they are label
  changes.
- Docs: `PRODUCT.md` wherever it quotes the origin sentence or the
  description; `plans/privacy-data-inventory.md` if the cookie line came
  from there.

### Commit 3 — The wake lock (H2) — M

- New `components/useWakeLock.ts`: `request()` and `release()` around
  `navigator.wakeLock` (guarded; unsupported is a no-op). Re-requests on
  `visibilitychange` → visible while held, because the browser drops it when
  the tab hides. Hook in `components/`, never `lib/`, per the portability
  rule; `tests/portability.test.ts` is the guard.
- `components/Journey.tsx:284-291`: request inside `begin()`, next to
  `fullscreen.enter()`, so it is inside the click. Release in `endEarly`, in
  the `hasEnded` effect (`:349-370`), and in the unmount cleanup that already
  stops the bell.
- `components/usePresence.ts:164-172`: take a `sitting: boolean`. While
  sitting, a hidden tab keeps beating (the fetch has `keepalive`); the
  existing stop-on-hidden stays for the landing. Reading the doors while the
  tab is hidden should not count; sitting should.
- Verify: typecheck, tests, build. The lock itself cannot be proved in the
  preview pane; add "phone locks during a sitting: bell on time, still in the
  count" to the real-phone QA item in `launch-readiness.md`.
- Docs: `ARCHITECTURE.md` §5 (presence: hidden-tab rule) and the note at
  §7 line 318 (iOS suspends audio on lock, "not solvable"): the lock now
  exists to stop the screen locking; a lock that happens anyway still
  suspends audio. Both statements true, side by side.

### Commit 4 — The ending (H6, M5) — M

- Keep the earth through the held beat. `Journey.tsx:431` renders `Sitting`
  while `stage.kind === 'finished'` and `mono - endedAt < COOLDOWN_MS`, with a
  new `ended` prop: no clock, controls rested and non-pressable, the
  company line held. Then the crossfade `Afterwards` already does.
- `components/Afterwards.tsx`: drop the countdown number (`:69-71`); keep
  "Come back." over the earth. Drop "Days in a row" and "Altogether"
  (`:54-60`); keep the minutes and "With you this hour". *Done* / *Finish*
  becomes `PRIMARY_ROOM`; *Sit again* becomes `QUIET_ROOM` (`:91-96`). Remove
  the pinned guest `offer` (`Journey.tsx:454-463`).
- The guest sign-in offer moves to the landing foot beside the skip
  (`Journey.tsx:553-557`), where a guest is between visits rather than
  between breaths.
- `currentStreak` and `summarise` stay in `lib/practice.ts`; Practice on Home
  still uses them. Only the ending stops.
- Verify: `/?demo=finished` needs to show the held earth, so
  `components/Demo.tsx` gets the `ended` state too. Browser at both
  viewports: a new screen seen for the first time. Tests and build.
- Docs: `PRODUCT.md` (the ending as described), `ARCHITECTURE.md` §16,
  `DESIGN.md` if it describes the ending's rows.

### Commit 5 — The skip and the doors (M1, M2, M18) — M

Assumes the recommendation: skip on after the first completed sitting.

- `components/useUsual.ts`: when a sitting completes and no `mwm.usual` key
  exists, write `{ enabled: true, fingerprint: usualFingerprint(prefs) }`.
  One-time; the switch is the way off, and off is remembered.
- `components/Journey.tsx:547` with `components/ModeScreen.tsx:29-32`: when a
  door patches prefs and `usual` is on, re-fingerprint with the patched prefs
  (`setUsual(true, patched)`), the way the drawer already does. The skip no
  longer turns itself off unannounced.
- `components/SettingsDrawer.tsx:257-261`: *How long* always offers the bell
  stop; choosing it sets `showCount` too. Drop the drawer's "Go straight to
  the bowl" row (`:197-205`); the Home bar owns it (`Home.tsx:175`).
- `components/ModeScreen.tsx:180-181`: the door's second line is conditional.
  Together with `untilBell` → "Everyone finishes together at 12:55". Together
  with your own length → "Your own length, with everyone". Extract the choice
  into `lib/journey.ts` as a pure function so it can be tested.
- Verify: `tests/journey.test.ts` gains cases for the door line and for the
  fingerprint surviving a door. Typecheck, build. Not visually checked.
- Docs: `PRODUCT.md` (what the skip does and when it is on),
  `ARCHITECTURE.md` §16.

### Commit 6 — Name and origin later (H4) — M

Assumes the recommendation: defer.

- `lib/journey.ts:43-50`: `JourneyFacts` gains `hasSat: boolean` (a completed
  sitting on this device or account). First-time guests are no longer pushed
  `name`, `origin`. Anyone, guest or member, with `hasSat && !originAsked` is
  asked once: `name` then `origin` for a guest, `origin` for a member (the
  name came with the account).
- `components/Journey.tsx`: feed `hasSat` from the practice log
  (`entries.length > 0`).
- `components/NameScreen.tsx:56`: while the screen exists at all, it stops
  being `bare`. The prompt carries the reason: "Your first name, if you'd like
  to be seen."
- Verify: `tests/journey.test.ts` for every branch of `screensFor`. Typecheck,
  build. Browser once at 375 for the un-bared name screen, since a heading
  appears where none was.
- Docs: `lib/journey.ts`'s own comment, `PRODUCT.md` §1 (the walk),
  `ARCHITECTURE.md` §16, `context/PRODUCT.md` §4 (what Jonny has been told:
  nothing changes there, but the description of the first visit does).

### Commit 7 — Errors in the house voice (H5) — S

- New `lib/authErrors.ts`, pure: `authErrorMessage(code, message)` → one of
  three sentences: rate-limited ("Give it a minute, then ask again"), wrong or
  expired code, unreachable. Map on Supabase's `error.code`
  (`over_email_send_rate_limit`, `otp_expired`, `otp_disabled`, …) with the
  message as fallback. Mirror `readLinkError`'s approach.
- `components/useAuth.ts:248,282`: return the mapped sentence, never
  `error.message`.
- Verify: `tests/authErrors.test.ts`. Not visual.
- Docs: none; `ARCHITECTURE.md` §17 if it lists the error strings.

### Commit 8 — The sitting's quiet (M4, M6, M7, M8, L7) — M

- `components/Sitting.tsx:171-172,190-199`: the Sound sheet overlays the
  earth (`absolute bottom-0 bg-room/90`), so `--earth-foot` no longer moves.
  Escape and a tap outside close it; focus moves to the first tile on open
  and returns to *Sound* on close.
- `Sitting.tsx:148-154`: the clock takes `${controls}` and rests with them.
  A tap shows it, like everything else.
- `Sitting.tsx:180`: remove `aria-live="polite"` from the company line.
- `components/WorldMap.tsx:857-861`: cap the loop at 30 fps; honour `paused`
  (`:610`) and have `Sitting.tsx:174` pass it while the sheet is open; under
  reduced motion redraw on the minute.
- `components/Sounds.tsx:117,140`: lift `remembered` into a ref in `Sitting`
  so Silence → close → reopen does not bring Rain back at 0.55.
- Verify: browser, `/?demo=sitting`, both viewports: the earth does not move
  when the sheet opens (measure its box before and after). Escape closes.
  Tests, build.
- Docs: `ARCHITECTURE.md` §16 (the sheet), `DESIGN.md` (the sheet's surface
  and the resting rule now covering the clock).

### Commit 9 — System hygiene (H7, M10, M16, M19, L13) — L

One commit, because DESIGN.md is rewritten from the result and must describe
one state.

- Type: nine `--text-*` tokens in `@theme` for the nine declared roles.
  Replace every `text-[…]` in `components/` with a token. Casualties:
  `ModeScreen.tsx:179,195`, `TimerDial.tsx:294`, `SettingsDrawer.tsx:300,310,
  330,357`, `BellScreen.tsx:146`, and the rest of the 33.
- Fonts: `app/layout.tsx:12` loads Comfortaa 400/700; the tiles use it at
  `font-semibold`. Tile names become Nunito 600 at the control size, since
  DESIGN.md's own rule makes them controls (`BellScreen.tsx:140`,
  `Sounds.tsx:166,194`, `SettingsDrawer.tsx:221,227,327`). No new weight
  loaded.
- Floor: 12 px, enforced by `tests/type.test.ts` modelled on
  `tests/caps.test.ts`: `text-[` in `components/` has a budget of zero once
  the tokens exist, and the token file itself is asserted to hold nothing
  under 0.75 rem.
- Controls: `components/Account.tsx:72-93` loses its local field, primary,
  menu item and word in favour of `FIELD`/`PRIMARY`/`WORD` from
  `controls.ts`. Then one decision, code or doc, for the button
  (`controls.ts:44` vs DESIGN.md's 2.75 rem) and the switch (`Switch.tsx:40,
  46,61-63` vs DESIGN.md's 44×24). Recommendation: the code is what has been
  looked at; correct the doc.
- Reduced motion: the ten `@media` blocks in `app/globals.css` collapse to
  one at the end; `WorldMap.tsx:850` takes `reduced` as a prop from
  `useReducedMotion` instead of reading `matchMedia`.
- Tokens (L13): flame as a token in `Candle.tsx:208,216`; `#fbead2` at
  `globals.css:412` named; `FlameMark.tsx:21-23` constants renamed to what
  they are; one shadow (`globals.css:165-206`, `SettingsDrawer.tsx:139`);
  scrim as a token (`:130`); the `rounded-[1.25rem]` and `border-[1.5px]`
  one-offs (`ModeScreen.tsx:144,189`); the dial's bell-stop dot off
  `text-glow` (`TimerDial.tsx:283`); one easing (`globals.css:249,265`).
- M16: `Journey.tsx:386-389,493-497` pins `roomToggle` only when `inRoom`.
- Verify: the contrast gate in the build, `tests/type.test.ts`, the caps
  test, typecheck. Browser once, guest origin, for the bell and sound tiles
  at both viewports, because the tile face changes.
- Docs: `DESIGN.md` rewritten where it is wrong: the type roles and their
  tokens, the button, the switch, the shadow rule, the easing rule, the
  reduced-motion location. `ARCHITECTURE.md` wherever it claims reduced
  motion lives in one place.

### Commit 10 — The dial (M15) — S

- `components/TimeScreen.tsx`: the candle's one-line hint pattern, shown until
  the dial is first touched. The value inside the sentence (`:162-168`) in
  plain ink, not ember, since it is not pressable.
- `components/TimerDial.tsx:294`: "bell" leaves the SVG and becomes HTML text
  at the caption token, ≥ 12 px at every viewport.
- Verify: browser, 375×812, the dial variant of Time. The audit never saw it;
  this commit is the first look. Tests (`tests/dial.test.ts`), build.
- Docs: `DESIGN.md` if it describes the dial's labels.

### Commit 11 — The rest — M, in two or three commits

Copy and ARIA, not visual:

- L1 "Any sound while you sit?"; cut the bar clause (`SoundScreen.tsx:43-44`).
- L2 delete "Strike the bowl to begin." (`BowlScreen.tsx:48,61,66,73-80`).
- L4 bell chips as `radiogroup`/`radio`; plainer words than "minor edge"
  (`BellScreen.tsx:33,116`).
- L5 one word for skipping, `LineActions.tsx:40` and `OriginScreen.tsx:226`;
  Skip not focusable while invisible (`LineActions.tsx:55`); Next does not
  remount on `typed` (`:68-72`).
- L6 the bowl is not "Question 6 of 6" (`Steps.tsx:29-30`).
- L11 drop "Longest" (`Practice.tsx:50-78`); show all or drop "and N more"
  (`Home.tsx:484-488`); the delete copy counts server entries or drops the
  number (`Home.tsx:199,395`).
- L12 remove `focusSlug` from `lib/preferences.ts:39,71-74` and its test, or
  keep it and say in `PRODUCT.md` §5 that it is held for the loops. It is
  already mentioned there; recommendation: keep, and add nothing.
- L16 `text-wrap: balance` on `h2` and the company line; less bottom padding
  under `lg` on Home.
- 13 September rows 1–7, 9, 10, 16: the account panel's input size, `name`
  attributes, busy states, error focus, overscroll, the two overflow bugs,
  OG `alt`, skip link, autocomplete hints. Row 8 (safe-area corners) and 18
  (Plex weights) need re-checking against the rebuilt screens first; both
  may be moot.

Behaviour:

- M11 share becomes a draft committed by *Save* (`Home.tsx:317-325,359`), as
  `OriginScreen.tsx:73` already does.
- M17 sign out takes a second press inline (`SettingsDrawer.tsx:212-214`),
  the delete confirm's pattern.
- L3 "Looking up places…" row while the index loads
  (`OriginScreen.tsx:83`, `usePlaces.ts:23-27`).
- L8 a stale count fades after two missed polls (`usePresence.ts:143-145`,
  `useWorld.ts:88-91`); the company line says nothing rather than something
  forty minutes old.
- L10 the "you" ring readable, and a line when `you` is null
  (`WorldMap.tsx:953-961`).
- M14 + L9: delete `app/world/page.tsx` and `components/World.tsx`
  (`useWorld` stays; Home and the sitting use it); the `/world` line in
  `CLAUDE.md` becomes `/terms`.

Verify: tests and build; browser only for L16 and L10, at both viewports.
Docs: `PRODUCT.md` for anything a visitor sees; `ARCHITECTURE.md` §5 for the
stale rule.

## 4. Verification, overall

- Every commit: `npm run typecheck`, `npm test`, `npm run build` (the
  contrast gate runs inside it).
- The browser opens for commits 1, 4, 6, 8, 9, 10 and the two visual Lows,
  and for nothing else. Guest origin `127.0.0.1:3000` for the rail; the
  `/?demo=` routes for the sitting and ending; never the bowl, never a chip,
  never the Sound switch; close the tab last.
- Before the first release (commits 1–4): the real-phone item in
  `launch-readiness.md`, now with the wake lock on it, is the thing the
  preview cannot do.
- `dev` → `main`: ask Tenzing, each time.

## 5. When this plan is finished

`git mv plans/ui-ux-fixes.md docs/` and `plans/audit-2026-09-21.md` with it,
in the commit that lands the last of it; fix the pointer in
`launch-readiness.md` and this file's own path in the audit.
