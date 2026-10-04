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
   `/api/time`), the practice log on the device.
2. **Accounts:** Supabase in React Native (session in secure storage),
   Google, and **Sign in with Apple** (4.8) — the Apple setup is listed
   in `plans/launch-readiness.md`.
3. **The live video:** the system player (`expo-video`), with Picture in
   Picture and AirPlay, reading `/api/live` as the site does.
4. **The pond and the fish**, drawn natively — the most work, last.
5. Everything in *The iPhone app* checklist before submitting.
