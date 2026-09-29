import { ImageResponse } from 'next/og';

import { bowlSvg, WATER } from '@/components/BowlMark';

/**
 * The home-screen icon, for anyone who adds the site to an iPhone.
 *
 * 180×180 is the size iOS asks for. Fully opaque and square-cornered on
 * purpose: iOS masks the corners itself, and it composites any transparency
 * onto black, so an icon with a soft edge gets a hard one anyway — better to
 * decide the background here than to let the OS pick it.
 */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: WATER,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={150} height={150} alt="" src={`data:image/svg+xml,${encodeURIComponent(bowlSvg())}`} />
      </div>
    ),
    size,
  );
}
