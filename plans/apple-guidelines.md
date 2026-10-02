# Apple's guidelines, read against what is built

Active plan, 2 October 2026. Tenzing asked for Apple's rules on video apps
to be researched, the site read against them, and the ones that apply to
us built. An iPhone app is still **not decided and not scoped**
(`context/PRODUCT.md` §5); this is not that app. It sorts Apple's rules
into what the website owes viewers today, and what only an App Store
submission would.

Sources, read 2 October 2026: the App Review Guidelines
(developer.apple.com/app-store/review/guidelines), App Privacy Details,
the age-rating reference, the HIG's *Playing video* and *Privacy*, and the
HLS Authoring Specification for Apple Devices. Numbers below are
guideline numbers.

---

## Already met

- **Account deletion in the app (5.1.1(v)).** *Delete my account* in the
  account corner. Connected addresses go with it (`account_emails`
  cascades from `profiles`).
- **No tracking (5.1.2).** No analytics, ads, pixels or cookies; no prompt
  would be owed.
- **Streams are not recorded (2.5.14, 5.1.1).** `infra/mediamtx/mediamtx.yml`
  sets no `record`, and MediaMTX's default is off; `playback: false`.
- **Showing a stranger's words to strangers (1.2).** The only such words
  are *Name from Origin* on the earth: opt-in twice (typed, then the
  switch), cleaned by `lib/label.ts`, gone when the sitting ends.
- **HLS** is what the stream already is. (The old rule that made it
  compulsory, 2.5.7, was removed in January 2024.)

## Owed by the website now — built in this plan

- [x] **Say what the video is.** Under the live window in a guided
  sitting: *Live, and not recorded. Nobody can see or hear you.* Apple's
  2.5.14 is about the broadcaster's side; this is the viewer's half of the
  same honesty, and it answers the question anyone being shown a camera
  asks first.
- [x] **Say when it drops.** A stream that stalls fades back to the pond,
  as before, but the line under the window says *The picture dropped. It
  will come back by itself.* until it does — instead of the window simply
  vanishing.
- [x] **The privacy notice was out of date.** It said *no newsletter*
  and named only the email code. Brought up to date from
  `plans/privacy-data-inventory.md`: Google sign-in, the *email me* switch
  (a consent record, nothing sent yet), connected addresses and their
  codes through Resend, and the live video (watching sends your address to
  the video server, as any website does; nothing is recorded).

## Owed, but not ours to decide

- **A published contact, and a way to report (1.2, 5.1.1(i)).** The notice
  has `[CONTACT EMAIL]` and `[CONTROLLER]` waiting on Jonny's legal-entity
  answer (`plans/launch-readiness.md`). A report link in the sitting needs
  the same address. When it arrives, it goes in the notice and as a quiet
  link under the live window.
- **The guide's name on screen.** `/api/live` deliberately does not send
  the collaborator's name (`app/api/live/route.ts`). Showing it is a change
  to what the people on camera agreed to; ask them, and Jonny, first.
- **An unsubscribe route** before anything is sent to the *email me* list
  (already noted in the inventory).
- **How long the video server's own logs keep addresses.** MediaMTX runs at
  `logLevel: info` behind a proxy; the retention of those logs on the
  Hetzner box has not been read. Check before the notice is published.

## Only for an App Store submission — not built

Written down so the iPhone question starts from them, not from scratch.

1. **Paid group sittings must use in-app purchase.** 3.1.3(d) exempts
   only real-time services between two people; one-to-many must use IAP
   (3.1.1). A one-to-one session may be paid outside. This changes any
   price put to Jonny for an app.
2. **A second login beside Google (4.8)** that limits data to name and
   email and lets people hide their address — Sign in with Apple.
3. **Not a wrapped website (4.2).** Native playback (AVPlayer, Picture in
   Picture, AirPlay), the beds in the background, a reminder for the
   shared hour. `lib/` staying portable is what makes this affordable.
4. **The App Privacy label:** name, email, coarse location, user ID,
   product interaction; purchases once paid; no tracking.
5. **The age-rating questionnaire.** Answer the user-generated-content and
   social items; whether there is a livestreaming item was not confirmed
   from Apple's own pages — read it in App Store Connect.
6. **A guide broadcasting from inside the app (2.5.14):** camera and
   microphone purpose strings, consent, and an indicator while live.
7. **The stream to Apple's spec.** The spec asks for ~6s segments and
   `EXT-X-PROGRAM-DATE-TIME`; ours are 2s for latency
   (`hlsSegmentDuration`). A native player would also want a low rung for
   weak connections. Revisit with the app, not before.

Not confirmed from a primary source: a livestreaming item in the age
questionnaire; whether a single chosen guide counts as user-generated
content (Apple's text is silent); the current US rules on linking out to
payment.
