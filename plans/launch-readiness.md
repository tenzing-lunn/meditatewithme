# Launch readiness

Active checklist for the remaining v1 work. **The room went live on 1 September
2026 (`626ef93`, `dev` merged into `main`) with every item below still open**,
so this is now the list of what the live site is missing rather than what
gates a launch. The legal items are the ones that matter: the site is public,
sets an anonymous id, records heartbeats and offers email sign-in, with no
privacy notice. The original build brief is retained as a historical baseline
in `plans/v1-build-spec.html`.

## Current state — verified 7 September 2026, `dev` at `353aee0`

- [x] Steps 01–07 are implemented on `dev`: room, timing, audio, presence,
  optional accounts, preference sync, and practice-log sync.
- [x] Presence B, C and D (began-with cohort, *until the bell*, first-here) are
  live; both database migrations are applied to Supabase project
  `qcwgquwjazhsettuemgt`. A (the flame field) was built and then deleted in
  `8d59fba`; the dots on the sitting ring carry it now. **None of the presence
  work has been raised with Jonny** — see *Before any invoice*, below.
- [x] The room is a photograph (`5b6b239`): landing is the picture and the word
  *Let’s begin.*; three questions one at a time; the sitting is a ring; the ending is
  a thirty-second return. `plans/room-polish.md` Phases 1–2 landed in the same
  commit; only its §4 remains open.
- [x] The account schema, signup trigger, RLS policies, and browser magic-link
  implementation are in the repository.
- [x] **The magic link is confirmed working on localhost** — auth log `/verify`
  303 with `login_method: implicit` at 2026-09-01 22:41:41, matching
  `auth.users.last_sign_in_at`. Nothing in the link flow is waiting on
  deployment. What looked like a failure afterwards was a spent link
  (`One-time token not found`), which the app now reports instead of swallowing.
- [x] 133 tests, typecheck and a clean production build at `5b6b239`; no
  scrolling and no AA contrast failure at 1280×800 or 375×812.
