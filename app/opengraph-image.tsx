import { ImageResponse } from 'next/og';

import { FlameMark, EMBER, PAPER } from '@/components/FlameMark';

/**
 * The card a shared link unfurls into, in Slack, iMessage, WhatsApp, anywhere.
 *
 * Deliberately *not* the current hour's candle. Crawlers fetch this once and
 * cache it hard, so an image that burned down over the hour would freeze at
 * whatever height the first crawl happened to catch — a half-spent candle
 * shown to everyone, forever, saying the opposite of "come and sit". A full
 * flame is the invitation, and it is the honest thing to cache.
 *
 * It echoes the landing rather than summarising the site: the flame and the
 * words, on the dark, with room around them.
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#e9e7e3';
const INK_2 = '#b5b2ad';

/**
 * The site's own two faces: Instrument Serif for the name, IBM Plex Sans for
 * everything else — the pairing app/layout.tsx already uses.
 *
 * Two rules learned by rendering it wrong:
 *
 *   Never pass `text=`. Subsetting to the title's characters produced a font
 *   missing most of the alphabet, and satori silently fell back per *glyph* —
 *   so the subtitle came out with half its letters in one face and half in
 *   another, mid-word.
 *
 *   Do not send a browser User-Agent. Google serves woff2 to anything modern
 *   and satori can only parse ttf.
 *
 * All or nothing: if either face fails to load we return null and the card
 * renders in satori's default. A card in the wrong font is a disappointment;
 * a card in two mismatched fonts looks broken, and a thrown error is no card
 * at all.
 */
async function siteFonts() {
  async function face(family: string) {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family}`,
    ).then((r) => (r.ok ? r.text() : ''));

    const url = css.match(/src:\s*url\((https:[^)]+)\)/)?.[1];
    if (!url) return null;

    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  }

  try {
    const [serif, sans] = await Promise.all([
      face('Instrument+Serif'),
      face('IBM+Plex+Sans'),
    ]);
    if (!serif || !sans) return null;
    return { serif, sans };
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const title = 'Meditate With Me';
  const fonts = await siteFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: PAPER,
          // The glow the flame would actually throw on the wall behind it.
          backgroundImage: `radial-gradient(circle at 50% 38%, rgba(224,160,87,0.15), rgba(19,21,24,0) 55%)`,
        }}
      >
        <FlameMark size={132} />

        <div
          style={{
            marginTop: 44,
            fontSize: 84,
            letterSpacing: '-0.015em',
            color: INK,
            ...(fonts ? { fontFamily: 'Instrument Serif' } : {}),
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 22,
            fontSize: 30,
            color: INK_2,
            textAlign: 'center',
            maxWidth: 760,
          }}
        >
          A candle is lit at the top of every hour. Everyone is looking at the
          same one.
        </div>

        <div
          style={{
            marginTop: 52,
            fontSize: 22,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: EMBER,
          }}
        >
          meditatewithme
        </div>
      </div>
    ),
    {
      ...size,
      ...(fonts
        ? {
            // Plex first: satori treats the first entry as the default, and
            // everything except the name is set in the sans.
            fonts: [
              { name: 'IBM Plex Sans', data: fonts.sans, style: 'normal' as const },
              { name: 'Instrument Serif', data: fonts.serif, style: 'normal' as const },
            ],
          }
        : {}),
    },
  );
}
