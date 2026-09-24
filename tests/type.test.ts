import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Every size on the site is a role, and this is what keeps it so.
 *
 * The 21 September 2026 audit (`docs/audit-2026-09-21.md` H7) counted 33
 * distinct sizes across components/ against the nine roles DESIGN.md
 * declared, three of them under 12px, because a `text-[0.84375rem]` is one
 * keystroke away from `text-[0.875rem]` and nothing ever said no. Now the
 * roles are `--text-*` tokens in `app/globals.css` (`@theme`), Tailwind's
 * own scale is switched off there, and this test holds three lines:
 *
 *   1. No `text-[…]` in components/ or app/. The budget is zero because
 *      zero is what a role system means: a size that is not a role does not
 *      exist. Wanting one is a decision about the system, made in the
 *      stylesheet with a name, not in a class string with a number.
 *   2. No default-scale size (`text-sm`, `text-xl`…) either. The scale is
 *      reset in `@theme`, so one of these would compile to nothing and
 *      render at the inherited size — a silent fault, which is worse than a
 *      loud one.
 *   3. Nothing in the token block under 0.75rem. Twelve pixels is the floor
 *      DESIGN.md sets for the smallest type; a role added below it is a
 *      failure here, not a caption.
 */
const ARBITRARY_BUDGET = 0;
const FLOOR_REM = 0.75;

const ROOT = new URL('../', import.meta.url);
const DIRS = ['components/', 'app/'];

function sources(): [string, string][] {
  const out: [string, string][] = [];
  for (const dir of DIRS) {
    const base = new URL(dir, ROOT);
    for (const file of readdirSync(base, { recursive: true }) as string[]) {
      if (!/\.tsx?$/.test(file)) continue;
      out.push([`${dir}${file}`, readFileSync(new URL(file, base), 'utf8')]);
    }
  }
  return out;
}

function hits(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const [name, text] of sources()) {
    text.split('\n').forEach((line, i) => {
      if (pattern.test(line)) found.push(`${name}:${i + 1}`);
    });
  }
  return found;
}

test(`components/ and app/ carry no \`text-[…]\` size (budget ${ARBITRARY_BUDGET})`, () => {
  const found = hits(/\btext-\[/);
  assert.ok(
    found.length <= ARBITRARY_BUDGET,
    `${found.length} arbitrary text sizes, budget ${ARBITRARY_BUDGET}:\n` +
      found.map((h) => `    ${h}`).join('\n') +
      `\n    Use a role: text-body, text-control, text-caption, text-question…\n` +
      `    (the --text-* tokens in app/globals.css). A size that is none of\n` +
      `    them is a new role, added there with a name and a reason.`,
  );
});

test('components/ and app/ use no default-scale text size', () => {
  const found = hits(/(?:^|[^\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)\b/);
  assert.ok(
    found.length === 0,
    `${found.length} default-scale sizes, which compile to nothing here:\n` +
      found.map((h) => `    ${h}`).join('\n') +
      `\n    Tailwind's scale is reset in @theme (\`--text-*: initial\`). Use a\n` +
      `    role token instead.`,
  );
});

test(`every --text-* token in app/globals.css is at least ${FLOOR_REM}rem`, () => {
  const css = readFileSync(new URL('app/globals.css', ROOT), 'utf8');
  const start = css.indexOf('@theme');
  assert.ok(start >= 0, 'no @theme block in app/globals.css');
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (; end < css.length; end++) {
    if (css[end] === '{') depth++;
    if (css[end] === '}' && --depth === 0) break;
  }
  const theme = css.slice(open + 1, end);
  const tokens = [...theme.matchAll(/--text-([\w-]+):\s*([\d.]+)(rem|px)\s*;/g)];
  assert.ok(tokens.length > 0, 'no --text-* tokens in @theme');
  const under = tokens
    .map(([, name, value, unit]) => ({
      name,
      rem: unit === 'px' ? Number(value) / 16 : Number(value),
    }))
    .filter((t) => t.rem < FLOOR_REM);
  assert.deepEqual(
    under,
    [],
    `--text-* tokens under the ${FLOOR_REM}rem floor: ` +
      under.map((t) => `${t.name} (${t.rem}rem)`).join(', '),
  );
});
