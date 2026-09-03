import Entry from '@/components/Entry';

/**
 * The root.
 *
 * It briefly lived at /room while `main` was the only branch — anything pushed
 * went straight to the live URL, and a half-built room should not appear at a
 * client-facing address. Now that work happens on `dev`, that reason is gone:
 * `main` still serves the holding page to the world, and this is what replaces
 * it the moment dev is merged. That merge is the launch.
 *
 * THE FRAME MOVED INTO `Entry`, AND IT HAD TO
 * This file used to be the room's frame — `h-dvh overflow-hidden`, one
 * viewport, no scrolling, which is the composition decision everything in §16
 * follows from. There are two screens under this route now, and Home is
 * deliberately not that shape: it scrolls, because a person deciding whether to
 * sit is not a person sitting.
 *
 * A wrapper here would have to be the loosest of the two, which would quietly
 * make the room scrollable — and a scrolling room is a photograph coming apart
 * from its own type, since the picture is fixed and the copy is not. So each
 * screen states its own frame, and the room's is unchanged.
 *
 * Not marked noindex. Vercel already sends X-Robots-Tag: noindex on preview
 * deployments, and this file is correct as-is for the day it goes live.
 */
export default function Page() {
  return <Entry />;
}
