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
