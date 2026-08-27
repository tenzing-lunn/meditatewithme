/**
 * WCAG contrast check for the palette in app/globals.css.
 *
 * Run: node scripts/contrast.mjs
 *
 * Exists because "AA contrast" in the spec is a number, and a number that
 * nobody can re-measure is a number that quietly stops being true. Every
 * foreground/background pair the site actually renders is listed below; adding
 * a colour to the palette means adding its pairs here.
 *
 * Thresholds (WCAG 2.1):
 *   4.5  normal text
 *   3.0  large text (>=24px, or >=18.66px bold) and UI component boundaries
 *
 * `rule` fails deliberately and is excluded from the pass/fail exit code — it
 * is a decorative hairline, and the rule enforced instead is that it never
 * carries a control's state on its own.
 */

const THEME = {
  light: {
    paper: '#fbfaf8',
    surface: '#ffffff',
    ink: '#16181b',
    'ink-2': '#43484d',
    'ink-3': '#707479',
    rule: '#e1ded8',
    ember: '#a7631e',
  },
  dark: {
    paper: '#131518',
    surface: '#1a1d21',
    ink: '#e9e7e3',
    'ink-2': '#b5b2ad',
    'ink-3': '#87847f',
    rule: '#2a2e33',
    ember: '#e0a057',
  },
};

/** Foreground, background, and the threshold that pair must clear. */
const PAIRS = [
  ['ink', 'paper', 4.5],
  ['ink-2', 'paper', 4.5],
  ['ink-3', 'paper', 4.5],
  ['ember', 'paper', 4.5],
  ['ink-3', 'surface', 4.5],
  ['ember', 'surface', 4.5],
  // The switch's off state and its knob: UI boundaries, so 3.0.
  ['ink-3', 'paper', 3.0],
];

const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
};

const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

let failed = 0;

for (const [mode, colors] of Object.entries(THEME)) {
  console.log(`\n${mode}`);
  for (const [fg, bg, min] of PAIRS) {
    const ratio = contrast(colors[fg], colors[bg]);
    const ok = ratio >= min;
    if (!ok) failed++;
    console.log(
      `  ${ok ? 'pass' : 'FAIL'}  ${`${fg} on ${bg}`.padEnd(18)} ` +
        `${ratio.toFixed(2).padStart(6)}  needs ${min.toFixed(1)}`,
    );
  }
}

console.log(
  failed === 0
    ? '\nAll pairs clear their threshold.'
    : `\n${failed} pair(s) below threshold.`,
);

process.exit(failed === 0 ? 0 : 1);
