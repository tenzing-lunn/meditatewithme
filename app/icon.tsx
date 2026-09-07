import { ImageResponse } from 'next/og';

import { FlameMark, PAPER } from '@/components/FlameMark';

/**
 * The tab icon. Generated rather than committed as a .ico so it shares a
 * single definition of the flame with the home-screen icon and the shared-link
 * card — see components/FlameMark.tsx.
 */

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Opaque, not transparent: the tab strip behind this is light in one
          // browser and dark in the next, and a flame floating on nothing
          // loses its outline against the light one.
          background: PAPER,
        }}
      >
        <FlameMark size={26} />
      </div>
    ),
    size,
  );
}
