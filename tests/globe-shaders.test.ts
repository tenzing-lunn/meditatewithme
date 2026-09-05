import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * The one thing that silently destroys `Globe.tsx`.
 *
 * The shaders are template literals, so a single backtick anywhere inside one
 * — including inside a GLSL comment, which is where it always happens, because
 * the house style quotes identifiers that way everywhere else in the codebase
 * — ends the string early. What follows is the rest of the shader being parsed
 * as TypeScript, and the error you get points at whatever punctuation comes
 * next rather than at the backtick.
 *
 * `Globe.tsx` has warned about this in prose since it was written. It was then
 * done twice in one sitting anyway, once while adding the ping and once while
 * adding the relief, because a warning in a comment is not a thing that runs.
 * This is the same warning as something that runs.
 *
 * The check does not look for backticks directly — it cannot tell a delimiter
 * from a stray one. It uses the fact that every shader here closes with a
 * backtick immediately followed by a semicolon: if a stray backtick appears
 * mid-shader, the *first* backtick after the opening one will be followed by
 * something else, and that is the failure.
 */

const SOURCE = readFileSync(
  new URL('../components/Globe.tsx', import.meta.url),
  'utf8',
);

const OPENER = '/* glsl */ `';

describe('Globe.tsx shader literals', () => {
  test('every shader is delimited, and none is cut short by a backtick', () => {
    let from = 0;
    let found = 0;

    for (;;) {
      const start = SOURCE.indexOf(OPENER, from);
      if (start === -1) break;

      const open = start + OPENER.length;
      const close = SOURCE.indexOf('`', open);

      assert.notEqual(close, -1, 'a shader literal is never closed');

      const after = SOURCE.slice(close + 1, close + 2);
      assert.equal(
        after,
        ';',
        `A backtick inside a shader ends it early. The one after the ` +
          `shader beginning at character ${start} is followed by ${JSON.stringify(after)} ` +
          `rather than a semicolon — most likely a quoted identifier in a GLSL ` +
          `comment. Write it bare.`,
      );

      found += 1;
      from = close + 1;
    }

    // Every shader in the file is reached, so adding one does not quietly
    // escape the check.
    assert.equal(
      found,
      SOURCE.split(OPENER).length - 1,
      'not every glsl literal was checked',
    );
    assert.ok(found >= 6, `expected at least 6 shaders, found ${found}`);
  });

  test('each shader has an entry point', () => {
    for (const block of SOURCE.split(OPENER).slice(1)) {
      const body = block.slice(0, block.indexOf('`'));
      assert.match(
        body,
        /void main\(\)/,
        'a shader literal has no main() — it was probably truncated',
      );
    }
  });
});
