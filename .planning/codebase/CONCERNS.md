# Concerns — a senior-engineer review

Written 3 October 2026 against `dev` at `ba85eeb` (6 commits ahead of `main`;
`main` differs only by its merge commits). Everything below was checked in the
code, not copied from `context/`. Where the project already admits a problem
in `CLAUDE.md`, `context/ARCHITECTURE.md` or `plans/launch-readiness.md`, that
is said; a few items here are not admitted anywhere.

Baseline facts, verified this session: `tsc --noEmit` passes; `npm test` runs
366 tests in 93 suites, all passing, in 1.3 s; ~16,300 lines of TypeScript
across `app/`, `components/`, `lib/`; ~3,900 lines of standing documentation
in `context/`, `DESIGN.md` and `CLAUDE.md`; 194 commits, effectively one
author. `npm run lint` cannot run: `next lint` is gone in Next 16 and ESLint
is not installed.

Severity: **High** = can lose data, mislead users, or be abused from outside
today. **Medium** = will bite within the next few features or at modest
scale. **Low** = worth knowing, fix when passing.

---

## 1. Correctness — things that are, or may be, broken

**1.1 `/api/heartbeat` accepts any well-formed UUID and any label, from anyone.** — High
`app/api/heartbeat/route.ts`
Why it matters: there is no origin check, no rate limit and no proof the caller is a browser on the site, so one `curl` loop writes thousands of rows into the current hour, inflates the count every viewer sees, and puts arbitrary text (`label`) on everybody's earth — `cleanText` strips control characters and caps length, it does not judge content. The route's own comment says UUID validation stops "millions of distinct rows"; it stops malformed ids, not volume.
Fix: at minimum a per-IP token bucket at the edge (Vercel WAF rate-limit rule, or an Upstash counter) and a cap on new `anon_id`s per hour per IP; longer term a signed, short-lived heartbeat token issued by the page.

**1.2 Audio graph `stop()` disconnects but does not stop the looping sources.** — Medium
`components/mix.ts` (`stop()`), `components/useMix.ts`
Why it matters: `stop()` only calls `master.disconnect()`; the per-bed `AudioBufferSourceNode`s with `loop = true` keep rendering into a detached subgraph for the life of the single shared `AudioContext` (`components/audio.ts` never closes it), so every `Entry` unmount/remount in a long session leaves another silent graph running — CPU and battery on a phone, not sound.
Fix: in `stop()` call `source.stop()` and `disconnect()` on every track, then null the handle; verify with `ctx.state`/a counter in dev.

**1.3 `useClock` re-syncs on `focus`, not `visibilitychange`, and the tick is a `setTimeout` chain.** — Medium
`components/useClock.ts`
Why it matters: a phone that locks mid-sitting and wakes does not always fire `focus` on the window, so a clock corrected by NTP during sleep is not re-measured; and a throttled background `setTimeout` means `now` can be minutes stale when the tab is shown again, until the next 250 ms tick fires. The bell itself is safe (it is on the audio clock), but the ring, the "until the bell" label and the hour rollover read `now`.
Fix: listen to `visibilitychange` (visible) as well as `focus`, and tick immediately on return.

**1.4 `/api/live` is a GET that writes, behind a 5 s edge cache.** — Medium
`app/api/live/route.ts`
Why it matters: the hour claim (`live_hours` upsert) happens inside a cacheable GET, so whether an hour is claimed depends on whether a viewer happened to miss the cache in the minute a guide came online; a reconnecting guide with no viewers may never be re-claimed, and the result differs per region cache.
Fix: move the claim to the `online`/`seen` hook (`app/api/live/hook/route.ts`), which already runs every 30 s with the server's authority; let `/api/live` be a pure read.