- [x] Launched: `main` serves the room. Rollback candidate `defa583`.
- [x] Released 7 September 2026 (`cc712c6`, `dev` at `353aee0` merged into
  `main`, on Tenzing's word): account menu, account deletion, the 55-minute
  hour, matched beds, icon and share image, per-device sign-out. Typecheck,
  168 tests and the build passed first; the timer migration was read back
  from production before the merge. Rollback candidate `7026657`.
- [ ] Step 08: legal, real-device QA, and launch configuration — all still
  open on the live site.

## Account creation / Supabase Auth

Accounts are **optional**. A visitor can use the room, timer, sound, and local
practice log without one. `Create account` asks for a name, then an email, then
the six-digit code from that email; the same email also carries a link, and
either finishes it. The browser stores the session, the database creates a
profile automatically, and preferences and practice history sync under RLS. The
name is stored on `auth.users` as `user_metadata.name` and is only ever written
by the request that creates the user.

### Dashboard configuration — required before public accounts

Complete this in Supabase Dashboard → **Authentication → URL Configuration**.
The hosted dashboard settings are infrastructure, so they cannot be committed
as a migration.

1. ~~Set **Site URL** to the live canonical origin.~~ **Done** — read back from
   the live config on 7 September 2026: `https://meditatewithme.vercel.app`.
   Replace it with the `https://<custom-domain>` origin when DNS is live.
2. ~~Add these **Redirect URLs**:~~ **Done**, same read-back — all three below
   are in the allow-list:
   - `http://localhost:3000/**`
   - `https://meditatewithme.vercel.app/**`
   - `https://*-10zinglunn-afks-projects.vercel.app/**`
   - `https://<custom-domain>/**` once the custom domain exists — still to add.
3. In **Authentication → Providers → Email**, confirm Email/Magic Link remains
   enabled. `signInWithOtp` intentionally creates a new user on first use;
   that is the account-creation path, not a separate registration form.
4. ~~In **Authentication → SMTP**, configure a branded, production sender and
   verify its domain.~~ **Half done, 7 September 2026 (evening).** Tenzing
   set custom SMTP in the dashboard (Authentication → Emails → SMTP Settings):
   host `smtp.resend.com`, port 465, user `resend`, sender name *Meditate
   With Me*. Read back through the Management API; enabling it moved
   `rate_limit_email_sent` from 2 to 30 on its own. **The sender address is
   Resend's test one, `onboarding@resend.dev`, because there is no domain
   yet.** That delivers only to the Resend account's own inbox and Gmail put
   the first message in spam on the domain's reputation. The other half:
   `meditatewithme.com` (GoDaddy registration, DNS at Cloudflare — see the
   domain row below). Add it in Resend → Domains, put its DKIM/SPF/DMARC
   records in the Cloudflare zone, wait for *Verified*, then change **only
   the sender email** on the same Supabase page to `signin@meditatewithme.com`.
   Nothing else changes.
4b. ~~In **Authentication → Email Templates → Magic Link**, add `{{ .Token }}`
   to the template.~~ **Done 7 September 2026 (evening)**, minutes after item
   4 unblocked it, through the Management API (the earlier refusal, *"Email
   template modification is not available for free tier projects using the
   default email provider"*, went away with the default provider). Subject
   *Your code for Meditate With Me*; body as below. Proved end to end: a real
   `/otp` request against the live project at 19:59 UTC produced an email in
   Tenzing's Gmail with a six-digit code rendered in large type and the link
   underneath. The code box on the last step now has something to receive.

   ```html
   <h2>Your code</h2>
   <p>Enter this on the site to sign in:</p>
   <p style="font-size:28px;letter-spacing:0.3em;font-weight:bold">{{ .Token }}</p>
   <p>Or <a href="{{ .ConfirmationURL }}">follow this link</a> instead. Either works once, within the hour.</p>
   ```
4c. ~~In **Authentication → Providers → Email**, set **Email OTP Length** to
   `6`.~~ **Done 7 September 2026**, through the Management API
   (`mailer_otp_length: 6`), re-read afterwards, and proved end to end with a
   throwaway user on `example.invalid`: `admin/generate_link` returned a
   six-digit `email_otp`, it verified against `/verify` with a 200, and the user
   was deleted. Until that day the project issued eight-digit codes (confirmed
   3 September), which the code box — `maxLength={6}`, `pattern="[0-9]{6}"` —
   would have truncated and rejected. Decided in favour of moving the project
   rather than the UI, so the six-digit copy, pattern and placeholder in
   `Account.tsx` all stay as written. The auth server is now right; only the
   email is missing, and that is 4 then 4b.
5. Review **Authentication → Rate Limits** after choosing the sender. Keep the
   default per-email resend delay unless there is a demonstrated support need.
   Add CAPTCHA before public promotion if abuse is observed or the sender has a
   low tolerance for unsolicited email.

### Evidence from the live project — 7 September 2026

Checked against `qcwgquwjazhsettuemgt` rather than assumed. Four accounts exist.

| Created | Confirmed | Signed in | Sittings |
|---|---|---|---|
| 28 Aug 23:41 | yes, 29s later | 3 Sep | 28 |
| 4 Sep 05:03 | yes, 33s later | **7 Sep 08:12** | 3 |
| 4 Sep 13:11 | yes, 12s later | 4 Sep | 0 |
| 4 Sep 13:50 | **never** | **never** | 0 |

What this establishes:

- **Account creation works in production.** The 7 September sign-in is a
  complete round trip in the auth logs — `/otp` 200, `mail.send` of type
  `magic_link`, `/verify` 303, `Login` with `login_method: implicit` — from
  `https://meditatewithme.vercel.app`. Three of four accounts confirmed within
  a minute of asking.
- **Everyone had been signing in with the link, not the code.** Every login
  recorded up to that afternoon is `implicit`, which is the link path. That
  was expected: the email carried no code until the sender was replaced (4,
  then 4b), both done that evening. 4c was done earlier the same day.
- **The sender was Supabase's shared one until that evening.** `mail_from`
  was `noreply@mail.app.supabase.io` with `rate_limit_email_sent = 2` — two
  emails an hour, project-wide, the default sender's ceiling and the likeliest
  explanation for the lost sign-up below. Now Resend, limit 30, sender
  address still the test one (item 4).
- **One sign-up was lost.** The fourth account was created 39 minutes after
  the third, in the same hour, and never confirmed — its `confirmation_token`
  is still pending and `email_confirmed_at` is null, so Supabase accepted the
  send and the visitor never came back. The shared sender's per-hour rate
  limit is the obvious candidate and a spam folder is the other; the auth logs
  only retain 24 hours on this plan, so 4 September is gone and **the cause
  cannot be proven from here.** What is certain is that a real person tried to
  make an account on this site and did not get one.

### End-to-end acceptance test — required after configuration

Use a real, non-team inbox and test both desktop and phone:

1. Open the `dev` preview, change a visible preference, and request a link.
2. Verify the email arrives from the configured sender and its link returns to
   the same preview origin rather than localhost.
3. Open the link in a second browser/device. Confirm it signs in, creates one
   `auth.users` / `profiles` record, and hydrates the preference selected on
   the first device.
4. Complete a sitting, then confirm the practice entry appears on the other
   device. Sign out and confirm local use still works.
5. Repeat once on the production domain after `main` is deliberately launched.

Do not put the service-role key, redirect URLs containing sharing tokens, or
SMTP credentials in git. `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon
key belong in Vercel environment variables; `SUPABASE_SERVICE_ROLE_KEY` stays
server-only.

## Before any invoice — one status update to Jonny

Two pieces of built work are not in the proposal Jonny holds and he has not
been told about either. They must appear in a status update *before* they
appear on an invoice, or they are the exact thing the proposal's "nothing on an
invoice you weren't expecting" promise forbids.

- [ ] **The practice log** (~4h, `75fb359`). In v1 by Tenzing's decision and
  counted against the 55-hour cap.
- [ ] **The presence work** (B/C/D live, A built and deleted). The change order
  in `plans/presence-change-order.md` was never sent; Tenzing chose to show the
  work first. Decide whether it is quoted as a one-off or absorbed into the
  cap, then say so in the same update. Until then it is inside the cap.
- [ ] Confirm `TIMELOG.md` before sending — "where are we against the 55?" is
  the first reply this update will get, and there is no confirmed number yet.

## To raise with Jonny, not blocking launch

- [ ] The product-model question in `plans/room-polish.md` §4 — whether joining
  the shared hour becomes the primary path — and the measurement question in
  §4D, which needs the legal-entity decision below before it can be answered
  privacy-safely. One conversation, after the status update above.
- [ ] Whether the photograph in `public/room-base.png` (the master behind the
  served `.avif` and `.jpg`) is the candle that ships,
  or the stand-in for a licensed loop Jonny sources. `context/PRODUCT.md`.

## Remaining launch work

- [ ] Obtain the legal entity/data-controller name and minimum-age decision
  from Jonny; write privacy notice, terms, and age policy. **The factual half is
  already written** — `plans/privacy-data-inventory.md` has the complete
  inventory and drafted copy for every category, including the approximate
  location the globe added. Only `[CONTROLLER]` and `[CONTACT EMAIL]` are
  outstanding, so this is now a fill-in rather than a write-up. **The page
  exists** as of 8 September 2026: `app/privacy/page.tsx` renders the draft
  with the two gaps shown as gaps, nothing links to it and it is `noindex`.
  When the names arrive: fill them, remove the `robots` line and the
  `Unfilled` marker, link it from Home's foot and the ending. Terms and the
  age policy are still unwritten.
- [x] Add favicon and Open Graph metadata. Done 7 September 2026: `app/icon.tsx`,
  `app/apple-icon.tsx` and `app/opengraph-image.tsx`, all generated from one
  flame in `components/FlameMark.tsx`. All three prerender static, so the
  Google Fonts fetch happens at build and never on a crawler's request.
- [x] In-app account deletion. Done 7 September 2026: `DELETE /api/account`
  plus *Your account* at the foot of Home. Needed no migration — every
  foreign key from `auth.users` down through `profiles` to `preferences` and
  `sittings` was already `ON DELETE CASCADE`, verified against the live
  database rather than read off the migration files. Verified end to end
  against the live project with a throwaway account on `example.invalid`:
  13/13, including that the cascade really empties all three tables, that a
  second account alongside it is untouched, and that no-token, bad-token and
  bare-service-key requests are all 401. Satisfies App Store guideline
  5.1.1(v) and is what the privacy notice's erasure paragraph will point at.
- [ ] Perform real-phone QA and review keyboard navigation, contrast, and
  `prefers-reduced-motion` behaviour. **Keyboard and reduced motion reviewed
  in the preview on 8 September 2026**, guest origin at 1440×900: Tab order
  and a visible focus ring on the landing, all three questions, the account
  menu (arrows wrap, Home/End), Home and its four rows; the slider steps
  through `TIMER_STOPS` with `aria-valuetext` and persists. Two fixes came
  out of it: Escape now returns focus to the menu trigger instead of dropping
  it on `<body>`, and the flow's folded summary rows were 40px, now 48. Under
  reduced motion the camera pins at 1.03 with no transform transition. Not
  reviewed: the sitting and the ending (each needs a finished sitting, which
  writes a practice entry), and anything that needs a phone in hand.
- [x] ~~Configure Auth URL allow-list and production SMTP.~~ URL allow-list
  done earlier on 7 September 2026; SMTP through Resend that evening (item 4).
  What remains of it is the domain, below.
- [x] ~~After the SMTP sender is in, add `{{ .Token }}` to the Magic Link
  template (4b).~~ Done 7 September 2026, proved with a real code in a real
  inbox. The code box on the last step is no longer decorative.
- [ ] **Attach `meditatewithme.com`.** Looked up 7 September 2026: created
  25 February 2013 at GoDaddy (expires February 2027, auto-renew unknown),
  nameservers `bruce`/`kim.ns.cloudflare.com`, so **the records go in a
  Cloudflare account, not GoDaddy**, and somebody has its login. The apex
  currently 302-redirects to `susantaylor.org/meditate-with-me/`; pointing
  it here ends that, which is Jonny's to approve. No MX records, so Resend's
  records disturb no mailbox. Added to the Vercel project the same evening
  (apex → `www`, both *Invalid Configuration* pending DNS). Records needed
  in Cloudflare, all **DNS only / grey cloud**, not proxied: the A and CNAME
  Vercel shows under *View DNS configuration*, and the DKIM/SPF/DMARC set
  Resend shows under *Domains*. This is now the single item
  between visitors and a sign-in email that arrives: verify it in Resend,
  change the SMTP sender address to it (item 4), attach it to Vercel, update
  Supabase Site URL and the redirect allow-list, and repeat the production
  auth test from a second device. Until then sign-in mail delivers only to
  Tenzing's own inbox, and to its spam folder.
- [ ] Review the existing Supabase security-advisor notices before launch:
  heartbeats has deliberately no browser RLS policy; `touch_updated_at` has a
  mutable search-path warning that needs a separate, tested migration.
- [ ] Re-run typecheck, unit tests, and production build on `dev`; review the
  Vercel preview; ask before merging `dev` into `main`.

## Completed plans

- `docs/presence-spec.md` — B, C, D delivered on `dev`; A delivered then
  deleted (`8d59fba`).
- `docs/photographic-room.md` — delivered in `5b6b239`.

## Still active

- `plans/presence-change-order.md` — unsent. Moved back out of `docs/` on
  1 September because it is a decision still to be made, not a record.
- `plans/room-polish.md` — §4 only.
