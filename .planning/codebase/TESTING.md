# Testing

What is proven, what is not, and how to run it. All results below are from
real runs on 3 October 2026 from the repo root on `dev` at `ba85eeb`.

## 1. Results of this run

| Command | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | **Pass.** 0 errors, 0 warnings. |
| `npm test` | **Pass.** 366 tests in 93 suites across 26 files, 0 failed, 0 skipped, 1.14 s wall. 26 Node warnings (see §5). |
| `npm run lint` (`next lint`) | **Broken.** Exits with `Invalid project directory provided, no such directory: .../lint`. No ESLint is installed; see §6. |

Not run, per instruction: `npm run build`, any dev server, anything in
`mobile/`.

## 2. Framework and runner

- **Runner: Node's built-in `node:test`**, no Vitest/Jest. The script is
  `node --test --experimental-strip-types "tests/*.test.ts"` (`package.json`).
  Node strips the types and runs the `.ts` files directly, which is why
  `lib/` imports siblings with an explicit `.ts` extension and why
  `tsconfig.json` has `allowImportingTsExtensions`.
- **Assertions: `node:assert/strict`.** Imports look like
  `import { test, describe, beforeEach } from 'node:test'`.
- **Zero devDependencies for testing.** The devDependency list is TypeScript,
  Tailwind and type packages only. There is no `@testing-library/*`,
  no `jsdom`, no `msw`, no coverage tool.

Verdict: the choice is unusual and, for what is being tested, good. The suite
runs in about a second with nothing to install or configure, and it cannot
rot through a test-framework major version. The cost is that it can only
test what runs in plain Node, which fixes the shape of the coverage (§4).

## 3. Structure

`tests/` mirrors `lib/` one-to-one: `tests/<name>.test.ts` tests
`lib/<name>.ts`. 23 of 27 `lib/` files have a matching test file. Three more
files in `tests/` are "tests as linters" over the source tree (§4.3).

Typical file shape (`tests/session.test.ts`):

```ts
const at = (iso: string) => Date.parse(iso);

describe('hourStart', () => {
  test('floors to the top of the UTC hour', () => { ... });
  test('does not drift across a DST boundary', () => { ... });
});
```