**1.5 Email-code upsert keys on `email` alone, so `purpose` can be swapped underneath a live code.** — Medium
`app/api/_email/codes.ts` (`issueCode`), `supabase/migrations/20260930130000_account_emails.sql`
Why it matters: `email_codes.email` is the primary key; a `connect` code in flight for address X is overwritten (and its `attempts` reset) by anyone who POSTs `/api/signin` for X — only after X is already connected, so the harm is denial rather than takeover, but it also means the unauthenticated sign-in route resets the brute-force counter.
Fix: key the row on `(email, purpose)` or refuse to overwrite a usable code of a different purpose; never reset `attempts` on resend.

**1.6 The practice-log pull fetches the whole table the browser can see, up to 1,000 rows, every sign-in.** — Low
`components/usePractice.ts`
Why it matters: correct today (RLS scopes it to the user) and 1,000 sittings is three years of daily practice, but the limit is silent — a user past it loses their oldest history on the second device with no message.
Fix: paginate or filter by `started_at > local newest`; at least log when `data.length === 1000`.

**1.7 No React error boundary anywhere.** — Low
`app/` (no `error.tsx` / `global-error.tsx`)
Why it matters: the project's stated rule is "nothing in this app should ever show an error screen", but an uncaught render error in `Journey` shows Next's default error page mid-sitting; the bell on the audio clock would still ring, the screen would not.
Fix: add `app/error.tsx` that renders the pond and nothing else.

**1.8 `/api/session` and `components/useSession.ts` are dead.** — Low
`app/api/session/route.ts`, `components/useSession.ts`
Why it matters: nothing imports `useSession`; the live-video path went through `stream_keys`/`live_hours` instead of `sessions`, so the "v2 seam" `ARCHITECTURE.md` §9 describes was not the seam used, and the route runs the service role for a table nobody reads.
Fix: delete both, or say in §9 that `sessions` is unused.

---

## 2. Security

**2.1 Service-role key handling is correct.** — (no action)
`lib/supabase.ts`, every `app/api/**/route.ts`
Verified: `serviceClient()` is imported only from route handlers (16 call sites, none in `components/` or `lib/` beyond its definition); the key has no `NEXT_PUBLIC_` prefix; `.gitignore` covers `.env*.local`. The bundle grep described in `ARCHITECTURE.md` §15 is the right check and was not re-run here (build not run).

**2.2 RLS is sound; the service-role-only tables rely on "no policy" rather than explicit revokes.** — Low
`supabase/migrations/0001_init.sql`, `..._stream_keys.sql`, `..._account_emails.sql`, `..._guides_admin.sql`
Verified: `preferences`, `profiles`, `sittings` have `using` and `with check`; `sessions` is select-only; `heartbeats`, `stream_keys`, `live_hours`, `admins`, `guide_applications`, `account_emails`, `email_codes` have RLS on with no policy, and most also `revoke all from anon, authenticated` — but `heartbeats`, `account_emails` and `email_codes` do not have the revoke. RLS-with-no-policy is a correct deny, so this is belt-and-braces, not a hole.
Fix: add the same `revoke all ... from anon, authenticated` to the three tables for consistency, so a future "add a policy" cannot accidentally open them.

**2.3 The service-role key doubles as an HMAC secret for two unrelated things.** — Medium
`app/api/_email/codes.ts` (`hash`), `app/api/live/secret.ts` (`accountKey`)
Why it matters: the database super-credential is used as the key-derivation secret for every guide's stream key and every email code; rotating it (which a leak would force) silently invalidates every guide's key and every code in flight, and it couples two security domains that should rotate independently. The code documents the consequence but not the alternative.
Fix: one new server env var (`APP_HMAC_SECRET`, `openssl rand -hex 32`) used by both; one-line change in each file plus a key_version bump path for guides.

**2.4 Admin authorisation is correct but has no audit trail.** — Medium
`app/api/admin/route.ts`, `supabase/migrations/20261002130000_guides_admin.sql`
Verified: every GET/POST proves the caller via `getUser(token)` then checks `admins`; ids never come from the body for the caller. Not verified anywhere: who did what — `shut-off`, `remove`, `invite` write no record of the acting admin.
Fix: an `admin_actions(user_id, action, slug, at)` insert at the end of each `case`; cheap, and the first thing wanted after a dispute.

