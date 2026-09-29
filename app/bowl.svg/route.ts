import { bowlSvg } from '@/components/BowlMark';

/**
 * The tab icon, as SVG: sharp at every size and every pixel density, where
 * a 32px PNG went soft, and transparent, so the tab strip shows through.
 * `layout.tsx` points `icons.icon` here.
 */
export const dynamic = 'force-static';

export function GET() {
  return new Response(bowlSvg(), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
