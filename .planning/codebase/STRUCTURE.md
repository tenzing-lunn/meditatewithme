# STRUCTURE

Scanned 2026-10-03.

## Layout
```
app/                     Next App Router (server shell + route handlers)
  layout.tsx page.tsx globals.css      root layout, the one page, Tailwind tokens
  privacy/ terms/ credits/             document pages (use components/Document.tsx)
  admin/ live-test/                    admin page; dev video harness
  opengraph-image.tsx apple-icon.tsx bowl.svg
  api/
    time count session world origin    shared-hour reads (route.ts each)
    heartbeat/                         presence write
    signin/ account/ account/emails/ account/stream/ admin/
    live/ (route.ts, auth/, hook/, secret.ts)
    _email/codes.ts                    private helpers (underscore = not a route)
components/              React components, hooks (use*.ts), audio/mix engines, dev demos
lib/                     PURE domain logic (portable; shared with mobile/)
tests/                   one <lib-module>.test.ts per lib file, plus portability/caps/type
supabase/migrations/     forward-only SQL (apply with `supabase db query --linked -f`)
infra/mediamtx/          MediaMTX config + hook.sh + README (live video server)
mobile/                  Expo app (own package.json, node_modules, lockfile); App.tsx, assets/sounds
scripts/                 Node .mjs tooling (build-land, build-sounds, places, contrast, live-key, timelog)
public/                  earth/ (land.json, relief.jpg), sounds/*.mp3, images/, places.txt, flame.png
context/                 standing project knowledge (VISION, PRODUCT, ARCHITECTURE, JONNY-IDEAS, GOOGLE_SIGN_IN)
plans/                   active plans (git mv to docs/ when finished)
docs/                    archive: finished plans and delivered client documents
.claude/                 settings.json, hooks/ (timelog), launch.json
.planning/codebase/      these generated maps
DESIGN.md CLAUDE.md README.md TIMELOG.md   root docs (README stays at root)
```
Generated/ignored: `.next/`, `node_modules/`, `.vercel/`, `.timelog/`, `.impeccable/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`, `.env.local`.

## Key file locations
| Need | File |
|---|---|
| App root / all shared hooks | `components/Entry.tsx` |
| The rail, stone/pond, sitting orchestration | `components/Journey.tsx`, `components/Rail.tsx`, `components/Pond.tsx`, `components/Sitting.tsx` |
| Screen order and rules | `lib/journey.ts` |
| Hour/session maths | `lib/session.ts`; clock `lib/clock.ts`; timer and shared bell `lib/timer.ts` |
| Supabase clients (trust boundary) | `lib/supabase.ts` |
| Types, bell kinds, track slugs | `lib/types.ts` |
| Web Audio engine / mixer / bed sources | `components/audio.ts`, `components/mix.ts`, `lib/beds.ts` |
| Auth | `components/useAuth.ts`, `lib/authErrors.ts`, `lib/authRedirect.ts`, `lib/emailCode.ts` |
| Presence / geography | `components/usePresence.ts`, `lib/geo.ts`, `app/api/heartbeat/route.ts` |
| Live video rules | `lib/live.ts`, `app/api/live/**`, `infra/mediamtx/` |
| Design system | `DESIGN.md`, `app/globals.css` |
| Env names | `.env.example` |
| Mobile entry | `mobile/App.tsx`, `mobile/metro.config.js` |
| Portability guard | `tests/portability.test.ts` |

## Naming conventions
- Components: `PascalCase.tsx` default export, one per file (`Journey.tsx`, `NameScreen.tsx`).
- Hooks: `useThing.ts` in `components/` (named export `useThing`), even when no JSX.
- Non-React component-folder modules: lowercase camel (`audio.ts`, `mix.ts`, `controls.ts`, `liveVideo.ts`).
- `lib/`: lowercase camel single-noun modules (`session.ts`, `timer.ts`), named exports, imports of siblings written `./x.ts`.
- Tests: `tests/<module>.test.ts` mirroring `lib/<module>.ts` (Node `node:test` + `node:assert/strict`, run with `--experimental-strip-types`).
- Route handlers: `app/api/<name>/route.ts` exporting `GET/POST/PUT/DELETE` and `export const dynamic = 'force-dynamic'`; private helpers beside them (`_email/`, `secret.ts`).
- Migrations: early `000N_name.sql`, then `YYYYMMDDHHMMSS_name.sql`; tables plural snake_case; RLS enabled in the same file.
- Storage keys: `mwm.<thing>` in localStorage.
- Path alias `@/` for web code; `mobile/` uses relative `../lib/x.ts`.

## Where to add new code
- New pure rule/calculation: `lib/<name>.ts` + `tests/<name>.test.ts`. No browser globals; inject platform values. Check `npm test` (portability test).
- New screen on the rail: add the screen to `lib/journey.ts` (`SCREENS`/`screensFor`) with a test, a component in `components/`, wire it in `components/Journey.tsx`.
- New browser/platform behaviour (storage, timers, audio, network): a `components/use<Name>.ts` hook; call it from `Entry.tsx` if shared by several screens, else from the one component.
- New server endpoint: `app/api/<name>/route.ts`; use `serviceClient()` there only; set explicit cache headers; return a valid shape on failure; validate caller with `callerOf()` (and `admins` for admin).
- New table or column: new dated file in `supabase/migrations/`, RLS on, apply via `supabase db query --linked -f`, then verify with a second query; update `context/ARCHITECTURE.md` and `PRODUCT.md` if visitor-visible.
- New env var: add the name to `.env.example` (no value), set in Vercel for Production and `dev` Preview. Never prefix a secret with `NEXT_PUBLIC_`.
- Static page: `app/<name>/page.tsx` using `components/Document.tsx`.
- Dev-only visual fixture: extend `components/Demo.tsx` behind the `NODE_ENV === 'development'` dynamic import.
- iPhone app work: `mobile/` only; import pure `lib/` modules by relative path; do not edit `components/` for it; read Expo v57 docs first (`mobile/AGENTS.md`).
- Live video infra: `infra/mediamtx/`; server-side rules stay in `lib/live.ts`.
- Plans in `plans/`; when finished `git mv` to `docs/`. Standing knowledge into `context/`. Work on `dev`; never commit to `main`.