**2.5 No rate limiting on any public route; unauthenticated email sending is reachable.** — High
`app/api/signin/route.ts` (POST), `app/api/heartbeat/route.ts`, `app/api/account/emails/route.ts`
Why it matters: `/api/signin` POST sends a Resend email to any *connected* address on request — bounded to one a minute per address by `canResend`, but unbounded across addresses, so a list of connected addresses plus one loop is a sender-reputation attack on `signin@meditatewithme.online`, the same sender the Supabase sign-in mail uses; and (1.1) the heartbeat has nothing at all. `plans/launch-readiness.md` item 5 mentions CAPTCHA "if abuse is observed", which is after the reputation is spent.
Fix: Vercel Firewall rate-limit rules on `/api/signin`, `/api/account/emails` and `/api/heartbeat` (no code), then an application-level counter if the free tier's rules are not enough.

**2.6 Input validation on API routes is good.** — (no action)
`lib/emailCode.ts`, `lib/label.ts`, `lib/live.ts`, `lib/geo.ts`
Verified: every body field is checked by type and shape before use (`normalizeEmail`, `isCode`, `cleanText`, `slugFromPath`, `keyFrom`, `sinceFrom`, `snapToCell`), all pure and all tested; secrets are compared with `timingSafeEqual`; MediaMTX secrets travel in headers not URLs. This is above the usual standard.

**2.7 No security headers.** — Low
`next.config.ts`, `app/layout.tsx`
Why it matters: no CSP, no `X-Frame-Options`/`frame-ancestors`, no `Referrer-Policy`; the inline room script in `layout.tsx` and the HLS origin (`LIVE_HLS_BASE`) would need listing, which is why it was probably skipped. Clickjacking the admin page is the concrete risk.
Fix: a `headers()` block with `frame-ancestors 'none'` on `/admin` and a report-only CSP site-wide to start.

**2.8 The email-code sign-in flow is well designed.** — (no action, one note)
`app/api/signin/route.ts`, `app/api/_email/codes.ts`
Verified: codes are HMAC-hashed, six digits, ten minutes, five attempts, constant-time compare, spent on success; the `generateLink` → `hashed_token` → `verifyOtp` exchange never sends a second email. Note only: the route confirms whether an address is connected to *some* account (acknowledged in its comment).

---

## 3. Scalability

The design argument in `ARCHITECTURE.md` §5 and §11 is right and the numbers below agree with it. What follows is where the code departs from the argument.

**3.1 Heartbeat writes are the first cliff, and it is lower than §11 says.** — Medium
`app/api/heartbeat/route.ts`, `components/usePresence.ts`
At 100 sitters: ~3.3 upserts/s, trivial. At 1,000: ~33/s plus a `count: exact` on every `began` — fine on Supabase Pro, tight on free (shared compute, 60 connections). At 10,000: ~333 upserts/s through Vercel functions that each open a fresh Supabase client (`serviceClient()` builds a new client per request; no connection pooling beyond Supavisor), with every one hitting the same `(hour_start, last_seen)` index page — this is where Postgres row-per-user stops being the shape, as §11 says, but the per-request client construction brings it forward.
Fix: hoist the client to module scope in each route (one per warm function instance), and when it is needed, batch heartbeats client-side to 60 s while sitting.

**3.2 Reads are correctly cached; two things are not.** — Medium
`app/api/count/route.ts`, `app/api/world/route.ts`, `app/api/live/route.ts`, `components/useLive.ts`, `components/Admin.tsx`
Verified: `/api/count` and `/api/world` carry `s-maxage=10, stale-while-revalidate=20` and are polled every 15 s, so origin load is flat regardless of audience. `/api/live` is `s-maxage=5` and polled every 10 s by every guided sitter — also flat. But `/api/live` runs up to four queries per miss (keys, hours, claim, stopped), and `/api/admin` GET does an N+1 of `auth.admin.getUserById` per application and per guide, polled every 10 s by each open admin tab.
Fix: fold `stopped_at` into the first `stream_keys` select; in admin, select emails with one `auth.users` join via an RPC, or cache per request.

