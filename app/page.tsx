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
 * THE FRAME BELONGS TO EACH SCREEN, NOT TO THIS FILE
 * The rail and the sitting are one viewport each and never scroll; Home and
 * the documents scroll, because a person deciding whether to sit is not a
 * person sitting. A wrapper here would have to be the loosest of them, which
 * would quietly make the sitting scrollable. So each screen states its own
 * frame (`components/Rail.tsx`, `components/Sitting.tsx`, `components/Home.tsx`).
 *
 * Not marked noindex. Vercel already sends X-Robots-Tag: noindex on preview
 * deployments, and this file is correct as-is for the day it goes live.
 */
export default function Page() {
  return <Entry />;
}
