# Conventions

How the code is written, named and organised, and where the words that are not
code live. Read with `STRUCTURE.md` (what is where) and `TESTING.md` (what is
proven). Judgements here are against the question "would a professional find
this readable, changeable and safe to work in?", not against a style guide.

## 1. Language and compiler settings

- TypeScript throughout, `strict: true` **plus `noUncheckedIndexedAccess`**
  (`tsconfig.json`). The second flag is stricter than most Next.js projects
  bother with; it forces `arr[i]` to be treated as possibly `undefined`. The
  codebase compiles clean under it: `npm run typecheck` passes with zero
  errors as of 3 October 2026.
- Escape hatches are rare: 4 `any` in all of `components/`, `app/`, `lib/`;
  0 `@ts-ignore` / `@ts-expect-error`; 0 `TODO`/`FIXME`/`HACK` markers.
- `allowImportingTsExtensions: true` and `moduleResolution: bundler`, because
  `lib/` files import siblings as `./types.ts` so Node can run the tests
  without a build step (see `TESTING.md`). `mobile/tsconfig.json` mirrors the
  same two strictness flags and the `.ts`-extension setting for the same
  reason.
- `mobile/` is excluded from the root `tsconfig.json`; it has its own
  (`extends: expo/tsconfig.base`, TypeScript 6). Nothing runs that check from
  the root.

## 2. Naming

| Thing | Convention | Example |
|---|---|---|
| React component file | `PascalCase.tsx`, one default-exported component, named the same | `components/Journey.tsx`, `components/Sitting.tsx` |
| Hook | `useX.ts`, named export `useX` | `components/useClock.ts`, `components/usePractice.ts` |
| Non-React platform module in `components/` | `camelCase.ts` | `components/audio.ts`, `components/mix.ts`, `components/liveVideo.ts` |
| Pure library module | `camelCase.ts` in `lib/`, one concern per file | `lib/session.ts`, `lib/clock.ts`, `lib/timer.ts` |
| Test | `tests/<libname>.test.ts` mirroring `lib/` | `tests/session.test.ts` |
| Route handler | `app/api/<name>/route.ts`; helpers shared by routes go in an underscore folder or sibling file | `app/api/heartbeat/route.ts`, `app/api/_email/codes.ts`, `app/api/live/secret.ts` |
| Migration | `supabase/migrations/` — early ones `000N_name.sql`, later ones `YYYYMMDDHHMMSS_name.sql` | `0001_init.sql`, `20261002130000_guides_admin.sql` |
| Constants | `SCREAMING_SNAKE` module-level `export const` | `HOUR_MS`, `SESSION_MINUTES`, `LABEL_MAX`, `MIN_LOGGED_SECONDS` |
| DB row types | `XRow` interface with `snake_case` fields, converted by `fromRow`/`toRow` or `sessionFromRow` into a `camelCase` domain type | `SessionRow` in `lib/session.ts`, `SittingRow` in `components/usePractice.ts` |
| Wire types | `XWire` plus `toWire`/`fromWire` pairs when a `Date` has to cross JSON | `SessionWire` in `lib/session.ts` |
| localStorage keys | `mwm.<thing>` | `mwm.practice`, `mwm.preferences`, `mwm.profile` |

Consistent and predictable. The one soft spot is that `components/` holds
three kinds of file (components, hooks, plain platform modules) in one flat
folder of 59 files; the naming carries the distinction, so it is navigable,
but a newcomer has to learn that `audio.ts` is not a component.

## 3. The three-layer module pattern

This is the load-bearing architectural convention and it is enforced, not
just described.

1. **`lib/` is pure.** No React, no I/O beyond an explicitly passed `fetch`,
   no `Date.now()` in the scheduler (time is a parameter), no browser
   globals. Dependencies are injected: `lib/clock.ts` takes `fetchImpl`,
   `lib/session.ts`'s `resolveSession` takes a `lookup` function. The
   header comment of `lib/session.ts` states the rule in one sentence:
   "Everything here is a pure function of a timestamp."
   `tests/portability.test.ts` fails the suite if any `lib/*.ts` names
   `window`, `document`, `localStorage`, `navigator`, `AudioContext`, etc.
   (3,681 lines, 27 files.)

2. **`components/` is the platform edge.** Hooks wrap every side effect:
   `useClock` wraps `syncClock` + `setTimeout`; `usePractice` wraps
   `localStorage` + Supabase; `useMix`/`audio.ts` own the `AudioContext`.
   Components call hooks and `lib/` functions; they do not reach into
   storage or the network directly. (10,081 lines, 59 files.)