**3.3 `/api/world` aggregates in JavaScript over up to 5,000 rows every 10 s, with no `order`.** — Low
`app/api/world/route.ts`
Why it matters: fine to a few thousand placed heartbeats an hour; past the `.limit(5000)` the truncation is arbitrary (no `order by`), so the busiest cells can be the ones dropped. The route's comment already names the RPC as the fix.
Fix: `group by cell_lat, cell_lon` in SQL (an RPC) when `placed` first approaches 5,000; add `.order('last_seen', { ascending: false })` now so truncation sheds the stale.

**3.4 Row growth is bounded and pruned.** — (no action)
`supabase/migrations/20260903193000_schedule_prune_heartbeats.sql`
Verified: `pg_cron` at :07 hourly deletes heartbeats older than two days; `live_hours` grows one row per live hour (negligible); `sittings` grows with real use and is indexed `(user_id, started_at desc)`; `email_codes` is one row per address, overwritten. Nothing is unbounded.

**3.5 The live video path scales with the Hetzner box, not with Vercel.** — Medium
`infra/mediamtx/mediamtx.yml`, `infra/mediamtx/README.md`
Why it matters: one CPX12 (1 vCPU, 2 GB) serves HLS directly to every viewer with 2 s segments; at a few hundred concurrent viewers the box's bandwidth and CPU are the limit, and there is no CDN in front. Acknowledged in `plans/live-video.md` as future work; stated here because it is the one component with no edge cache.
Fix: put Cloudflare (or Bunny) in front of `LIVE_HLS_BASE` for the `.m4s`/`.m3u8` paths before the first announced guided hour.

---

## 4. Maintainability and changeability

**4.1 `Journey.tsx` is the god component.** — High
`components/Journey.tsx` (741 lines, 15 props, 8 `useState`, 9 custom hooks, 6 effects)
Why it matters: the stage machine (rail / sitting / finished), the throw animation, presence, live video, the wake lock, fullscreen, profile, origin, the usual-sitting logic and the account corner all meet here; every feature since 14 September has been added to it, and `Entry` passes it everything `useAuth` returns as separate props. Changing the sitting means reading all 741 lines; a new screen means another prop and another effect in the same file.
Fix: lift `auth` callbacks into one object prop; move the sitting's start/stop (`begin`, `endEarly`, bell scheduling, wake lock) into a `useSitting` hook; move stage transitions into a reducer in `lib/journey.ts` where they can be tested.

**4.2 The other large components follow the same pattern.** — Medium
`components/Account.tsx` (513 lines, 11 `useState`), `components/AccountCorner.tsx` (498, 13), `components/Pond.tsx` (584), `components/audio.ts` (582), `lib/fish.ts` (586), `lib/pond.ts` (435), `components/Streaming.tsx` (265, 13 `useState`)
Why it matters: thirteen independent booleans in one component is a state machine written as flags; the combinations nobody intended are reachable. `Pond.tsx` and `audio.ts` are long for a defensible reason (one canvas loop, one graph) and `fish.ts`/`pond.ts` are pure and tested, so they are less of a worry than the two account files.
Fix: `useReducer` with a discriminated union for `Account` and `Streaming`; nothing else needs touching now.

