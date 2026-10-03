/**
 * Three things stand between `node --test` and a route handler, and this
 * resolver removes each one so the handlers can be tested as they are, with
 * no test-only seams added to the routes themselves:
 *
 * - `@/lib/x` — the tsconfig path alias Next resolves and Node does not.
 *   Mapped to the repository root.
 * - `@/lib/supabase` in particular — the real client would need a key and a
 *   network. Mapped to `tests/api/_db.ts`, whose `serviceClient()` returns
 *   whatever fake the running test installed.
 * - `next/server` and extensionless relative imports (`'../_email/codes'`) —
 *   fine for a bundler, not for Node's ESM loader. `next/server` becomes
 *   `next/server.js`; anything not found is retried with `.ts`.
 *
 * `--experimental-strip-types` does the TypeScript, as for the unit tests.
 */
const ROOT = new URL('../../', import.meta.url);
const FAKE_DB = new URL('_db.ts', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === '@/lib/supabase') return { url: FAKE_DB, shortCircuit: true };
  if (specifier === 'next/server') specifier = 'next/server.js';
  if (specifier.startsWith('@/')) specifier = new URL(specifier.slice(2), ROOT).href;
  try {
    return await next(specifier, context);
  } catch (err) {
    if (err?.code === 'ERR_MODULE_NOT_FOUND' && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      return next(`${specifier}.ts`, context);
    }
    throw err;
  }
}
