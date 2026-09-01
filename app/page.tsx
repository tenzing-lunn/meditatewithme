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
    // Exactly one viewport, and it does not scroll. The room is a photograph
    // and this is the frame of it — a photograph you have to scroll is a
    // different object, and the moment the page scrolls the type and the
    // picture come apart, because the picture is fixed and the type is not.
    // Everything therefore has to fit; see the band in `CandleScene`.
    //
    // `isolate` keeps the scene's -z-10 behind the column but in front of the
    // page.
    <main className="relative isolate h-dvh overflow-hidden">
      <Room />
    </main>
  );
}
