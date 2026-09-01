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
};

export default nextConfig;
