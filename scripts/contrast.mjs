/**
 * WCAG contrast check for the palette in app/globals.css.
 *
 * Run: node scripts/contrast.mjs
 *
 * Exists because "AA contrast" in the spec is a number, and a number that
 * nobody can re-measure is a number that quietly stops being true. Every
 * foreground/background pair the site actually renders is listed below; adding
 * a colour to the palette means adding its pairs here, and using a palette
 * colour at partial opacity means adding it to COMPOSITES.
 *
 * Since 14 September 2026 the palette is flat: there is no photograph and no
 * runtime override, so `@theme` is the whole truth and this gate is the whole
 * gate.
 *
 * Thresholds (WCAG 2.1):
 *   4.5  normal text
 *   3.0  large text (>=24px, or >=18.66px bold) and UI component boundaries
 *
 * `rule` and `glow` fail deliberately and are not listed: `rule` is a
 * decorative hairline that never carries a control's state on its own, and
 * `glow` is the bowl's rim and the flames' tint, never text and never a
 * control's edge. `glow` on dusk is listed at 3.0 because the flames sit
 * there.
 */

import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

/** Return a complete CSS block without trying to parse the rest of CSS. */
function blockFor(selector) {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`Missing ${selector} in app/globals.css`);
  const open = css.indexOf('{', start + selector.length);
  if (open < 0) throw new Error(`Missing opening brace for ${selector}`);

  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') depth--;
    if (depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`Missing closing brace for ${selector}`);
}

function colorsIn(selector) {
  const colors = {};
  for (const match of blockFor(selector).matchAll(
    /--color-([\w-]+):\s*(#[\da-f]{6})\s*;/gi,
  )) {
    colors[match[1]] = match[2];
  }
  return colors;
}

// Palette values have one source of truth. This check must fail with the page
// instead of staying green against an old hand-copied object.
const COLORS = colorsIn('@theme');

/** Foreground, background, and the threshold that pair must clear. */
const PAIRS = [
  // The light screens.
  ['ink', 'paper', 4.5],
  ['ink-2', 'paper', 4.5],
  ['ink-3', 'paper', 4.5],
  ['ember', 'paper', 4.5],
  ['ink', 'surface', 4.5],
  ['ink-2', 'surface', 4.5],
  ['ink-3', 'surface', 4.5],
  ['ember', 'surface', 4.5],
  // A picked chip: ember type on ember-soft.
  ['ember', 'ember-soft', 4.5],
  ['ink', 'ember-soft', 4.5],
  // The primary button: white on ember.
  ['#ffffff', 'ember', 4.5],
  // The sitting.
  ['dusk-ink', 'dusk', 4.5],
  ['dusk-ink-2', 'dusk', 4.5],
  ['flame', 'dusk', 4.5],
  ['glow', 'dusk', 3.0],
];

/**
 * Pairs where the foreground is a palette colour at partial opacity — a
 * Tailwind `border-dusk-ink-2/40` — composited over its ground before the
 * ratio is taken. A green gate over a partial set is worse than no gate, so
 * every alpha the components use is listed here.
 *
 * `[foreground, opacity, ground, threshold, where it is used]`
 */
const COMPOSITES = [
  ['dusk-ink-2', 0.55, 'dusk', 3.0, 'QUIET_DUSK border'],
];

const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const luminance = (hex) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** `fg` at `alpha` over an opaque `bg`, as the hex the eye actually meets. */
const over = (fg, alpha, bg) => {
  const f = rgb(fg);
  const g = rgb(bg);
  return (
    '#' +
    f
      .map((c, i) => Math.round(c * alpha + g[i] * (1 - alpha)))
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  );
};

const resolve = (c) => {
  if (c.startsWith('#')) return c;
  if (!COLORS[c]) throw new Error(`No --color-${c} in @theme`);
  return COLORS[c];
};

let failed = 0;

function report(label, ratio, min) {
  const ok = ratio >= min;
  if (!ok) failed++;
  console.log(
    `  ${ok ? 'pass' : 'FAIL'}  ${label.padEnd(36)} ` +
      `${ratio.toFixed(2).padStart(6)}  needs ${min.toFixed(1)}`,
  );
}

console.log('\n@theme');
for (const [fg, bg, min] of PAIRS) {
  report(`${fg} on ${bg}`, contrast(resolve(fg), resolve(bg)), min);
}
for (const [fg, alpha, bg, min, where] of COMPOSITES) {
  const ground = resolve(bg);
  report(
    `${fg}/${alpha * 100} on ${bg} (${where})`,
    contrast(over(resolve(fg), alpha, ground), ground),
    min,
  );
}

console.log(
  failed === 0
    ? '\nAll pairs clear their threshold.'
    : `\n${failed} pair(s) below threshold.`,
);

process.exit(failed === 0 ? 0 : 1);
