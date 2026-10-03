import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

/**
 * The standing documents name files, and files move.
 *
 * `context/` is read before every piece of work, and `CLAUDE.md` says to fix
 * it in the same commit that makes it wrong. By 3 October 2026 it named six
 * files that no longer existed — `components/Home.tsx`, `Bowl.tsx`,
 * `Wordmark.tsx`, `useCount`, `useRoom`, `/world` — because nothing
 * checked. This does: every backticked token in the standing documents that
 * looks like a path into this repository must exist.
 *
 * Only paths that start with a known top-level directory and name a file with
 * an extension are checked; a pattern with `*` or `<` in it is a template,
 * not a path, and is skipped. The check is deliberately narrow so that it
 * never cries wolf — a check with false positives gets deleted the first
 * week it is wrong (see `tests/portability.test.ts`).
 */

const ROOT = new URL('../', import.meta.url);

/** The documents that must stay true, as `CLAUDE.md` describes them. */
const STANDING = [
  'CLAUDE.md',
  'DESIGN.md',
  'README.md',
  ...readdirSync(new URL('context/', ROOT)).filter((f) => f.endsWith('.md')).map((f) => `context/${f}`),
];

const DIRS = ['app', 'components', 'lib', 'tests', 'supabase', 'scripts', 'context', 'plans', 'docs', 'infra', 'mobile', 'public'];

/** A backticked token that is a path into the repo and names a file. */
const PATH = new RegExp(String.raw`\`((?:${DIRS.join('|')})/[\w./@\[\]-]+\.\w+)\``, 'g');

describe('the standing documents name files that exist', () => {
  for (const doc of STANDING) {
    test(doc, () => {
      const text = readFileSync(new URL(doc, ROOT), 'utf8');
      const missing: string[] = [];
      for (const m of text.matchAll(PATH)) {
        const p = m[1]!;
        if (/[*<>{}]/.test(p)) continue;
        // `file.ts:12` and `file.ts#anchor` point inside a file; check the file.
        const file = p.replace(/[:#].*$/, '');
        if (!existsSync(new URL(file, ROOT))) missing.push(p);
      }
      assert.deepEqual(
        [...new Set(missing)],
        [],
        `${doc} names files that do not exist. Either the file moved — fix the\n` +
          `    document in this commit, as CLAUDE.md asks — or the text is about\n` +
          `    something that used to exist, and belongs in docs/ as history.`,
      );
    });
  }
});