Test names are sentences that state the invariant, with a comment on *why*
the case matters ("the case that silently breaks the product: a fast
laptop"). Edge cases are chosen from real failure modes, not from a template:
epoch, DST boundary, year boundary, NaN vs typeof, zero-latency RTT.

Largest files by `test(` count: `live.test.ts` 35, `timer.test.ts` 32,
`session.test.ts` 32, `practice.test.ts` 28, `fish.test.ts` 27.
Total 3,301 lines of tests against 3,681 lines of `lib/`.

## 4. What is covered

### 4.1 The shared-hour scheduler, `lib/session.ts`

Fully covered by `tests/session.test.ts` (32 tests): `hourStart`,
`nextHourStart`, `msIntoHour`, `msUntilNextSession`, `candleBurn`,
`ambientSession`, `sessionFromRow` (including defaulting of nulls),
`resolveSession` with an injected `lookup`, `hourKey`, `toWire`/`fromWire`.
This is the one piece of logic every viewer worldwide must agree on, and it
is the best-tested thing in the repo. Appropriate.

### 4.2 Clock correction, `lib/clock.ts`

`tests/clock.test.ts` covers the pure `computeOffset` (sign in both
directions, RTT symmetry, zero latency), the module state
(`setOffset`/`resetClock`/`isSynced`), and `syncClock` end-to-end with a fake
`fetch`: good response, thrown network error, HTTP 500, malformed payload,
`null`→NaN. All five failure paths are asserted to leave the offset at zero.

### 4.3 Design rules enforced as tests

- `tests/portability.test.ts` reads every `lib/*.ts`, strips comments and
  strings, and fails if a browser-only global (`window`, `document`,
  `localStorage`, `navigator`, `AudioContext`, `requestAnimationFrame`,
  `matchMedia`, `indexedDB`, …) is named. Guards against a dot-prefix
  (`foo.document`) and a type label (`document:`) so it does not false-fire.
  It also asserts the glob matched *something*, so a renamed folder cannot
  silently turn the check into a no-op. One test per `lib/` file (27).
- `tests/caps.test.ts` — budget of 1 `uppercase` across `components/`.
- `tests/type.test.ts` — no `text-[…]`, no Tailwind default scale, no
  `--text-*` token under 0.75rem in `app/globals.css`.

These three are why the project can have no ESLint and still have teeth
where it matters. Their failure messages name the document that set the
rule and what to do instead.

### 4.4 The rest of `lib/`

Also tested: `authErrors`, `authRedirect`, `candle`, `company`, `dial`,
`earthView`, `emailCode`, `fish`, `format`, `geo`, `journey`, `label`,
`live`, `noise`, `places`, `pond`, `practice`, `preferences`, `projection`,
`room`, `timer`. The personal timer (`lib/timer.ts`, 32 tests) and the
practice-log merge (`lib/practice.ts`, 28 tests) are the two other
correctness-critical modules and both are well covered.

## 5. What is NOT covered

Be clear-eyed about this: **about 24% of the TypeScript is tested, and it is
the right 24%, but the other 76% has no automated test of any kind.**

| Area | Lines | Tests | Notes |
|---|---|---|---|
| `components/` (59 files: screens, hooks, audio graph) | 10,081 | **none** | No render tests, no hook tests. `Journey.tsx` (741 lines) orchestrates the whole visitor flow and is verified only by eye. The audio graph (`audio.ts`, `mix.ts`) cannot be tested in Node anyway. |
| `app/api/` route handlers (16 files) | 1,605 | **none** | Input validation in `heartbeat/route.ts`, the live-stream auth and hook routes, sign-in, admin — none exercised. These are the security boundary. |
| `supabase/migrations/` (18 files) | 904 | **none** | No schema tests, no RLS policy tests. `CLAUDE.md` records that the remote migration history does not match the folder. |
| `mobile/` (Expo app) | 164 + config | **none** | Also excluded from the root `tsc`; its own `tsconfig` exists but nothing runs it. |
| `lib/beds.ts` | 158 | none | Sound-bed definitions; data more than logic. |
| `lib/supabase.ts` | 121 | none | Client factory; the promise-caching race fix (§4 of `CONVENTIONS.md`) is asserted nowhere. |
| `lib/types.ts`, `lib/pebble.ts` | 115, 13 | none | Types and a trivial helper; fine. |
| `scripts/*.mjs` | — | none | Build and tooling scripts. |
| Integration / end-to-end | — | **none** | No Playwright/Cypress. The browser-preview procedure in `CLAUDE.md` is a manual checklist and is explicitly reserved for "big things". |

Also worth stating:

- **No coverage measurement.** The 24% above is a line-count estimate, not a
  tool's output.
- **No CI.** There is no `.github/`, no pre-commit hook. `CLAUDE.md` says the
  three checks must pass before `dev` → `main`; nothing machine-enforces it,
  and `main` auto-deploys on push.
- **Zero `mock` usage.** No `node:test` `mock.fn`, `mock.timers` or `mock.method`
  anywhere in `tests/`. The suite does not need them because `lib/` takes its
  dependencies as parameters (§6), which is the better design; but it means
  nothing time-dependent is tested with fake timers either, and nothing
  touching `localStorage` or Supabase is tested at all.

Is this how a professional would do it? Partly. Making the domain core pure
and testing it exhaustively is textbook, and for a one-person project with
no CI budget, drawing the line at "pure logic only" is a defensible economy.
But a professional shipping a live site with a service-role key behind
sixteen route handlers would want at least a handful of request-level tests
on the validation paths (`heartbeat`, `signin`, `live/auth`, `admin`), and
one smoke test that the sitting flow mounts. Both are achievable in plain
Node (route handlers are `(Request) => Response` functions; Supabase can be
stubbed the same way `fetch` is in `clock.test.ts`). Their absence is the
largest gap between "tested" and "working" in this repo.

## 6. Mocking and injection patterns

The project's pattern is **dependency injection over mocking**:

- `syncClock(fetchImpl: typeof fetch = fetch)` — tests pass an `async () =>
  new Response(...)` and cast it `as unknown as typeof fetch`
  (`tests/clock.test.ts`). Production passes nothing.
- `resolveSession(atMs, lookup)` — the Supabase query is a function
  parameter; tests pass `async () => null` or a canned `SessionRow`.
- Time is a number argument everywhere in `lib/` (`hourStart(atMs)`), never
  `Date.now()`, so no fake clock is needed.
- Module state in `lib/clock.ts` is reset with an exported "test seam"
  (`setOffset`, `resetClock`) called in `beforeEach`.
- Source-tree tests (`portability`, `caps`, `type`) read files with
  `node:fs` relative to `import.meta.url`, so they need no fixtures.

Verdict: this is the cleaner of the two approaches and is applied
consistently. The only wrinkle is the `as unknown as typeof fetch` cast,
which is the honest price of stubbing a global's full type.

## 7. Warnings seen

`npm test` printed the following **26 times** (once per test file):

```
[MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///.../tests/<x>.test.ts
is not specified and it doesn't parse as CommonJS. Reparsing as ES module ...
To eliminate this warning, add "type": "module" to package.json.
```

Harmless but noisy, and it hides real warnings in the output. The fix Node
suggests (`"type": "module"` in `package.json`) would need checking against
Next's build and the `.mjs` scripts; the alternative is to pass
`--experimental-default-type=module` in the test script. Either is a
one-line change.

`npm run typecheck` printed nothing.

## 8. The broken lint command

`"lint": "next lint"` in `package.json` fails because `next lint` was
removed in Next 16 (the project is on `^16.3.2`); the CLI now reads `lint`
as a directory argument. There is also no ESLint anywhere: no config file,
no `eslint` in `node_modules/.bin`, no `eslint-config-next`. Six
`// eslint-disable-next-line react-hooks/exhaustive-deps` comments in
`components/` therefore disable a rule that is never evaluated.

What this means in practice: the project has never had a working linter
since the Next 16 upgrade, and possibly before. The `react-hooks` rules in
particular catch real bugs (stale closures, missing deps) that `tsc` does
not. A professional would either install `eslint` + `eslint-config-next` and
change the script to `eslint .`, or delete the script and the six dead
comments so the repo stops claiming a check it does not have.

## 9. How to run

From the repo root:

```bash
npm run typecheck          # tsc --noEmit, ~10 s
npm test                   # node --test, ~1 s, 366 tests
npm test 2>&1 | grep -E '^# (pass|fail)'   # just the totals
node --test --experimental-strip-types tests/session.test.ts   # one file
npm run build              # full Next build; CLAUDE.md requires it before dev → main. Not run here.
```

Other checks that exist as scripts, not tests:

- `npm run contrast` — `scripts/contrast.mjs`, re-measures colour contrast
  against `DESIGN.md`'s tokens.
- `npm run timelog` — billing, **never run by an agent** (`CLAUDE.md`).

Browser verification is manual and documented step-by-step in `CLAUDE.md`
("Testing in the browser preview"), including which controls make sound
and the dev-only `/?demo=sitting` fixtures in `components/Demo.tsx`. It is
explicitly for rendering changes only.

## 10. Summary judgement

Does it work? Everything that is tested, passes, and types check clean under
stricter-than-default settings. Is it tested the way a professional would
test it? The pure core is — thoroughly, with well-chosen edge cases and a
dependency-injection style that avoids mocks. The server edge, the UI, the
database and the mobile app are not tested at all, there is no CI to run
what exists, the linter has been silently broken by a framework upgrade, and
every run emits 26 identical warnings. Fixing the lint script and the module
warning are one-line jobs; adding route-handler tests is an afternoon; CI is
a ten-line workflow. None of it is hard, and all of it is currently missing.
