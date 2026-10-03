import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/**
 * `next lint` left with Next 16, and with it every `react-hooks/exhaustive-deps`
 * disable comment in components/ stopped meaning anything. This is the same
 * rule set, run by ESLint itself: `npm run lint`, and CI fails on an error.
 *
 * Four rules are warnings rather than errors for now. They came in with
 * eslint-plugin-react-hooks 6 (the React Compiler's rules) and, on 3 October
 * 2026, flag 32 places across the hooks and `Journey.tsx` — setState inside
 * an effect to load from localStorage, refs read during render, and the like.
 * Each is a real note about a pattern this codebase uses deliberately, not a
 * bug found; changing them is the hook-by-hook work `plans/hardening.md`
 * lists, and should be done there, with the preview open, not to make a
 * linter quiet. Until then they are visible on every run and block nothing.
 *
 * `mobile/` has its own package and is linted from there, not here.
 */
const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: ['.next/**', 'node_modules/**', 'mobile/**', '.planning/**', 'next-env.d.ts'],
  },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      // An apostrophe in a sentence is prose, not a bug; the copy is not
      // rewritten as `&rsquo;` to satisfy a linter.
      'react/no-unescaped-entities': 'off',
    },
  },
];

export default config;