**4.3 Documentation is the project's greatest strength and its largest drift risk.** — Medium
`context/ARCHITECTURE.md` (1,778 lines), `context/PRODUCT.md` (754), `DESIGN.md` (1,096), plus 600–900-word header comments in most files
Why it matters: the writing is genuinely excellent and most of it is true, but it is already wrong in places the code moved past — §12 lists `components/Home.tsx`, `Bowl.tsx`, `Wordmark.tsx`, `useCount`, `useRoom` and `/world`, none of which exist; §9's "three files" seam was not the one used; §15 still says `main` serves a holding page; `PRODUCT.md` §5 says the beds are synthesised and, three paragraphs later, that they are recordings. The rule "fix it in the same commit" is good; it is not being kept, and the volume makes checking it a job in itself.
Fix: cut §12 to a generated tree (`tree -L 2` in a script), move narrative history (the bell rewrites, the 7 September evening) to `docs/`, and keep `context/` to what is true *now*; a `tests/docs.test.ts` that asserts every backticked path in `context/*.md` exists would have caught all six.

**4.4 Dead code.** — Low
`lib/candle.ts`, `lib/dial.ts`, `lib/earthView.ts` (no importers outside their tests), `components/useSession.ts`, `app/api/session/route.ts`, `lib/room.ts` (referenced in comments and `globals.css` tokens, not imported)
Why it matters: each carries a test that passes and a header comment that reads as current, so a reader cannot tell live from dead without grepping; `candle.ts`/`dial.ts` are from the ring that was deleted on 22 September.
Fix: delete them and their tests in one commit; `portability.test.ts` will still cover what remains.

