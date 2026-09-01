# Launch readiness

Active checklist for the remaining v1 work. This is the source of truth for
what still blocks a deliberate `dev` → `main` launch; the original build brief
is retained as a historical baseline in `plans/v1-build-spec.html`.

## Current state — verified 28 August 2026

- [x] Steps 01–07 are implemented on `dev`: room, timing, audio, aggregate
  presence field, optional accounts, preference sync, and practice-log sync.
- [x] Presence addition A–D is implemented on `dev` and both database
  migrations are applied to Supabase project `qcwgquwjazhsettuemgt`.
- [x] The account schema, signup trigger, RLS policies, and browser magic-link
  implementation are in the repository.
- [x] `npm run typecheck`, `npm test`, and `npx next build --webpack` passed
  for the latest presence work. (The default Turbopack build cannot bind its
  internal port in this environment; that is an environment limitation, not a
  release result.)
- [ ] Step 08: legal, polish, real-device QA, and launch configuration.

## Account creation / Supabase Auth

Accounts are **optional**. A visitor can use the room, timer, sound, and local
practice log without one. Choosing “Carry your practice to another device”
sends a magic link. The click returns to the same site, the browser stores the
session, the database creates a profile automatically, and preferences and
practice history sync under RLS.

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

## Remaining launch work

- [ ] Obtain the legal entity/data-controller name and minimum-age decision
  from Jonny; write privacy notice, terms, and age policy.
- [ ] Add favicon and Open Graph metadata.
- [ ] Perform real-phone QA and review keyboard navigation, contrast, and
  `prefers-reduced-motion` behaviour.
- [ ] Configure Auth URL allow-list and production SMTP; complete the
  cross-device magic-link acceptance test above.
- [ ] Attach and verify the custom domain/DNS, update Supabase Site URL, and
  repeat the production auth test.
- [ ] Review the existing Supabase security-advisor notices before launch:
  heartbeats has deliberately no browser RLS policy; `touch_updated_at` has a
  mutable search-path warning that needs a separate, tested migration.
- [ ] Re-run typecheck, unit tests, and production build on `dev`; review the
  Vercel preview; ask before merging `dev` into `main`.

## Completed plans

- `docs/presence-spec.md` — delivered on `dev`.
- `docs/presence-change-order.md` — retained as the unsent commercial record;
  its quoted scope was implemented after approval to proceed.
