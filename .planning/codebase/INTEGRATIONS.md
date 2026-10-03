# INTEGRATIONS

Scanned 2026-10-03. No payment, analytics, error-tracking, or push-notification integrations exist.

## Supabase (Postgres + Auth) - the only data store
Wiring: `lib/supabase.ts` (two clients, both created via dynamic `import()`, both `async`).
- `browserClient()` - publishable anon key, one cached **promise** (not client), implicit auth flow (not PKCE), `persistSession`, `detectSessionInUrl`. No server-side session; no `@supabase/ssr`, no callback route. Safety = RLS policies.
- `serviceClient()` - service role, no session persistence, **route handlers under `app/api/` only**. Never import into a component; never add a `NEXT_PUBLIC_` prefix (CLAUDE.md "the one thing that must not break").
- Tables (`supabase/migrations/`): `sessions` (overrides; absent row = ambient default), `heartbeats` (presence, pruned), `profiles`, `preferences`, `sittings` (practice log, per user), `stream_keys`, `live_hours`, `admins`, `guide_applications`, `account_emails`, `email_codes`; RLS enabled on all. RPC `email_owner(addr)`. Trigger `handle_new_user`, `touch_updated_at`, `revoke_stream_keys_of_profile`, `stamp_email_updates`.
- Scheduled: one `pg_cron` job pruning old heartbeats (`20260903193000_schedule_prune_heartbeats.sql`), function `prune_heartbeats()`.
- **Apply migrations with `supabase db query --linked -f supabase/migrations/<file>.sql`, never `db push`** (remote history table does not match local filenames). Verify with a second query. Schema is NOT deployed with the app.
- Browser-side tables used directly with RLS: preferences sync (`components/useSyncPreferences.ts`), practice log (`components/usePractice.ts`), profile/label (`components/useProfile.ts`), email-updates (`components/useEmailUpdates.ts`), guide/admin/email UIs (`components/Streaming.tsx`, `components/Admin.tsx`, `components/Emails.tsx`, which also call the `/api/account*` and `/api/admin` routes with the user JWT).
- Dashboard-only config (not in repo): Auth Site URL + Redirect allow-list (localhost, `meditatewithme.vercel.app`, team preview wildcard, custom domain), custom SMTP, Google provider toggle. See `context/ARCHITECTURE.md` section 15.

## Authentication (`components/useAuth.ts`, `components/AccountCorner.tsx`, `components/GoogleSignIn.tsx`)
Three routes in, all ending in a Supabase session:
1. Google: `signInWithOAuth({provider:'google'})`, redirect to `${origin}/`; pre-checks `${SUPABASE_URL}/auth/v1/settings` for `external.google`. Notes in `context/GOOGLE_SIGN_IN.md`.
2. Email OTP / magic link: `signInWithOtp` (creates user), completed in-page by `verifyOtp`. Link tokens read from URL fragment (implicit flow).
3. Connected-address code login: `app/api/signin/route.ts` (POST sends a 6-digit code to an address in `account_emails`; PUT verifies and returns a `hashed_token` from `auth.admin.generateLink` which the client redeems with `verifyOtp`).
Guests have no session; practice log, prefs and profile live in `localStorage` (`mwm.preferences`, `mwm.practice`, `mwm.profile`, `mwm.room`) and sync when signed in. Presence uses an anonymous UUID.
Server-side caller identification: `callerOf()` in `app/api/_email/codes.ts` validates a `Bearer` JWT with `db.auth.getUser`. Admin = row in `admins` (`app/api/admin/route.ts`). Account deletion: `app/api/account/route.ts` (`auth.admin.deleteUser`).

## Resend (transactional email)
`app/api/_email/codes.ts` `sendMail()` -> `POST https://api.resend.com/emails`, sender `signin@meditatewithme.online`. Used for connect/sign-in codes and the "you can guide" welcome in `app/api/admin/route.ts`. Code hashes are HMAC of email+code keyed by the service role key; table `email_codes` (rate limit, TTL, attempt cap; rules in `lib/emailCode.ts`). Missing `RESEND_API_KEY` -> `'unavailable'`. Supabase Auth mail itself goes through Supabase's own SMTP (needs custom SMTP before public launch).

