# Launch readiness

Active checklist for the remaining v1 work. **The room went live on 1 September
2026 (`626ef93`, `dev` merged into `main`) with every item below still open**,
so this is now the list of what the live site is missing rather than what
gates a launch. The legal items are the ones that matter: the site is public,
sets an anonymous id, records heartbeats and offers email sign-in, with no
privacy notice. The original build brief is retained as a historical baseline
in `plans/v1-build-spec.html`.

## Current state — verified 1 September 2026, `dev` at `8d59fba`

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

1. Set **Site URL** to the live canonical origin. Until the custom domain is
   attached, use `https://meditatewithme.vercel.app`; replace it with the
   `https://<custom-domain>` origin when DNS is live.
2. Add these **Redirect URLs**:
   - `http://localhost:3000/**`
   - `https://meditatewithme.vercel.app/**`
   - `https://*-10zinglunn-afks-projects.vercel.app/**`
   - `https://<custom-domain>/**` once the custom domain exists.
3. In **Authentication → Providers → Email**, confirm Email/Magic Link remains
   enabled. `signInWithOtp` intentionally creates a new user on first use;
   that is the account-creation path, not a separate registration form.
4. In **Authentication → SMTP**, configure a branded, production sender and
   verify its domain. The default hosted SMTP is only suitable for team-address
   testing and does not deliver ordinary visitors' login emails.
4b. In **Authentication → Email Templates → Magic Link**, add `{{ .Token }}` to
   the template. **The account flow asks for a six-digit code and the stock
   template does not contain one.** Everything else works without this: the
   panel says "the link in that email works too", `emailRedirectTo` is still
   sent, and the link still signs people in. But until this is done the code box
   on the last step has nothing to receive, so it must be done in the same pass
   as the SMTP sender rather than after it.
4c. In **Authentication → Providers → Email**, set **Email OTP Length** to `6`.
   **The project currently issues eight-digit codes** — confirmed against the
   live project on 3 September 2026: `admin/generate_link` returned an
   `email_otp` of `8` digits, and all eight verified against `/verify` with a
   200. The account flow's code box is `maxLength={6}` with
   `pattern="[0-9]{6}"`, so an emailed code would be truncated to its first six
   digits and rejected. Doing 4b without this fixes nothing: the code arrives
   and still cannot be entered. Decided in favour of moving the project rather
   than the UI, so that the six-digit copy, pattern and placeholder in
   `Account.tsx` all stay as written.
5. Review **Authentication → Rate Limits** after choosing the sender. Keep the
   default per-email resend delay unless there is a demonstrated support need.
   Add CAPTCHA before public promotion if abuse is observed or the sender has a
   low tolerance for unsolicited email.

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
- [ ] Whether the photograph in `public/room-base.png` is the candle that ships,
  or the stand-in for a licensed loop Jonny sources. `context/PRODUCT.md`.

## Remaining launch work

- [ ] Obtain the legal entity/data-controller name and minimum-age decision
  from Jonny; write privacy notice, terms, and age policy. **The factual half is
  already written** — `plans/privacy-data-inventory.md` has the complete
  inventory and drafted copy for every category, including the approximate
  location the globe added. Only `[CONTROLLER]` and `[CONTACT EMAIL]` are
  outstanding, so this is now a fill-in rather than a write-up.
- [ ] Add favicon and Open Graph metadata.
- [ ] Perform real-phone QA and review keyboard navigation, contrast, and
  `prefers-reduced-motion` behaviour.
- [ ] Configure Auth URL allow-list and production SMTP; complete the
  cross-device magic-link acceptance test above.
- [ ] In the same dashboard pass, add `{{ .Token }}` to the Magic Link template
  (4b) **and** set Email OTP Length to 6 (4c). Neither works without the other,
  and until both are done the code box on the last step is decorative.
- [ ] Attach and verify the custom domain/DNS, update Supabase Site URL, and
  repeat the production auth test.
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