**4.5 The migration history and the folder disagree, and nothing checks the database against the code.** — Medium
`supabase/migrations/`, `CLAUDE.md` ("never `db push`")
Why it matters: admitted in `CLAUDE.md` and `ARCHITECTURE.md` §15, and the workaround (`db query --linked -f`) works, but it means (a) `db push` is a loaded gun for any new contributor, (b) a deploy can reach `main` expecting a column that was never applied, and nothing — not CI, not a startup check — would say so until a route 500s and degrades silently to "no count".
Fix: run `supabase migration repair --status applied` once (Tenzing's call, as noted), then add a tiny `/api/health` that selects one row from each table the routes depend on and is hit by Vercel's deploy check.

**4.6 No linter.** — Medium
`package.json` (`"lint": "next lint"`), no ESLint config or dependency
Why it matters: five `eslint-disable-next-line react-hooks/exhaustive-deps` comments exist for a rule that has not run since Next 16 removed `next lint`; stale-closure bugs in hooks are exactly what that rule catches and what this codebase has the most of (`Journey`, `useMix`, `useSyncPreferences`).
Fix: `npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-config-next`, flat config, `"lint": "eslint ."`; expect a few real findings on the first run.

**4.7 Types are good; a few seams are stringly typed.** — Low
`app/api/admin/route.ts` (`body?.action` switch on untyped strings), `components/Admin.tsx` (`reply.applications as Application[]`), `components/useLive.ts`, `components/useWorld.ts` (response shapes cast, not validated)
Why it matters: `tsconfig` is `strict` with `noUncheckedIndexedAccess` and there is not one `any` in the tree, which is rare; but the wire shapes between routes and hooks are asserted on both sides rather than shared, so a renamed field compiles on both ends and fails at runtime.
Fix: export the response type from each route file and import it in its hook (`SessionWire` in `lib/session.ts` already does this; copy the pattern).

---

## 5. Testing gaps

**5.1 What is tested is tested well.** — (no action)
`tests/` — 26 files, 366 tests, pure functions only
`lib/` is covered nearly file-for-file (`beds`, `pebble`, `types`, `supabase` excepted, all data or I/O); `caps.test.ts` and `type.test.ts` enforce design rules by reading source; `portability.test.ts` enforces the `lib/` boundary. Fast, deterministic, no mocks. This is the right foundation.

**5.2 Zero tests for any route handler.** — High
`app/api/**/route.ts` (12 routes, ~1,300 lines)
Why it matters: every security decision in §2 — who may delete an account, who is an admin, whether a code is spent, whether a hook may mark a stream live — lives in these files and is verified only by hand against the live project (the docs describe doing so, with care). A refactor that drops one `.is('revoked_at', null)` passes `tsc` and 366 tests.
Fix: `node --test` can import the route modules directly; pass a fake Supabase client (a small chainable stub returning canned `{ data, error }`) and assert status codes for: no token, bad token, non-admin, revoked key, wrong code, fifth attempt. Twenty tests would cover the dangerous paths.

**5.3 Zero tests for hooks or components.** — Medium
`components/use*.ts` (19 hooks), `components/*.tsx`
Why it matters: `usePresence`'s visibility/sitting rules, `useSyncPreferences`' "server wins" rule, `usePractice`'s union-and-push, `useMix`'s muted/unmuted state and `useAuth`'s hash-change path are the behaviours users notice and are exercised only in the browser. The `CLAUDE.md` rule that browser testing is for "big things" is right *because* it is expensive — which is the argument for cheap tests here, not against them.
Fix: `@testing-library/react` + `happy-dom` under `node --test` for the five hooks named; mock `fetch` and `localStorage`, assert the sequence of requests.

**5.4 No end-to-end test and no CI.** — High
(no `.github/workflows`, no `vercel.json` checks, no Playwright)
Why it matters: tests run when someone remembers to run them; `main` auto-deploys whatever is merged. The repo's own history has the shape of bug this invites — `prune_heartbeats` was "scheduled" for a week without running, the confirm-signup template shipped without `{{ .Token }}`, two CC BY recordings reached `main` uncredited.
Fix: one GitHub Actions workflow on push: `npm ci && npx tsc --noEmit && npm test && npm run build`; protect `main` so a failed check blocks the merge. One Playwright smoke test (`/` renders the arrival; `/api/count` returns JSON) against the preview URL is the second step.

**5.5 The live pipeline is tested only by streaming into it.** — Medium
`lib/live.ts` (tested), `app/api/live/*` (not), `infra/mediamtx/hook.sh` (not)
Why it matters: `onAir`, `authCheck`, `sinceFrom` are covered; the route that composes them, the claim race and the shell script's 410-kick path are not, and the first real guided hour is 9 November.
Fix: route tests as in 5.2; for `hook.sh`, a `bats` or plain `sh` test with a stub `curl` on `PATH` asserting the `online`/`seen`/`offline` sequence and the kick on 410.

---

## 6. Performance

**6.1 Bundle discipline is good.** — (no action)
`lib/supabase.ts` (dynamic `import()`), `components/Journey.tsx` (`CHUNKS`, `warm()`), `components/LiveStream.tsx` (`hls.js` lazy), `components/useWorld.ts`/`Entry.tsx` (demo fixtures behind `NODE_ENV`)
Verified: Supabase, hls.js, every post-arrival screen and the demo fixtures are off the critical path, and the reasons are written down. The one font is subsetted. This is better than most production Next apps.

**6.2 The whole tree re-renders four times a second.** — Medium
`components/useClock.ts`, `components/Journey.tsx`
Why it matters: `useClock` sets two state values every 250 ms at the root of `Journey`, so `Journey` and every child that is not memoised re-render 4×/s for the whole visit — and none are memoised (`React.memo` is not used anywhere; four `useMemo` calls in total). `Pond` is safe (its canvas loop reads refs), and `useMix` guards itself with a fingerprint, but `Rail`, every `Screen`, `AccountCorner` and `Sitting` reconcile every tick. Cheap on a laptop; measurable on a five-year-old phone that is also decoding HLS.
Fix: hand `now` to the two or three components that read it through a small context or a `useSyncExternalStore` store; memo `Rail` and `AccountCorner`.

**6.3 The pond's `requestAnimationFrame` loop never idles.** — Low
`components/Pond.tsx` (`loop`)
Why it matters: under normal motion the canvas redraws every frame from arrival to ending, including while a static sentence sits over still water; reduced-motion users get a single draw, which shows the idle path already exists.
Fix: stop the loop when every ring and stone has settled and no fish is moving; restart on the next `pond-redraw` event or state change.

**6.4 Audio graph lifecycle.** — Medium
See 1.2. Also: beds are fetched and decoded lazily on first gain (good), buffers are cached per page (good), but the decoded buffers map in `mix.ts` is module-level and never cleared, which is nine MP3s decoded to PCM (~100 MB at 48 kHz stereo for three-minute loops) held for the page's life. Acceptable on desktop; on an iPhone in a long tab it is the first thing jettisoned.
Fix: none urgent; note it, and stop the sources (1.2).

**6.5 Client polling is correctly throttled.** — (no action)
`components/usePresence.ts`, `useWorld.ts`, `useLive.ts`
Verified: all three stop on `visibilitychange` hidden (presence excepted while sitting, with `keepalive`), resume on visible, and `useWorld`/`useLive` are gated on the sitting mode so a solo sitter costs the edge nothing.

---

## 7. Operational

**7.1 `main` auto-deploys and nothing stands between a merge and production.** — High
`CLAUDE.md` (Branches), no `.github/`, no Vercel deploy checks
Why it matters: the process rule ("ask Tenzing first, every time") is the only gate; there is no automated typecheck, test, or build check before a deploy, and no smoke test after. The release commits on `main` show the rule is followed — this is about what happens the one time it is not, or when a dependency bump changes behaviour under a green build.
Fix: see 5.4; additionally enable Vercel's "Deployment Protection → require passing checks" once the workflow exists.

**7.2 No monitoring, no alerting, no error reporting.** — High
(no Sentry/Logflare/Vercel log drain; routes `catch {}` and return 200)
Why it matters: every route swallows its error and answers a degraded 200 by design, so a wrong `SUPABASE_SERVICE_ROLE_KEY`, a dropped column or a Supabase outage looks, from outside, like "nobody is sitting right now" — forever, with no page to anyone. The project knows this shape (`prune_heartbeats` ran for zero days while "scheduled"). Supabase's 24-hour auth-log retention on the free tier means a lost sign-up on a Saturday is unprovable by Monday.
Fix: `console.error` the caught error in every route's `catch` (Vercel keeps function logs; today nothing is logged at all), add a free Sentry DSN for client and routes, and one uptime check (Better Stack / UptimeRobot free) on `/api/count` expecting `count` to be a number.

**7.3 Environment variables are handled correctly but are a single point of silent failure.** — Medium
`.env.example`, `lib/supabase.ts`, `ARCHITECTURE.md` §15
Verified: names are documented, the service key is server-only, preview vars are scoped to `dev` (admitted workaround). Not covered: a missing or wrong var on a new branch or a rotated key produces the same silent degradation as 7.2; `LIVE_HLS_BASE` unset in production is the intended "no live video" state and also the symptom of a misconfiguration.
Fix: the `/api/health` route from 4.5, and a build-time assertion (`scripts/check-env.mjs` in `prebuild`) that the public vars exist.

**7.4 The live-video server is hand-built infrastructure with one copy of everything.** — Medium
`infra/mediamtx/README.md`, `infra/mediamtx/hook.sh`
Why it matters: one Hetzner box, configured by following a README, with secrets in `/etc/mediamtx.env`, a hand-timed cert copy, and a pinned binary updated "after reading its changelog". Documented well; reproducible by one person in an afternoon; not reproducible by a script, and not monitored.
Fix: a `cloud-init` or Ansible file that produces the box from the README, and a heartbeat from `hook.sh` to a dead-man's-switch (Healthchecks.io free) so a silent box is noticed.

**7.5 The mobile app is a one-screen spike, and `lib/` is not yet proven portable at runtime.** — Low
`mobile/App.tsx`, `mobile/metro.config.js`, `tests/portability.test.ts`
Verified: `mobile/` imports `lib/format.ts` and `lib/timer.ts` in place; the portability test bans browser globals statically; the spike's own logic (a `setInterval` plus a `setTimeout` for the bell) is the right first question (does iOS keep the timer honest while locked?). Not yet true: anything in `lib/` using `Intl` with options iOS's JSC/Hermes lacks, or `crypto.randomUUID`, would pass the test and fail on device. `mobile/AGENTS.md` is Expo's generic template and does not mention this repo's rules.
Fix: keep going; add `mobile/` to the typecheck (`tsc -p mobile`) in the CI from 5.4, and replace `AGENTS.md`'s boilerplate with the three rules that matter here (read `lib/` in place, never copy; no browser globals; Expo Go limits).

**7.6 Dependencies are pinned loosely to very new majors.** — Low
`package.json` (`next ^16.3.2`, `react ^19.2.8`, `tailwindcss ^4.3.3`)
Why it matters: caret ranges on a framework that the repo's own `CLAUDE.md` block says "is NOT the Next.js you know" means `npm install` on a fresh clone can pull a different minor than the one that was tested; there is a lockfile, so this only bites on an explicit update.
Fix: `npm ci` everywhere (CI and Vercel default to it), and bump deliberately.

---

## Overall verdict

This is professional-grade work by a careful engineer, with two large exceptions that are about process rather than code. The architecture is unusually well reasoned for its size: the "almost no state" observation is correct and everything follows from it — sessions as a pure function of the clock, polling an edge-cached count instead of Realtime presence, `localStorage` primary with the database as a sync target, the bell on the audio clock, server-derived and grid-snapped location, hard account deletion through the one route that needs the service role. Input validation on every route is genuinely good; the RLS policies are right and were tested the right way; secrets never travel in URLs; the bundle is split with intent and the reasons are written beside the code. `lib/` is pure, ~1,400 lines, and covered by 366 fast tests, with three meta-tests that enforce design rules by reading source — that is a mature habit. The documentation, when it is right, is the best explanation of a small system I have read in a client repo.

The exceptions. First, **nothing outside `lib/` is tested and nothing runs the tests before a deploy**: twelve route handlers holding every authorisation decision, nineteen hooks holding every user-visible behaviour, and an auto-deploying `main` guarded only by a sentence in `CLAUDE.md`. Second, **the system is designed to fail silently and nobody is listening**: every route catches and returns a degraded 200, no error is logged, and there is no monitoring — so the exact failure mode the design chose (hide the count, keep the candle) is also the failure mode of a misconfigured key, a missing column or an outage, and they are indistinguishable from outside. Those two together mean "is it working?" cannot currently be answered without opening the site and looking. Behind them: one public route that can be abused from a shell today (heartbeat inflation and text injection onto everybody's earth), a 741-line component that every feature now passes through, and documentation that has started to describe a codebase that no longer exists.

**Top five, in order:**

1. **Observability (7.2, 4.5):** `console.error` in every route `catch`, a Sentry DSN, an uptime check on `/api/count`, and a `/api/health` that touches each table. Half a day; turns every item below from "discovered by a visitor" into "paged".
2. **CI and a gate on `main` (5.4, 7.1):** one workflow running typecheck, tests and build; branch protection. Two hours.
3. **Rate-limit and harden `/api/heartbeat` and `/api/signin` (1.1, 2.5):** Vercel Firewall rules first, then a per-IP cap on new anon ids. Half a day. Do this before the first announced guided hour, when the earth has an audience worth vandalising.
4. **Route handler tests (5.2):** a stub Supabase client and twenty tests on the deny paths across `account`, `admin`, `signin`, `live/auth`, `live/hook`. One day; the single biggest reduction in risk per hour of the five.
5. **Split `Journey.tsx` and prune the docs (4.1, 4.3, 4.4):** `useSitting`, an `auth` prop object, a reducer in `lib/journey.ts`; delete `candle`/`dial`/`earthView`/`useSession`/`/api/session`; cut `ARCHITECTURE.md` §12 to a generated tree and add a test that every backticked path in `context/` exists. Two days, and the next feature costs half what it would otherwise.

Fix 1.2 (looping sources never stopped) and 2.3 (service key as HMAC secret) while passing; neither is urgent and both are an hour.
