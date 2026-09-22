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
  work first. **Decided 13 September 2026: quoted as a £300 one-off**, to be
  said at the meeting that day (`plans/meeting-with-jonny.md` §4). Until Jonny
  answers it is inside the cap.
- [ ] Confirm `TIMELOG.md` before sending — "where are we against the 55?" is
  the first reply this update will get, and there is no confirmed number yet.

## To raise with Jonny, not blocking launch

- [ ] The product-model question in `plans/room-polish.md` §4 — whether joining
  the shared hour becomes the primary path — and the measurement question in
  §4D, which needs the legal-entity decision below before it can be answered
  privacy-safely. One conversation, after the status update above.
- [x] ~~Whether the photograph in `public/room-base.png` is the candle that
  ships~~ — moot since 14 September 2026: the photographic room was replaced
  by the warm rail (`docs/ui-rebuild.md`) and the photograph is deleted.
  Jonny's licensed imagery, if it comes, is a different question now: what,
  if anything, sits behind the sitting besides the earth. `context/PRODUCT.md` §5.

## Remaining launch work

- [ ] Obtain the legal entity/data-controller name and minimum-age decision
  from Jonny; write privacy notice, terms, and age policy. **The factual half is
  already written** — `plans/privacy-data-inventory.md` has the complete
  inventory and drafted copy for every category, including the approximate
  location the globe added. Only `[CONTROLLER]` and `[CONTACT EMAIL]` are
  outstanding, so this is now a fill-in rather than a write-up. **The page
  exists** as of 8 September 2026: `app/privacy/page.tsx` renders the draft
  with the two gaps shown as gaps, nothing links to it and it is `noindex`.
  **The terms exist too**, later the same day: `app/terms/page.tsx`, with
  the age policy as its `Age` section and four gaps — controller, contact,
  `[MINIMUM AGE]` (the proposal recommended eighteen) and `[JURISDICTION]`
  (everything points at England and Wales; nobody has said so). Same
  treatment: unlinked, `noindex`. When the answers arrive: fill them, remove
  the `robots` lines and the `Unfilled` chips from both pages, link both
  from Home's foot and the ending.
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
  reduced motion the camera pins at 1.03 with no transform transition.
  **The sitting and the ending followed later the same day**, two one-minute
  guest sittings on the second origin (the entries landed in that origin's
  own log, not Tenzing's). Three more fixes: the sound drawer opens above its
  toggle in the DOM, so Tab skipped it — focus now moves into it and Escape
  brings it back; `Your practice` unmounts when pressed, so focus fell to
  `<body>` — the two buttons now hand focus to each other; and the ending's
  two foot buttons were 40px, now 44. Tab order in the sitting, the drawer
  (play buttons, faders with percentages, volume) and the ending all match
  the visual order, every stop has the ring. The audit's §10 `open`-phase
  contrast failure was re-checked the same day and is closed: the rows it
  measured moved to `ink-2` in `a52b454`, and the only `ink-3` left on that
  screen is the back arrow at the top, in the strips that passed; with the
  levels open at 390×844 the copy scales to 0.957 and fits. Still not
  reviewed: anything that needs a phone in hand.
- [x] ~~Configure Auth URL allow-list and production SMTP.~~ URL allow-list
  done earlier on 7 September 2026; SMTP through Resend that evening (item 4).
  What remains of it is the domain, below.
- [x] ~~After the SMTP sender is in, add `{{ .Token }}` to the Magic Link
  template (4b).~~ Done 7 September 2026, proved with a real code in a real
  inbox. The code box on the last step is no longer decorative.
- [ ] **Attach `meditatewithme.online` first.** 13 September 2026: it is in
  Jonny's IONOS account (with `.info` and `.store`), DNS at IONOS, parked, so
  it needs nobody's yes. Tenzing chose it; added to the Vercel project the
  same day the way `.com` is (`www` primary, apex 308 → `www`). Records at
  IONOS: apex A `216.198.79.1` in place of IONOS's `217.160.0.138`, **delete
  the apex AAAA** `2001:8d8:100f:f000::200` (the parking page over IPv6),
  `www` CNAME `4ab769caa170d937.vercel-dns-017.com`. The root SPF
  (`include:_spf-eu.ionos.com`) can stay — Resend's sit on `send.`. Then the
  same Resend / Supabase steps below, with `.online` in place of `.com`.
  **Done the same afternoon:** Tenzing made those edits (IONOS disabled its
  *Default Site*, taking the parking A/AAAA and a `_dep_ws_mutex` TXT with
  it); Vercel read both as configured but issued no certificate in 15
  minutes, so `vercel certs issue www.meditatewithme.online
  meditatewithme.online` was run by hand — Let's Encrypt, expires 12 December
  2026; check it renews. `https://www.meditatewithme.online` serves the site,
  apex 308s to it. Resend domain added (Ireland, manual setup, receiving off,
  no tracking subdomain), and its three records are in and resolving: TXT
  `resend._domainkey`, MX `send` → `feedback-smtp.eu-west-1.amazonses.com`,
  TXT `send` `v=spf1 include:amazonses.com ~all`. Resend then read the
  domain as **Verified**, and Tenzing changed in the Supabase dashboard (the
  Supabase MCP has no auth-config tool): Site URL →
  `https://www.meditatewithme.online`, `https://www.meditatewithme.online/**`
  added to the redirect allow-list, SMTP sender email →
  `signin@meditatewithme.online`. First second-device test, 18:09 UTC: the
  request came from the new origin and the mail arrived — **with no code**.
  The address was new, so Supabase logged `user_confirmation_requested` and
  sent the **Confirm signup** template, which never got `{{ .Token }}`; only
  Magic Link did on 7 September. Every first-time visitor was getting a
  link-only email. Fix is the dashboard (the MCP can't edit templates):
  Confirm signup gets Magic Link's subject and body. The app needs nothing —
  `verifyOtp` uses `type: 'email'`, which takes either. Still to do: that
  template, then the test again, to a sign-in recorded in `auth.users`.
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
- [x] ~~Review the existing Supabase security-advisor notices before launch.~~
  Done 8 September 2026: `touch_updated_at`'s search path is pinned
  (`20260908090000_touch_updated_at_search_path.sql`, applied with `db query
  --linked`, read back, and proved with a trigger on a temp table). What the
  advisor still lists is heartbeats' deliberate no-policy note and a
  leaked-password warning for a feature the site does not use.
- [ ] Re-run typecheck, unit tests, and production build on `dev`; review the
  Vercel preview; ask before merging `dev` into `main`.

## Completed plans

- `docs/ui-rebuild.md` — the warm rail, 14 September 2026, on `dev` and not
  yet released.

- `docs/presence-spec.md` — B, C, D delivered on `dev`; A delivered then
  deleted (`8d59fba`).
- `docs/photographic-room.md` — delivered in `5b6b239`.

## Still active

- `plans/presence-change-order.md` — unsent. Moved back out of `docs/` on
  1 September because it is a decision still to be made, not a record.
- `plans/room-polish.md` — §4 only.
- `plans/audit-2026-09-13.md` — the whole-site audit of 13 September: a
  Web Interface Guidelines punch list (Part A) and the Impeccable
  audit + critique re-run (Part B). Nothing in it is fixed yet, and the rows
  that referred to the photographic room's components are closed by the
  rebuild rather than by a fix — `plans/ui-ux-fixes.md` §1 says which.
- `plans/audit-2026-09-21.md` — the UI/UX audit of the warm rail, 21
  September: 7 High, 19 Medium, 16 Low, every line verified. Its plan is
  `plans/ui-ux-fixes.md`: eleven commits in order, four decisions for Tenzing
  first. Nothing in it is done yet.
