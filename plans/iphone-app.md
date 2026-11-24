# The iPhone app

Active plan, started 2 October 2026, when Tenzing said the app is being
made (`context/PRODUCT.md` §5). What the App Store asks of it is in
`plans/launch-readiness.md`, *The iPhone app*; this file is how it gets
built. **Jonny has not been told**, as far as the repo knows — it is new
work outside v1 and the 55 hours.

## 3 October 2026: the site first, wrapped, then native piece by piece

Tenzing's call, after seeing the first build: the app shows the real
Meditate With Me *now*, by opening `www.meditatewithme.online` full screen
in a web view (`mobile/App.tsx`), and its parts are replaced with native
ones one at a time — the sitting and the bell first — **before** anything
goes to App Store review. A site in a wrapper alone is refused (4.2), and it
keeps the site's limits: Web Audio stops when the phone locks, so the
locked-phone bell is still unsolved until the sitting is native.

Known in the wrapper today:
- **Google sign-in will be refused inside it.** Google blocks its sign-in
  page in embedded web views (`disallowed_useragent`). Email codes and
  Apple work. Fixed when sign-in goes native (step 2 below), not before.
- Links off the site (mail, credits, other sites) open in the phone's own
  apps, not in the frame.
- The user agent ends in `MeditateWithMeApp`, so the site can tell it is
  inside the app when a page needs to behave differently.
- The bell test is still there: `EXPO_PUBLIC_BELL_TEST=1 npx expo start`.

## 4 October 2026: the first launch is native

Tenzing chose the *Three breaths* flow and the full-screen sign-in from
the canvas page *Onboarding · the app*, and said to start replacing
screens in the app rather than on the site — the site stays the quick way
for other people to try it and make accounts. So the first native screens
are the first launch (`mobile/Onboarding.tsx`, `mobile/auth.ts`,
`mobile/supabase.ts`), in front of the web view:

- **Three breaths**: who is here, the bell at :55, nobody sees you. *Skip*
  on the first two, *Just sit* on the third goes to the site as a guest.
- **Sign in / Create account / Check your email**: Continue with Apple,
  Continue with Google, or a six-digit code — the site's rules in the
  site's words (`lib/authErrors.ts`, `lib/emailCode.ts`, read through
  Metro as always): Gmail goes through Google, a connected address is
  asked of the site's `/api/signin` first, a name only takes on the
  request that creates the account.
- **The site's own questions after a first sign-in** (Tenzing, the same
  evening, after walking the v1: "a good v1, but use the whole name, place
  flow"). *What should we call you?*, only when the account has no name
  yet (Apple, Google and *Sign in* by code arrive without one), Skip under
  the line and Next once something is typed, saved to `user_metadata.name`.
  *Where are you sitting?* as `OriginScreen` has it: typed, then chosen —
  the connection's guess as *near you* when the line is empty
  (`/api/origin` on the site), the matches from the site's own
  `places.txt` searched on the phone through `lib/places.ts`, *Looking up
  places…* while the list is on its way, *Keep "…" as you typed it* last;
  the share switch appears under the line once something is typed, off,
  with the site's words; written to `profiles` (origin, share_label).
  **Shall we tell you before the bell**: our own ask, then the phone's
  permission dialog only on *Remind me*; the answer is kept under
  `mwm.app.remind`. **Nothing is scheduled yet** — the reminder itself is
  the next native piece.
- **The handoff.** The session is handed to the site once, in the
  fragment of the address the web view loads (`handoff`), which the
  site's client reads as it reads a magic link. From then on the site
  owns the session: the app's client never refreshes (two clients
  rotating one refresh token knock each other out), and the app does not
  look at it again. When the sitting goes native this becomes a real
  bridge, in the other direction.
- Once through, by signing in or by *Just sit*, the app opens straight on
  the site (`mwm.app.onboarded`). `EXPO_PUBLIC_ONBOARDING=1 npx expo
  start` replays the first launch every start.

**To run it:** `mobile/.env.local` holds `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` (the site's pair; `mobile/.env.example`),
then `cd mobile && npx expo start` and Expo Go, as for the bell test.

**Two dashboard settings it needs, both Tenzing's** (Supabase →
Authentication → URL Configuration, and → Providers → Apple):