3. **`app/api/` is the server edge.** Route handlers are the only place
   `serviceClient()` from `lib/supabase.ts` is imported. The two Supabase
   clients live in one file with their trust levels spelled out side by side,
   and `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix so Next
   cannot inline it. (1,605 lines, 16 files.)

Verdict: this is exactly how a professional would structure a small
full-stack app, and the portability test is the kind of boundary enforcement
most teams only talk about. The payoff is already visible: `mobile/App.tsx`
imports `lib/` unchanged.

## 4. State management in `components/`

- **No state library.** React `useState`/`useRef`/`useEffect`/`useCallback`
  only. 51 files carry `'use client'`; 19 are hooks.
- **Ownership is per-concern, in a hook, not in a store.** Each hook owns one
  slice (`useClock`, `usePresence`, `usePractice`, `usePreferences`,
  `useProfile`, `useAuth`, `useLive`, `useWorld`…) and `components/Journey.tsx`
  composes them. The result is one large orchestrator (741 lines) holding a
  discriminated-union `Stage` type (`{ kind: 'rail' | ... }`) and passing
  props down. That is a reasonable choice at this size; it would become the
  first refactor target if the app grew another screen or two.
- **Local-first, server as sync target.** `usePractice` and `usePreferences`
  read `localStorage` on mount, write it on every change, and sync to
  Supabase as a union when a `userId` appears. The ordering is stated and
  justified in the hook's header comment.
- **Ref mirrors for stable callbacks**: `entriesRef.current = entries` so
  callbacks can read the latest value without re-creating (`usePractice.ts`
  line 70). Standard idiom, used consistently.
- **Cancellation flags** (`let cancelled = false; return () => { cancelled =
  true }`) on every async effect. Correct, and consistently applied.
- **Code splitting** is explicit: `Journey.tsx` lists the lazy chunks in one
  `CHUNKS` constant with a comment on what is deliberately *not* split and
  why (audio must start synchronously inside a click gesture).
- **Caching the promise, not the client** in `lib/supabase.ts` — a real
  race fix, explained in place.

## 5. Error handling

The house style is **fail soft, in silence, with the reason written next to
the `catch`.** Examples:

- `lib/clock.ts` `syncClock`: any failure returns `false` and leaves the
  offset at zero. "A slightly wrong session time is much better than a broken
  page."
- `app/api/heartbeat/route.ts`: a database failure returns `{ ok: false }`
  with **status 200**, deliberately, "it must never interrupt their session."
- `components/usePractice.ts`: `localStorage` quota/private-mode failures,
  corrupt JSON and failed syncs are all swallowed with a one-line comment
  each saying what state the user is left in.

Every one of the 72 `catch` blocks in `components/` that was sampled carries a
comment. Only 2 `console.*` calls exist across the whole app. There is no
error-reporting service (no Sentry or equivalent), and no `error.tsx`
boundaries were seen.

Verdict: for a meditation page where the worst outcome is interrupting
someone's sitting, prioritising "never throw at the user" is the right call,
and the discipline of annotating every swallow is unusually good. The cost is
observability: when something does go wrong in production nobody will know
unless a user says so. A professional would accept this trade at launch scale
but would want a single reporting sink before the user base grows.

Input validation at the server edge is thorough: `heartbeat` validates the
UUID shape with a regex, derives the hour and the location server-side
rather than trusting the client, and explains the threat model (count
inflation, globe seeding) inline.

## 6. Comments and documentation

### 6.1 In code

`lib/` is 37% comment lines (1,356 of 3,681). Comments are prose paragraphs,
often with ALL-CAPS section headers inside a block comment ("ONE INSTANCE,
DELIBERATELY", "IMPLICIT FLOW, NOT PKCE", "TWO CLOCKS, KEPT APART"). They
record *why*, *what was tried*, *what would break* and *when the decision was
made* ("since 14 September 2026…").

Does this help or hurt?

- **Helps, mostly.** The comments are decision records, not restatements of
  the code. `lib/supabase.ts` explains a token-refresh race, the PKCE
  cross-device failure, and a bundle-size reason for dynamic import in 120
  lines, 90 of them comment. Anyone touching that file will not re-make those
  mistakes. This is better than the industry norm, where such reasoning
  lives in a closed PR nobody re-reads.
- **Hurts at the margins.** A 150-line file that is 60% prose takes longer to
  scan for the actual logic; a few comments embed dates and line counts
  ("72 lines", "1,367 lines") that will drift as the code changes. The
  project rule that documentation must be fixed "in the same commit" applies
  in principle, but a stale number inside a comment is harder to notice than
  one in `context/`.
- One real smell: 6 `// eslint-disable-next-line react-hooks/exhaustive-deps`
  comments exist (e.g. `components/usePractice.ts` line 186) in a repo with
  **no ESLint installed and no working lint command** (see `TESTING.md`).
  They are inert. Either they document a known deps omission, in which case
  they should be ordinary comments, or lint should be made to run so they
  are checked.

