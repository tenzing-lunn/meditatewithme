import Room from '@/components/Room';

/**
 * The room, at the root.
 *
 * It briefly lived at /room while `main` was the only branch — anything pushed
 * went straight to the live URL, and a half-built room should not appear at a
 * client-facing address. Now that work happens on `dev`, that reason is gone:
 * `main` still serves the holding page to the world, and this is what replaces
 * it the moment dev is merged. That merge is the launch.
 *
 * Not marked noindex. Vercel already sends X-Robots-Tag: noindex on preview
 * deployments, and this file is correct as-is for the day it goes live.
 */
export default function Home() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <Room />
    </main>
  );
}
