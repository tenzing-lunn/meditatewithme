import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * WHY `turbopack.root` IS SET
 *
 * Turbopack picks a workspace root by walking UP from this directory looking
 * for a lockfile, so that a monorepo compiles from its true root. There is a
 * stray `package.json` and `package-lock.json` sitting in the home directory
 * — almost certainly left by an `npm install` run in the wrong place years ago
 * — and Turbopack finds those before it finds ours.
 *
 * It then declines to use them because they are outside the git repository,
 * and prints a warning on every single `next dev`. Nothing is broken; it is
 * telling us it made a guess it was not confident about.
 *
 * Saying the root out loud removes the guess. This is worth doing even if the
 * stray files are deleted: it means the build no longer depends on what happens
 * to exist in directories above the project.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  /**
   * Dev only. `127.0.0.1:3000` is a different origin from `localhost:3000`,
   * with its own localStorage and therefore no session — which makes it the
   * one way to look at the guest landing in a browser that is signed in,
   * without signing anybody out. Next blocks dev assets from any origin but
   * the one it started on, so without this the second origin is a black page
   * and a column of 403s.
   */
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
