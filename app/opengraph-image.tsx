import { ImageResponse } from 'next/og';

import { FlameMark } from '@/components/FlameMark';

/**
 * The card a shared link unfurls into, in Slack, iMessage, WhatsApp, anywhere.
 *
 * Deliberately *not* the current hour's candle. Crawlers fetch this once and
 * cache it hard, so an image that burned down over the hour would freeze at
 * whatever height the first crawl happened to catch — a half-spent candle
 * shown to everyone, forever, saying the opposite of "come and sit". A full
 * flame is the invitation, and it is the honest thing to cache.
 *
 * It echoes the welcome screen rather than summarising the site: the flame
 * and the words, on the warm paper, with room around them.
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
// Next emits `og:image:alt` only from this export.
export const alt =
  'A flame over the words Meditate With Me: everyone sitting this hour is a candle on the earth, and one bell at five to the hour ends it for all of them.';

/** The warm palette from `@theme` in app/globals.css; satori cannot read it. */
const PAPER = '#f6e9d8';
const INK = '#3b2a1d';
const INK_2 = '#6a5342';
const EMBER = '#9c3d12';

/**
 * The site's own two faces: Comfortaa for the name, Nunito for everything
 * else — the pairing app/layout.tsx already uses.
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
    const [display, body] = await Promise.all([
      face('Comfortaa:wght@700'),
      face('Nunito:wght@600'),
    ]);
    if (!display || !body) return null;
    return { display, body };
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
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
          // The warmth the flame throws on the paper around it.
          backgroundImage: `radial-gradient(circle at 50% 38%, rgba(217,102,31,0.18), rgba(246,233,216,0) 55%)`,
        }}
      >
        <FlameMark size={132} />

        <div
          style={{
            marginTop: 44,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: INK,
            ...(fonts ? { fontFamily: 'Comfortaa' } : {}),
          }}
        >
          Meditate With Me
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
          Everyone sitting this hour is a candle on the earth, and one bell at
          five to the hour ends it for all of them.
        </div>

        <div
          style={{
            marginTop: 52,
            fontSize: 24,
            fontWeight: 600,
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
            // Nunito first: satori treats the first entry as the default, and
            // everything except the name is set in the body face.
            fonts: [
              { name: 'Nunito', data: fonts.body, weight: 600 as const, style: 'normal' as const },
              { name: 'Comfortaa', data: fonts.display, weight: 700 as const, style: 'normal' as const },
            ],
          }
        : {}),
    },
  );
}
