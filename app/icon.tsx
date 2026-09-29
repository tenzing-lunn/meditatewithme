import { ImageResponse } from 'next/og';

import { BowlMark, WATER } from '@/components/BowlMark';

/**
 * The tab icon. Generated rather than committed as a .ico so it shares a
 * single definition of the bowl with the home-screen icon — see
 * components/BowlMark.tsx.
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
          // browser and dark in the next, and a bowl floating on nothing
          // loses its outline against one of them.
          background: WATER,
        }}
      >
        <BowlMark size={28} />
      </div>
    ),
    size,
  );
}
