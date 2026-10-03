# Hardening — from the 3 October 2026 review

`.planning/codebase/CONCERNS.md` is a senior-engineer read of the whole
codebase, written 3 October 2026. Its verdict: the code is professional-grade
and the architecture unusually well reasoned; the two large gaps are process
— nothing outside `lib/` was tested and nothing gated a deploy — and
observability — every route fails silently by design and nobody was
listening. This plan is what was done about it that day, what only Tenzing
can do (dashboards and repository settings), and what is deliberately left.

## Done on `dev`, 3 October 2026

- **Every route `catch` reports.** `app/api/_report.ts`; the callers are
  answered as before. Vercel keeps the log lines. (CONCERNS 7.2)
- **`GET /api/health`** — env names, database, every table a route depends
  on; 200 or 503 with the failing names. Edge-cached 30 s. (4.5, 7.3)
- **Rate limits** on `/api/heartbeat` (120 beats/min and 50 distinct anon
  ids/hour per address), `/api/signin` and `/api/account/emails` (5 code
  requests/min per address). `lib/limit.ts`, pure and tested; in-memory per
  instance. (1.1, 2.5)
- **Route tests.** `tests/api/`: 54 tests over heartbeat, signin, admin,
  account, account/emails, account/stream, live/auth, live/hook, health and
  count's degradation. `npm test` runs them with the unit tests. (5.2, 5.5)
- **CI.** `.github/workflows/ci.yml`: typecheck, lint, tests, build. (5.4)
- **Lint works again.** `next lint` was gone with Next 16; `eslint.config.mjs`
  and `npm run lint` restore the same rule set. Zero errors; 33 warnings from
  the React Compiler rules, deliberately warnings (see the config). (4.6)
- **`stop()` ends the looping beds** instead of leaving them rendering into a
  detached graph. `components/mix.ts`. (1.2, 6.4)
- **Dead code gone.** `lib/candle.ts`, `lib/dial.ts`, `lib/earthView.ts`
  and their tests (the ring deleted 22 September), `components/useSession.ts`
  and `app/api/session/route.ts` (the `sessions` seam §9 did not take).
  Verified by grep that nothing imported them, including `mobile/`.
  `lib/room.ts` stays: `app/layout.tsx` inlines its rule and
  `tests/room.test.ts` guards the pair. (1.8, 4.4)
- **The docs name files that exist.** `tests/docs.test.ts` checks every
  backticked path in `CLAUDE.md`, `DESIGN.md`, `README.md` and `context/`;
  §12 of `ARCHITECTURE.md` was rewritten from the tree and two `Home.tsx`
  references corrected. (4.3)
- **`main` is locked behind CI.** Tenzing made the repository public on
  3 October 2026 (branch protection is not offered on a free private repo)
  and the rule was set the same day: the `check` job from
  `.github/workflows/ci.yml` must have passed on the commit, the branch
  must be up to date, no force-pushes, no deletion. A fast-forward of `dev`
  onto `main` carries `dev`'s green run with it; a merge *commit* would not,
  so merge fast-forward or through a pull request. (5.4)

## Tenzing's, outside the repository

Tried from the agent on 3 October 2026, with these results:

1. ~~Require CI before `main`~~ — done, above.
2. **Vercel Firewall rate-limit rules** — `/api/heartbeat` 120/min per IP,
   `/api/signin` and `/api/account/emails` 5/min per IP. The Vercel MCP tool
   rejected every rate-limit payload (its schema is mislabeled) and the
   firewall config does not exist until it is switched on once in the
   dashboard. Clicks: vercel.com → *meditatewithme* → **Firewall** →
   *Configure* → *Add rule*: name, *If* path equals `/api/heartbeat` and
   method equals POST, *Then* **Rate limit**, 120 requests per 60 s per IP,
   action Deny → Save. Repeat for the other two paths with 5 per 60 s.
   **Publish** the config. Rate limiting needs the Pro plan. **Decided
   3 October 2026: not yet.** The in-code limits stand alone; the trigger
   for Pro is 429s or abuse in the logs, a paying client with uptime terms,
   or the custom domain carrying real traffic. None is true today.
3. **Vercel → Deployment Protection**: require passing checks before a
   production deployment is promoted. With `main` locked (above), nothing
   reaches `main` without a green run, so this adds little; skip with (2).
4. ~~An uptime monitor~~ — done 3 October 2026: UptimeRobot (free, signed
   in with Tenzing's GitHub) checks the live site every 5 minutes and
   emails 10zinglunn@gmail.com when it stops answering 200.
   dashboard.uptimerobot.com; the monitor is still *named*
   `meditatewithme.vercel.app/api/health` from its first minute, though its
   URL is below — rename it when the edit page is next open. One-minute
   checks are a paid tier; five is enough for a site with no uptime terms.
   **It watches `/api/count` for now**, which exists on `main` and touches
   the database; `/api/health` is only on `dev` and answered 404 live.
   **When `dev` is merged to `main`, change the monitor's URL to
   `https://meditatewithme.vercel.app/api/health`** (Edit → URL to monitor)
   so a missing table or env var is caught too, not only a dead site.
5. **Optional, when wanted:** a Sentry DSN — `_report.ts` is the one place
   to add it for the routes; client errors need `@sentry/nextjs`.
6. **Healthchecks.io** ping from `infra/mediamtx/hook.sh` so a silent box is
   noticed (CONCERNS 7.4).

## Not done, and why

- **Splitting `Journey.tsx`** (741 lines) — the right next piece of work, and
  a two-day one with the preview open; not something to land in the same
  batch as security changes, where a regression could not be bisected. The
  32 lint warnings are a map of where to start: `useSitting`, an `auth` prop
  object, a reducer in `lib/journey.ts`. (4.1, 6.2)
- **`APP_HMAC_SECRET`** in place of the service-role key for email codes and
  stream keys (2.3). Needs a new variable set in Vercel *before* the deploy,
  and re-issues every guide's key; coordinate, don't surprise.
- **Smaller correctness items** from CONCERNS §1: `useClock` on
  `visibilitychange` (1.3), the hour claim out of the cached GET (1.4),
  `email_codes` keyed on `(email, purpose)` (1.5, a migration), an
  `app/error.tsx` (1.7). Each an hour; none urgent.
- **`supabase migration repair`** — Tenzing's call, as `CLAUDE.md` says.
- **Security headers** (2.7) and an **admin audit table** (2.4).

When the six dashboard items are done, move this
file to `docs/` and fold what remains into `context/ARCHITECTURE.md` §15,
which already describes the parts that are built.
