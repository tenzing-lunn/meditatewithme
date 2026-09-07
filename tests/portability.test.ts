import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * lib/ must stay portable, and this is what makes that claim checkable.
 *
 * `components/usePresence.ts` has said it since the hook was written — "lib/
 * stays pure and unit-testable" — and until now that was a sentence in a
 * comment. `scripts/contrast.mjs` exists because a number nobody can
 * re-measure quietly stops being true; a boundary nobody can re-measure goes
 * the same way, and it goes without anybody noticing, because importing
 * `localStorage` into lib/ breaks nothing on the web.
 *
 * It breaks something later. As of 6 September 2026 the plan is an iOS app,
 * and lib/ is the part that survives the move: 1,367 lines including the whole
 * shared-hour scheduler, none of which cares what is drawing. The port is only
 * cheap while that stays true, and it stops being true one convenient import
 * at a time.
 *
 * WHAT IS AND IS NOT BANNED
 *
 * Runtime globals only. DOM *types* are erased before anything runs and cost
 * nothing on another platform, so `typeof fetch` in clock.ts is fine and this
 * does not look for them.
 *
 * `fetch` and `performance` are deliberately absent from the list: both exist
 * in React Native, so banning them would be enforcing a rule we do not have.
 * `clock.ts` takes `fetchImpl` as a parameter anyway, which is the better
 * pattern and the reason it needs no exception here.
 *
 * The list is short on purpose. A check with false positives gets deleted the
 * first week it is wrong, and then the boundary has no guard at all.
 */

/** Globals that simply do not exist off the web. */
const BROWSER_ONLY = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
  'AudioContext',
  'webkitAudioContext',
  'XMLHttpRequest',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'matchMedia',
  'indexedDB',
  'HTMLElement',
  'CanvasRenderingContext2D',
  'Path2D',
];

/**
 * Comments and string literals are not code.
 *
 * lib/ is heavily commented and several of those comments discuss
 * localStorage on purpose — describing where a value ends up is exactly the
 * kind of thing this file must not punish.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ') // line comments, sparing "://"
    .replace(/`(?:[^`\\]|\\.)*`/g, ' ') // template literals
    .replace(/'(?:[^'\\\n]|\\.)*'/g, ' ') // single-quoted
    .replace(/"(?:[^"\\\n]|\\.)*"/g, ' '); // double-quoted
}

const LIB = new URL('../lib/', import.meta.url);

describe('lib/ stays portable', () => {
  const files = readdirSync(LIB).filter((f) => f.endsWith('.ts'));

  test('there is something to check', () => {
    // A glob that silently matches nothing is the other way this rots.
    assert.ok(files.length > 0, 'no .ts files found in lib/');
  });

  for (const file of files) {
    test(`lib/${file} touches no browser-only global`, () => {
      const code = codeOnly(readFileSync(new URL(file, LIB), 'utf8'));

      for (const name of BROWSER_ONLY) {
        // Two things that are not the global and must not trip this:
        //   `foo.document`      — a property read off one of our own objects
        //   `{ document: ... }` — a key, or a type annotation's label
        // Hence: no dot before, no colon after. The colon rule gives up one
        // real case, `cond ? window : other`, which nothing here does and
        // which reads badly enough to catch in review.
        const used = new RegExp(
          String.raw`(?<![.\w$])${name}\b\s*(?!:)`,
        ).test(code);
        assert.ok(
          !used,
          `lib/${file} uses \`${name}\`, which does not exist outside a browser.\n` +
            `    lib/ is the code that moves to the iOS app unchanged. Platform\n` +
            `    access belongs in components/, behind a hook — see the note at the\n` +
            `    top of components/usePresence.ts. If this needs the value, take it\n` +
            `    as a parameter the way lib/clock.ts takes fetchImpl.`,
        );
      }
    });
  }
});
