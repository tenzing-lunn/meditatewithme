# STACK

Scanned 2026-10-03 on branch `dev`. Source of truth for versions: `package.json`, `mobile/package.json`, `node_modules/next/package.json`.

## Languages and runtime
- TypeScript (strict, `noUncheckedIndexedAccess`) everywhere: web, `lib/`, tests, mobile. No JS app code; `scripts/*.mjs` are Node ESM tooling.
- Web: Node (types `@types/node ^22`), React 19.2 (`react ^19.2.8`), React Compiler not used on web.
- Mobile: Hermes via React Native 0.86.3.
- SQL (Postgres on Supabase): `supabase/migrations/`.
- Shell: `infra/mediamtx/hook.sh`, `.claude/hooks/*.sh`.

## Web framework: Next.js 16.3.2, App Router
- `next ^16.3.2` (installed 16.3.2), Turbopack (`turbopack.root` pinned in `next.config.ts`).
- **This Next has breaking changes vs. training data.** Before writing Next code read `node_modules/next/dist/docs/` (`01-app/`, `02-pages/`, `03-architecture/`, `04-community/`). `next lint` script exists in `package.json` but there is no ESLint config or dep; do not rely on it.
- No `middleware.ts`/`proxy.ts`, no `vercel.json`, no server actions, no Server-side Supabase sessions. All screens are client components behind one server `app/page.tsx`.
- Route handlers in `app/api/**/route.ts`; all `export const dynamic = 'force-dynamic'`; caching is done with explicit `Cache-Control` / `CDN-Cache-Control` headers, not Next data cache.
- Fonts: `next/font/google` Newsreader only (`app/layout.tsx`); everything else is the system sans.
- `app/opengraph-image.tsx`, `app/apple-icon.tsx` use Next image generation.
- `allowedDevOrigins` in `next.config.ts` allows `127.0.0.1` (guest-view testing origin).
- Path alias `@/*` -> repo root (`tsconfig.json`). `mobile/` is excluded from the web tsconfig.

## Styling
- Tailwind CSS 4 (`tailwindcss ^4.3.3`, `@tailwindcss/postcss ^4.3.3`), `postcss.config.mjs`, tokens in `app/globals.css`. Visual rules in `DESIGN.md` (read before touching visitor-facing UI).

## Key runtime dependencies
Web (`package.json`):
- `@supabase/supabase-js ^2.45.0` (always loaded via dynamic `import()` in `lib/supabase.ts`)
- `hls.js ^1.7.3` (dynamic import in `components/LiveStream.tsx`)
- `next`, `react`, `react-dom`

Mobile (`mobile/package.json`, separate lockfile and `node_modules`):
- `expo ~57.0.26`, `expo-audio ~57.0.5` (background playback plugin enabled), `expo-asset ~57.0.18`, `expo-status-bar ~57.0.1`, `react 19.2.3`, `react-native 0.86.3`, dev `typescript ~6.0.3`.
- `mobile/AGENTS.md`: Expo changes every SDK; fetch `https://docs.expo.dev/versions/v57.0.0/` before touching Expo APIs; use `npx expo install`.
- No audio engine abstraction: web Web Audio code (`components/audio.ts`, `components/mix.ts`) is NOT shared; mobile plays `mobile/assets/sounds/{rain,drum}.mp3` with `expo-audio`.

No UI library, state library, ORM, or test framework deps. Dependencies are deliberately minimal (five runtime deps on web).

## Build, test, tooling (`package.json` scripts)
| Script | Does |
|---|---|
| `npm run dev` / `build` / `start` | Next dev/build/start |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `node --test --experimental-strip-types "tests/*.test.ts"` (Node built-in runner, no Jest/Vitest) |
| `npm run contrast` | `scripts/contrast.mjs` re-measures colour contrast |
| `npm run timelog` | `scripts/timelog.mjs` (human-only, billing; agents must not run with numbers) |
| `npm run live:key` | `node --env-file=.env.local scripts/live-key.mjs` (create/list/revoke stream keys) |

Other scripts: `scripts/build-land.mjs` (-> `public/earth/land.json`), `scripts/build-sounds.mjs` (loudness-matched beds to -16 LUFS), `scripts/places.mjs` (-> `public/places.txt`).

Because tests run via Node type-stripping, `lib/*.ts` imports siblings with explicit `./x.ts` extensions (`allowImportingTsExtensions`); keep that in `lib/` (mobile tsconfig also sets it).

Gate before `dev` -> `main`: typecheck + tests + `npm run build`. `tests/portability.test.ts` fails the build if `lib/` touches browser globals.

Mobile commands (from `mobile/`): `npm start`, `npm run ios`, `npx tsc --noEmit`, `npx expo-doctor`. Metro watches `../lib` (`mobile/metro.config.js`).

## Config files
- `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `.gitignore`, `.env.example` (names only; `.env.local` is gitignored, never commit/read it)
- `mobile/app.json`, `mobile/metro.config.js`, `mobile/tsconfig.json`
- `.vercel/project.json` (gitignored link), `supabase/.temp/` (gitignored link state)
- `.claude/settings.json` (SessionStart git context, timelog hooks), `.claude/launch.json` (dev server on :3000)
- `infra/mediamtx/mediamtx.yml` (video server config)

## Environment variable names (values never in repo)
Server-only unless `NEXT_PUBLIC_`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser-safe, RLS-protected)
- `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS; also the HMAC secret for email-code hashes and account stream keys in `app/api/_email/codes.ts` and `app/api/live/secret.ts`; rotating it changes both)
- `RESEND_API_KEY` (email codes; absent -> feature answers "unavailable")
- `LIVE_AUTH_SECRET`, `LIVE_HOOK_SECRET` (MediaMTX -> site callbacks)
- `LIVE_HLS_BASE` (absent -> `/api/live` returns `{live:null}`), `LIVE_INGEST_HOST` (printed by `live:key` only)
- Platform-provided: `VERCEL_PROJECT_PRODUCTION_URL` (`app/layout.tsx` metadataBase), `NODE_ENV` (gates `components/Demo.tsx`)
- MediaMTX process env (not the site): `LIVE_HOOK_URL`, `LIVE_HOOK_SECRET`, `LIVE_SERVER_NAME`, `MTX_AUTHHTTPADDRESS`

## Hosting
Vercel (Hobby), GitHub auto-deploy: `main` = production, `dev` = preview. Supabase hosted Postgres/Auth, project ref `qcwgquwjazhsettuemgt`. Preview env vars are scoped to the `dev` branch only.