## Live video (MediaMTX + hls.js) - design in `plans/live-video.md`
- Ingest: guides publish RTMP/SRT to MediaMTX at `live/<slug>` with a stream key (`infra/mediamtx/mediamtx.yml`, ports 1935, 8890; HLS 8888 fmp4). Hosting plan: small VPS (Hetzner/OVH); not Cloudflare CDN. Runbook: `infra/mediamtx/README.md`.
- MediaMTX -> site callbacks (secret-guarded, constant-time compare in `app/api/live/secret.ts`):
  - `POST /api/live/auth` (`app/api/live/auth/route.ts`): HTTP auth, Basic password = `LIVE_AUTH_SECRET`; checks sha256 of key against `stream_keys.key_hash`, not revoked. 204 allow / 401 deny.
  - `POST /api/live/hook` (`app/api/live/hook/route.ts`): Bearer `LIVE_HOOK_SECRET`; `online`/`seen`(30 s)/`offline` update `stream_keys.live_since/live_seen/live_server`; 410 tells `infra/mediamtx/hook.sh` to cut the stream (revoked or shut off). Stale after `LIVE_STALE_MS` (90 s) with no `seen`.
- Viewer discovery: `GET /api/live` (`app/api/live/route.ts`) picks who is on air this hour using pure `lib/live.ts` (`onAir`, `mayShow`, `hlsUrl`) and `live_hours` hour-claim table; returns `{live:{slug,hls,name?}|null, next?, stopped?}`. Requires `LIVE_HLS_BASE`.
- Client: `components/useLive.ts`, `components/LiveLayer.tsx`, `components/LiveStream.tsx` (dynamic-imports `hls.js`), `components/liveVideo.ts` (primes playback inside a user gesture). Dev harness: `app/live-test/`, `/?demo=live` (dev only).
- Guide management: `app/api/account/stream/route.ts` (apply, see key; account keys are HMAC-derived by `accountKey()`), `app/api/admin/route.ts` (accept, add, put on air, shut off), UI in `components/Streaming.tsx`, `components/Admin.tsx`, page `app/admin/page.tsx`. CLI: `scripts/live-key.mjs`.

## Vercel
- Deploy: GitHub `10zinglunn-afk/meditatewithme`; `main` -> production (meditatewithme.vercel.app; custom domain `meditatewithme.online` / `www.` referenced in `app/api/admin/route.ts` `SITE`, `app/api/_email/codes.ts` sender). `dev` -> preview per push. `.vercel/project.json` links locally.
- Edge cache is load-bearing, not incidental: `/api/count`, `/api/world` (10 s s-maxage + SWR), `/api/session` (60 s) rely on `CDN-Cache-Control`; `/api/time` is explicitly `no-store` on all layers.
- Geolocation from Vercel request headers: `x-vercel-ip-latitude|longitude|city|country` -> `app/api/origin/route.ts`, `app/api/heartbeat/route.ts` via `lib/geo.ts` `snapToCell` (coarse grid; only a cell is stored).
- Env vars set in Vercel for Production/Development and Preview scoped to `dev` (a new branch name will not reach Supabase).

## Apple / App Store
- No Apple SDK on web. `app/apple-icon.tsx` = touch icon. Review-driven copy changes done (live window says live, not recorded, one-way; privacy notice covers Google, connected addresses, video) per `plans/apple-guidelines.md`; remaining asks in `plans/launch-readiness.md` ("The iPhone app").
- Mobile app (`mobile/`): Expo, background audio enabled (`expo-audio` plugin), no account/auth/network code yet; step 1 is the bell-on-a-locked-phone test (`mobile/App.tsx`, `plans/iphone-app.md`). Bundle id / EAS config not present yet.

## Local-only tooling
- GitHub (git hooks only), Claude Code hooks: `.claude/hooks/timelog-{start,end}.sh` write `.timelog/pending.tsv` (gitignored).
- Static data: `public/earth/{land.json,relief.jpg}` (map), `public/places.txt` (place names), `public/sounds/*.mp3` (5 beds + bowl/chimes/drum), `public/images/skipping-stone.webp`.

## Not present
Webhooks inbound other than the MediaMTX pair; Supabase Realtime/WebSockets (deliberately avoided); Redis/queues; analytics; Sentry; payments.