### 6.2 Outside code

Writing is routed by the table in `CLAUDE.md`:

| Folder / file | Role | Observed size |
|---|---|---|
| `context/` | Standing truth: `VISION.md`, `PRODUCT.md`, `ARCHITECTURE.md`, `JONNY-IDEAS.md`, `GOOGLE_SIGN_IN.md` | `ARCHITECTURE.md` 1,778 lines, `PRODUCT.md` 754 |
| `plans/` | Active work (15 files, incl. one `.html` spec) | `live-video.md` 617, `launch-readiness.md` 417 |
| `docs/` | Finished plans and delivered client documents (10 files); moved there by `git mv` as the completion signal | — |
| `DESIGN.md` | The visual system as built, tokens in frontmatter | 1,096 lines |
| `CLAUDE.md` | Agent working rules, branch rules, testing-in-browser rules | 258 lines |
| `README.md`, `TIMELOG.md` | Front door; billing record | — |

~7,200 lines of markdown against ~15,400 lines of TypeScript, i.e. roughly
one line of prose per two lines of code. That ratio is far above a normal
project.

Assessment: the **structure** is professional — a clear lifecycle
(`plans/` → `docs/`, with `context/` as the always-true layer) and a stated
rule that a visible change updates `PRODUCT.md` in the same commit. The
**volume** is the risk. `context/ARCHITECTURE.md` at 1,778 lines is longer
than the whole of `lib/` divided by two; keeping a document that size true
by hand on every commit is a maintenance tax that a solo developer with an
AI assistant can pay but a second engineer would struggle with. The honest
read is: this is an exceptionally well-explained codebase whose explanations
would need pruning, not adding to, if the team grew.

### 6.3 Commit messages

194 commits. Subjects are long, full sentences (recent ones 127–219
characters) with **no body** beyond a `Co-Authored-By` trailer; the subject
*is* the changelog entry, e.g. "The iPhone app starts: an Expo app in
mobile/ that reads lib/ in place, and its first screen is the bell-on-a-
locked-phone test".

Helps: `git log --oneline` reads as a product diary, and the SessionStart
hook feeds the last fifteen to every agent session. Hurts: subjects over 72
characters wrap or truncate in GitHub, `git log --graph`, blame tooltips and
most IDE integrations; the usual professional convention is a short subject
plus a wrapped body. Harmless on a one-person project; it would be the first
thing a team asked to change.

## 7. Other enforced conventions (tests as linters)

Three test files guard design rules rather than logic, and they are the
project's substitute for a linter:

- `tests/portability.test.ts` — no browser globals in `lib/`.
- `tests/caps.test.ts` — at most 1 `uppercase` in `components/` (budget is a
  named constant; raising it is "a decision, made here, in the open").
- `tests/type.test.ts` — no arbitrary `text-[…]` sizes, no default Tailwind
  scale, no `--text-*` token under 0.75rem.

Each failure message tells the reader what to do instead and which document
set the rule. This is a genuinely good pattern.

## 8. Things a professional reviewer would flag

Beyond what is said above:

1. **No lint, no formatter config, no CI.** No `.eslintrc`/`eslint.config.*`,
   no `.prettierrc`, no `.editorconfig`, no `.github/workflows`, no pre-commit
   hook. Consistency is maintained by habit and by `CLAUDE.md` saying
   "typecheck, tests and `npm run build` all pass on `dev` before it goes near
   `main`". Nothing enforces that before a push to `main`, which auto-deploys.
2. **`Journey.tsx` at 741 lines** and `useAuth.ts` at 507 are the two files
   most likely to resist change.
3. **Migration naming is split** between `000N_` and timestamp styles, and
   `CLAUDE.md` records that the remote migration history does not match the
   folder at all. Documented and deliberate, but it means `supabase db push`
   is a loaded gun left in the drawer.
4. **`next.config.ts` hard-codes a LAN IP** (`10.216.31.161`) in
   `allowedDevOrigins`. Dev-only, but machine-specific config checked in.

## 9. Summary judgement

Readable: yes, exceptionally so at the file level; the density of
explanation is the project's signature and its main cost. Easy to change:
yes in `lib/` and the hooks, harder in the two large orchestrators.
Consistent: yes, by discipline rather than by tooling. Professional: the
architecture, the trust boundary and the enforced portability rule are
above average; the missing lint/CI/formatter and the prose volume are below
it. See `TESTING.md` for whether it is proven to work.
