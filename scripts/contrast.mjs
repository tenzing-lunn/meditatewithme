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
 * What this cannot see: text set over the photograph. Those ratios depend on
 * the camera phase and were sampled in the browser instead — see
 * `docs/design-audit.md` §10 for the method and the numbers.
 *
 * Thresholds (WCAG 2.1):
 *   4.5  normal text
 *   3.0  large text (>=24px, or >=18.66px bold) and UI component boundaries
 *
 * `rule` fails deliberately and is excluded from the pass/fail exit code — it
 * is a decorative hairline, and the rule enforced instead is that it never
 * carries a control's state on its own.
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

// Palette values have one source of truth: the build-time theme and the
// deliberate runtime override in globals.css. This check must fail with the
// page instead of staying green against an old hand-copied object.
const THEME = {
  theme: colorsIn('@theme'),
  runtime: colorsIn(':root'),
};

/** Foreground, background, and the threshold that pair must clear. */
const PAIRS = [
  ['ink', 'paper', 4.5],
  ['ink-2', 'paper', 4.5],
  ['ink-3', 'paper', 4.5],
  ['ember', 'paper', 4.5],
  ['ink-3', 'surface', 4.5],
  ['ember', 'surface', 4.5],
];

/**
 * Pairs where the foreground is a palette colour at partial opacity — a
 * Tailwind `border-ink-2/60` or `placeholder:text-white/50` — composited over
 * its ground before the ratio is taken. The design audit of 7 September 2026
 * found four of these under threshold while this script reported everything
 * green, because it only knew about the six solid pairs above. A green gate
 * over a partial set is worse than no gate.
 *
 * Grounds and foregrounds may be palette names or literal hex. `panel` is the
 * account panel's dark, the one colour that sits over the photograph; it
 * lives in `@theme` and nothing overrides it at runtime.
 *
 * `[foreground, opacity, ground, threshold, where it is used]`
 */
const COMPOSITES = [
  ['ink-2', 0.65, 'paper', 3.0, 'Room secondary button border'],
  ['#ffffff', 0.4, 'panel', 3.0, 'Account FIELD border'],
  ['#ffffff', 0.5, 'panel', 4.5, 'Account FIELD placeholder'],
  ['#ffffff', 0.5, 'panel', 4.5, 'Account FOOT text'],
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

let failed = 0;

function report(label, ratio, min) {
  const ok = ratio >= min;
  if (!ok) failed++;
  console.log(
    `  ${ok ? 'pass' : 'FAIL'}  ${label.padEnd(34)} ` +
      `${ratio.toFixed(2).padStart(6)}  needs ${min.toFixed(1)}`,
  );
}

for (const [mode, colors] of Object.entries(THEME)) {
  // A token the runtime block does not override keeps its `@theme` value,
  // which is what the browser does too.
  const resolve = (c) => (c.startsWith('#') ? c : (colors[c] ?? THEME.theme[c]));
  console.log(`\n${mode}`);
  for (const [fg, bg, min] of PAIRS) {
    report(`${fg} on ${bg}`, contrast(colors[fg], colors[bg]), min);
  }
  for (const [fg, alpha, bg, min, where] of COMPOSITES) {
    const ground = resolve(bg);
    report(
      `${fg}/${alpha * 100} on ${bg} (${where})`,
      contrast(over(resolve(fg), alpha, ground), ground),
      min,
    );
  }
}

console.log(
  failed === 0
    ? '\nAll pairs clear their threshold.'
    : `\n${failed} pair(s) below threshold.`,
);

process.exit(failed === 0 ? 0 : 1);