1. **Redirect URLs** must allow the deep link Google and Apple come back
   on: `meditatewithme://**` (the app's scheme, `app.json`) and, while
   testing in Expo Go, `exp://**`. Without it Supabase answers the sign-in
   with *redirect_to is not allowed* and the sheet comes back empty.
2. **Apple → Client IDs** must include the bundle ID
   `online.meditatewithme.app` beside the web Services ID, so Apple's own
   sheet (`signInWithIdToken`) is accepted in a build. Until then, and in
   Expo Go (whose bundle ID is Expo's), the Apple button falls back to the
   browser round trip through the Services ID, which works but is not the
   native sheet.

**Rebuilt the same evening to look and move like the site.** Tenzing,
after the keyboard pass: "the onboarding is fucked — you put in your
simple wireframes and did not update it to match the app, it's just a
bunch of still pictures". He was right: the v1 drew the wireframe's marks
(grey dashes for fish, static circles for rings), cut hard between
screens, used plain placeholders, Newsreader 400 and generic iOS blocks.
Now:

- **The pond is real** (`mobile/Pond.tsx`): the site's `Pond` on Skia
  (`@shopify/react-native-skia`, in Expo Go), the same fish, swimming and
  ring maths from `lib/fish.ts` and `lib/pond.ts`, the same photographed
  stone (`mobile/assets/skipping-stone.webp`). Everyone sitting this hour
  comes from the site's `/api/world` every fifteen seconds
  (`mobile/world.ts`, the mapping `Journey` uses). It is drawn under every
  screen, as on the site; your stone sits on it, breathing, on the third
  breath and the reminder ask. One picture a frame from the JS thread into
  a shared value, so React never renders for a frame. Its clock starts at
  zero: counting breaths from the epoch hung the JS thread.
- **The site's pieces** (`mobile/ui.tsx`): its tokens and type (Newsreader
  700 at the question and sentence sizes, 15px semibold controls), the
  ember pill / rule-outlined pill / Apple's black pill, the underlined
  word, the 44px chevron disc, the mark and wordmark, the step marks; the
  rail's switch (`Rail`: the leaving screen lifts and fades in 150ms, the
  next rises 1.5rem into place over 300ms from 120ms in, the one curve);
  the line a typed answer goes on (`LineField`: the 2px rule draws out
  from the left while the prompt types itself at 55ms a letter with an
  ember caret at the front, the real caret hidden until the first key,
  ember when focused); Skip settling in after the typing and Next rising
  once something is typed (`LineActions`). *Where are you sitting?* is
  bare, as the site has it: the line is all there is.
- **Running it** now needs Reanimated's Babel plugin, which
  `babel-preset-expo` adds by itself once `react-native-worklets` is
  installed (it is a devDependency now so the preset resolves from the
  project), and a Metro started fresh (`npx expo start -c`): two Metros on
  one project share a transform cache, and one started before the install
  poisoned the other's with untransformed worklets.

Checked: typecheck, and `expo export --platform ios` bundles; the v1 was
walked on Tenzing's iPhone in Expo Go on 4 October 2026 (email codes;
Google and Apple wait on the two settings above). Walked again the same
day in the iPhone 17 Pro simulator with the keyboard up on every screen
with a field: *Create account* had its email line under the keyboard and
the footer link drawn over it, so every screen past the breaths is now a
scroll view that insets itself for the keyboard
(`automaticallyAdjustKeyboardInsets`), with the footer the last thing in
the content and a focused line scrolled clear of the keyboard with room
for the link under it; the place list likewise. Two things the simulator
showed that the phone would too: Hermes has no `Intl.DisplayNames`, so
every country read as its code (*Lisbon PT*) — `mobile/countries.ts` is
the English names, generated from Node's ICU; and the back chevron was
fixed while the page scrolled under it, so it scrolls with the page now. Not built: Expo Router (`mobile/AGENTS.md` asks for it; one
`step` state was enough for nine screens and nothing else navigates yet).

## 6 October 2026: the first launch is the site's arrival, native

Tenzing, on the three breaths: "atrocious, has nothing to do with what we
have built — and even the transitions between pages is awful". He chose
(i) the app opens on **the site's own arrival, drawn natively**, with no
slides, and (ii) **Begin hands off to the site's sitting**. So:

- **The arrival** (`mobile/Arrive.tsx`): the mark and the wordmark, the
  clock and *Sign in* (or your name), the pond with everyone sitting this
  hour, *Each fish is someone sitting this hour.*, the sentence — *Sit [by
  yourself] for [10 minutes], end with [a singing bowl], in [silence].* —
  and Begin with the stone. Newsreader **regular** for the wordmark,
  sentence, clock and wheels, as the site sets them (the v2's 700 was
  wrong there; questions stay bold). Each phrase opens its wheel
  (`mobile/Picker.tsx`, the site's `Picker`: snap rows, hairlines, faint
  neighbours, play on the bell and the beds, Done, tap outside to cancel).
  A tap on bare water flicks a pale pebble to it.
- **Begin** sinks the sentence a word at a time (the site's `.sink`),
  fades the rest, and throws the stone: the site's skim from `lib/pond.ts`
  (`skimConfig`/`skimAt`, the touches, the landing train, the breaths) on
  the Skia pond. At the same moment the app asks the site to begin.
- **The site stays loaded behind it**, the whole time, and the two talk
  (`components/useAppBridge.ts`, only ever when the user agent says
  `MeditateWithMeApp`). The site posts `arrive` while its journey is at the
  arrival — preferences, the guide's line, the signed-in name — and
  `sitting` once a sitting has begun. The app calls `window.mwmApp`:
  `update` for every choice on a wheel, `bell`/`taste` for the play buttons
  (so the previews are the site's own sounds, synthesised bowl and all),
  and `begin(guided, prefs)`. Once the stone has gone in (5.6 s) and the
  site says it has begun, the native water fades over a second and the
  site's sitting is what is left. When that sitting is over and the site is
  back at its arrival (Finish, or End early), the native arrival comes back.
- **Sign in** in the corner opens the native sign-in (`mobile/SignIn.tsx`,
  the old `Onboarding.tsx` without the breaths; Back or *Not now* returns to
  the arrival). A sign-in remounts the web view on the handoff fragment, and
  the site's next `arrive` brings the name for the corner. **Signed in**,
  the name opens the site's own account corner over its arrival, with a
  native Back — the one part that leans on the site's markup
  (`main header [aria-expanded]`), and not yet walked.
- `EXPO_PUBLIC_SITE=http://localhost:3000/` points the app at a local `next
  dev`; the live site has no bridge until the change reaches `main`.
  `mwm.app.onboarded` and `EXPO_PUBLIC_ONBOARDING` are gone.

**Not yet known:** whether WKWebView lets the site's audio context start
with no gesture inside the page (the app's web view has
`mediaPlaybackRequiresUserAction` off, which should be what allows it).
Begin was not pressed in the simulator, so the handoff into the sitting —
the opening bell, the reveal, and the way home — is still to be walked.

## 6 October 2026 (evening): the sitting is native

Tenzing: "turning the rest of our app native now", keeping it in this
repo, in `mobile/`, with the sitting first, and **the site's own audio
engine on the phone** rather than Expo's player — so the bell is scheduled
on the audio clock as the site does it, and rings on time with the phone
locked, in silence too. Asked for verification agents to compare each piece
of the port against the site as it went.

- **The sound** (`mobile/audio.ts`): the site's `audio.ts`, `mix.ts` and
  `useMix.ts` on **react-native-audio-api** (Software Mansion's Web Audio
  for React Native). Same graph, same synthesised bowl and struck bell,
  same loop points inside the beds' padding, same ramps; the opening bell
  at Begin and the closing bell scheduled for the whole sitting at once.
  The bell tables moved to `lib/bells.ts` so both ring one table. The beds
  and the drum are the site's own `public/sounds/` files, bundled through
  Metro (`metro.config.js` watches the folder), about 16 MB. The audio
  session is `playback` (rings on silent, plays in the background); the
  context is suspended when the app goes to the background outside a
  sitting, and held through a sitting and its tail. The wheels' play
  buttons are native now too.
- **The sitting** (`mobile/Sitting.tsx`, `mobile/Afterwards.tsx`): the
  site's `Sitting`, `SoundLine` and `Afterwards` over the Skia pond — the
  controls resting after four seconds, End asking first, Back ending at
  once, the line of sounds, the company line from `lib/company.ts`, the
  time left from `lib/timer.ts`, *Come back.* through the bell's tail, then
  the minutes. The pond gained the site's bell ring and the scatter under a
  tap. *Again* asks the site's *Same setup?* with the setup in one line
  (the site's `settingsLine`): *Yes* sits again from the pebble, *No* goes
  to the arrival, whose sentence stands in for the site's five steps.
  Begin waits for the first clock sync, as on the site.
- **The clock and presence** (`mobile/clock.ts`, `mobile/presence.ts`):
  `lib/clock.ts` synced against the site's `/api/time` through its
  `fetchImpl`, again on every return to the front; heartbeats and the count
  as the site's `usePresence`, beating through a locked sitting. The site
  inside the app no longer beats at all (`usePresence`, `inAppUserAgent`),
  so a person is one fish, not two.
- **The account stays the site's** until it is native: a sitting sat here
  is handed to the site's practice log through the bridge (`record`), which
  keeps it and syncs it as its own. The app keeps each in a queue
  (`mwm.app.unsent`) until the site answers `recorded` with its id, and
  offers the queue again at every arrival and every return to the front.
  The site's `arrive` now also says the label the person is seen by, for
  the fish and the company line.
- **A guided sitting is still the site's**, for its live video: the old
  path, Begin asking the site to begin and the native water fading to it.
  The site now says when it is over (`sitting`, `on: false`), which takes
  the name off the water, and hushes its own beds whenever it is back at
  its arrival inside the app, so the phone's sound is the only sound.
- Not ported: the guest's account offer after a sitting (`Remember`), the
  wake lock (not wanted: the phone may lock now), reduced motion, the blur
  on *Come back.*, the edge fade on the line of sounds.

**Running it needs a development build now.** Expo Go cannot load
react-native-audio-api, and `expo-dev-client` is installed, so `npm start`
serves a development build, not Expo Go.

- On this Mac: Xcode 26.6 with the iOS 26.5 platform (installed by 26
  October 2026). `LANG=en_US.UTF-8 EXPO_PUBLIC_MUTE=1 npx expo run:ios`
  (CocoaPods needs the UTF-8 locale; the mute keeps the simulator off the
  Mac's speakers). **It needs disk**: on 24 November the pods and a first
  build took the Mac from 5.4 GB free to under 400 MB and were stopped, and
  a full disk is what had been quietly deleting files out of both
  `node_modules` folders. Free ten GB or so before trying again.
- On the iPhone: `npx eas-cli build --profile development --platform ios`
  (the new `development` profile in `eas.json`, internal distribution; the
  phone registered once with `npx eas-cli device:create`), then `npx expo
  start` and open it from the build.

**The site has to ship first.** The live site has none of this bridge:
against it, this build's arrival has no name or label, its sittings are
never logged (they wait in the queue, which is safe), and the page behind
it still beats for itself, so every app user counts twice. Test against a
local `next dev` (`EXPO_PUBLIC_SITE`) or the `dev` preview until the site's
side reaches `main`.

**Checked by verification agents, in rounds,** each comparing a piece with
the site and reporting what a person would hear or see differently, then
re-checking the fixes. What they found and what changed: ramps anchored
where a level really is (the library reads a just-set level back late, and
its own hold cannot anchor a settled one); a bed at nothing stopped and its
samples let go (the library copies each buffer into its source); the
session let go after the engine stops, so an interrupted podcast resumes;
nothing frozen mid-fade by a lock; the name off the water after a guided
sitting; sittings dropped only once the site has them.

**Not yet run anywhere.** Typecheck passes, `expo export --platform ios`
bundles with every sound, and the CI job that now typechecks the app
passes from a clean install. Nothing has been heard: the first real test is
the one Step 1 below asks for, now on the real sitting — 45 minutes, phone
locked, in a pocket, and once in silence.

## 7 October 2026: the app against the site — review and fixes

Tenzing asked for a review of the app against the site as it was before it
went native. Four agents compared the code on both sides (arrival; sitting
and after; sign-in, account and the bridge; sound, time and presence). Most
of it matched to the value. What did not is below.

**Goal:** a person moving between the site and the app sees the same words,
the same type and the same choices, and nothing in the app can sign them out
of the site, erase what they told the site, or leave them stuck. Done when
every box below is ticked in the code, typecheck and the site's tests pass,
and a verification agent re-reading both sides agrees.

The bugs:
- [x] **The app's own copy of a session is gone once handed over.** It was
  saved to disk and reused on the next *Sign in*, and once stale, refreshed
  with a token the site had already rotated — which can revoke the site's.
  Now the app keeps it in memory only, forgets it at the handoff, and
  deletes the copy older builds left on disk.
- [x] **No tokens in the web view's address or history.** The handoff is
  written into the site's own session storage before the page loads (once
  per handoff, on the site's origin only), not in the fragment, so a swipe
  back or *Try again* cannot replay a spent refresh token.
- [x] **Signed in with no name is still signed in.** The site says what its
  own corner would show (first name, else the email's first part, else
  *Account*); the app shows that, one line, and opens the account with it.
- [x] **A guided Begin cannot strand you on the water.** If the site has not
  begun a while after the stone is in, the arrival comes back; a sitting
  that begins late is shown when it does.
- [x] **Skip on *Where are you sitting?* no longer erases a saved place**:
  the place is asked only if the account was never asked, as on the site,
  and the reminder ask only once.
- [x] **Taps during a guided throw stay in the app**, and Begin cannot start
  two sittings.

The differences:
- [x] Sign-in leads with *Continue with Google* filled, Apple black under
  it, *Send me a code* outlined (one fill a screen); the site's words
  (*Your sittings and sounds, on any device.*, *logged on this device*,
  *The code*, *Confirm and enter…*, *Sent again.*); provider errors in the
  site's sentence, not Supabase's; errors in ember, not red.
- [x] *Come back.*, the minutes and *Same setup?* in Newsreader regular, as
  the site sets them; *No* as the site's pond choice (serif, ink-2,
  underlined), *Back* as its quiet sans word; no stone under *Same setup?*.
- [x] A guest who has sat once is asked their name and place after Begin,
  as the site asks (`screensFor`), and the answers go to the site's profile.
- [x] Details: the mark faint during the sitting; the words for the sitting
  at 6.4 s as on the site; the tapped pebble at full strength; the leaving
  fades on the site's curve; *Yes, end* / *Keep sitting* 16px apart; the
  corner's word one line, at most 10rem; the fish band in landscape;
  signing out in the site's corner brings the native arrival back.

Left as they are, on purpose or for later: the serif's optical size (the
site's variable Newsreader picks a display cut at 28px; the app bundles the
16pt static cut — a variable font in the app is its own piece of work); the
blur as words sink (no cheap text blur in React Native); a bed decoded again
each time it is raised (the memory trade made on 6 October); a bell late
after a phone call with the phone kept locked (the audio engine's restart
after an interruption — the locked-phone test in Step 1 will say how much it
matters); Begin greyed until the first clock answer on a bad connection;
the guide's line before the site has said it (the site always has a line,
but the app cannot know whether anyone is live until the page says, and a
wrong *Nobody is guiding right now* is worse than none).

How it was done, for the next person: the app's Supabase client keeps its
session in a `Map` (`forgetSession` in `mobile/supabase.ts`); the handoff is
`handoffScript` in `mobile/auth.ts`, run by the web view as
`injectedJavaScriptBeforeContentLoaded` on a fresh mount; the site's
`arrive` carries `corner` and `ask`, and `window.mwmApp.profile` writes the
answers (`components/useAppBridge.ts`); the guest's questions are
`SignIn`'s own name and place screens with an `ask` prop.

## 24 November 2026: the note before the bell

Tenzing chose **once a day, at an hour the person picks**: the ask's *Remind
me* asks the phone, then opens a wheel, *Which bell?*, of the day's 24 bells
by their time (`mobile/remind.ts`, `HOURS`). The phone lays one daily note
at **:45** that hour — ten minutes before the bell at :55, not five, because
`nextSharedBellAt` sends anyone with under five minutes' lead to the bell
after. The answer is kept under `mwm.app.remind` (the hour, `no` or
`denied`); the schedule is laid again at every start. Changing the hour later is
in the account's *Settings*. Still to do: tapping the note opening the
arrival set to *until the bell*. Typechecked; not yet seen
in the simulator (disk).

## 24 November 2026: the account is the app's own

Tenzing chose native accounts, with **the app holding the session** and
the site in the web view kept a guest, and everything in the first pass:
the account basics, settings, the practice log and the guide's key.

- **The session** (`mobile/supabase.ts`) is kept in the app's own storage
  under `mwm.app.session` and refreshed while the app is in front. The
  handoff is gone; `GUEST_SCRIPT` (`auth.ts`) removes any session a web
  view was handed before, so there is one holder.
- **The sync** (`mobile/account.ts`, `useAccount`) is the site's, from the
  same `lib/` helpers: preferences pulled once per sign-in (the account
  wins; the phone's fills an empty one) and pushed 900 ms after a change;
  the profile the same; the practice log (`mwm.app.practice`) a union by
  id, the phone's missing rows upserted, again on every return to the
  front. The old queue for the site's log (`mwm.app.unsent`) is folded in
  once. A guest's sittings, name and place stay on the phone and go up at
  sign-in. The guest's questions after Begin come from `screensFor` on the
  app's own log and profile, no longer from the site.
- **The screens** (`mobile/AccountScreen.tsx`): *Account · Settings ·
  Layout* as on the site's corner, in its words. The stream key is
  selectable rather than copied (a clipboard is a native module, so a
  rebuild). Settings carries the reminder's hour: change it, or *No note*.
- **The site's side is unchanged**: `useAppBridge`'s `record` and
  `profile` are simply no longer called; the page still says its guide's
  line, takes the app's preferences on every arrive, and runs a guided
  sitting.

Not done: connecting a second email (the site's `Emails`); deletion does
not yet revoke a Sign in with Apple token, which Apple asks of an app that
offers Apple sign-in (`plans/launch-readiness.md`); a guided sitting is
logged by the site as a guest's, not into the app's log. **Nothing here has
been signed into**: it was written with the Supabase project paused, so
it is typechecked and the app runs, and that is all.

## The route

**Expo, in `mobile/`, beside the website, in the same repo.** Same
TypeScript; `lib/` is shared in place, not copied — Metro watches
`../lib` (`mobile/metro.config.js`), so the shared hour, the timer and the
session rules are one code for both, and `tests/portability.test.ts`
already keeps browser globals out of it. The screens and the audio are
written again natively; nothing in `components/` moves.

No workspaces, no shared package, no abstraction layer over storage or
audio. `mobile/` has its own `package.json` and `node_modules`; the web's
`tsconfig.json` excludes it, and Vercel never installs it.

## Step 1 — the bell on a locked phone (built, not yet run)

The first thing, before anything else is planned, because a bad answer
reshapes all of it: does a bell ring on time on a locked iPhone,
forty-five minutes later?

`mobile/App.tsx` is that test. Pick 1, 10 or 45 minutes, or *until the
bell* (the site's own :55, from `lib/timer.ts`); Begin plays the rain bed
on loop and strikes the drum; the bell rings at the end, from a timeout
with a once-a-second check behind it. iOS keeps an app running while it
plays sound (`expo-audio`, `shouldPlayInBackground`, the
`enableBackgroundPlayback` plugin), and the bed is what keeps it playing.
Each bell writes how late it was under *Bells so far*.

**To run it** (no Xcode needed): install *Expo Go* from the App Store on
the iPhone, then

```bash
cd mobile && npx expo start
```

and scan the QR code with the iPhone's camera. Same Wi-Fi as the Mac.

**The test:** Begin *45 minutes*, lock the phone, put it in a pocket, and
read the line when it rings. Then again with Low Power Mode on, and once
with the ring/silent switch on silent (`playsInSilentMode` should ring
anyway). Write the three results here.

- [ ] 45 min, locked: …
- [ ] 45 min, locked, Low Power Mode: …
- [ ] 45 min, locked, silent switch: …

If the bell is late or silent: the fallback is a local notification with
the bell as its sound (`expo-notifications`), which iOS rings itself —
but it obeys the silent switch and is capped at 30 seconds of sound.

Expo Go is enough for this. It is **not** enough to ship: background
audio, Sign in with Apple and the App Store need a development build —
Xcode on this Mac (not installed; only the command-line tools are), or
EAS in the cloud with the Apple Developer account.

## After the spike — in this order

1. **The sitting, natively:** the beds and mixer, the bell choice, the
   timer, the shared hour against the server clock (`lib/clock.ts` +
   `/api/time`), the practice log on the device. *Built 6 October 2026
   (above), except the guided sitting and the log, which are still the
   site's; not yet run.*
2. **Accounts:** Supabase in React Native (session in secure storage),
   Google, and **Sign in with Apple** (4.8) — the Apple setup is listed
   in `plans/launch-readiness.md`.
3. **The live video:** the system player (`expo-video`), with Picture in
   Picture and AirPlay, reading `/api/live` as the site does.
4. **The pond and the fish**, drawn natively — the most work, last.
5. Everything in *The iPhone app* checklist before submitting.
