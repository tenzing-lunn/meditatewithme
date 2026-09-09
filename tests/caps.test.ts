import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Tracked capitals are budgeted, and this is what makes the budget bite.
 *
 * `plans/room-polish.md` Phase 2 took fifteen `font-mono uppercase
 * tracking-[0.13em]` micro-labels down to two, and accepted on a grep for the
 * literal values it had deleted. Home was written after that pass and came
 * back with eight of them at `tracking-[0.14em]` — one hundredth of an em to
 * the side of the pattern, so the guard never fired. A guard written against
 * the exact thing it removed only ever catches that thing coming back
 * unchanged.
 *
 * So the check is the word itself, `uppercase`, anywhere in components/,
 * against a stated number. One is the budget because one is what remains: the
 * `Your practice` heading on Home. Raising the number is allowed and is a
 * decision, made here, in the open — not a side effect of a new screen.
 */
const BUDGET = 1;

const COMPONENTS = new URL('../components/', import.meta.url);

test(`components/ says \`uppercase\` at most ${BUDGET} time(s)`, () => {
  const hits: string[] = [];
  for (const file of readdirSync(COMPONENTS).filter((f) =>
    /\.tsx?$/.test(f),
  )) {
    readFileSync(new URL(file, COMPONENTS), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (line.includes('uppercase')) hits.push(`components/${file}:${i + 1}`);
      });
  }
  assert.ok(
    hits.length <= BUDGET,
    `${hits.length} uses of \`uppercase\` in components/, budget ${BUDGET}:\n` +
      hits.map((h) => `    ${h}`).join('\n') +
      `\n    Tracked capitals are the "it looks generated" signal room-polish.md\n` +
      `    §3 set out to remove. Use weight, size or ink-3 for a label instead,\n` +
      `    or raise BUDGET in tests/caps.test.ts and say why in the commit.`,
  );
});
