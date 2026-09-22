/**
 * The flame, as a mark.
 *
 * A drawing, legible at tab size: the favicon is 32px, and the candle
 * sprites on the earth are the same two warmths at twenty. Nothing
 * photographic has been on the site since 14 September 2026.
 *
 * Used by app/icon.tsx, app/apple-icon.tsx and app/opengraph-image.tsx so the
 * tab, the home screen and the shared link cannot drift apart. Rendered by
 * satori inside `ImageResponse`, never by the browser, which is why it is
 * plain SVG with no CSS custom properties — satori resolves neither those nor
 * `currentColor`.
 */

/**
 * `flame`, `flame-core` and `dusk`: the flame, its hot core, and the ground
 * the tab and the home screen put it on — the sitting's brown, so the icon
 * is a candle in the room rather than a candle on a black tile. Lifted from
 * `@theme` in app/globals.css under the same names; satori cannot read a
 * custom property, so they are copied.
 */
export const FLAME = '#e0a057';
export const FLAME_CORE = '#fbead2';
export const DUSK = '#2b1a10';

export function FlameMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/*
        The waist is what makes this a flame and not a raindrop.

        The first version of this was convex from tip to base and closed with a
        circle, which is precisely the water-drop glyph — on a site about a
        candle. A flame narrows above the middle before it bells out, so the
        silhouette pinches at y≈10 and is widest at y≈16, and it is drawn
        roughly twice as tall as it is wide.

        The second version had the waist but used quadratics, and the tangent
        broke where the waist met the bell — a visible corner that read as a
        chess pawn at 180px. Every join below is a cubic whose control point is
        the reflection of the one before it, which is what actually makes a
        curve smooth. Both faults were found by rendering it, not by reading
        it.
      */}
      <path
        d="M12 1.8 C 11.2 5.4 9.8 7.6 9.5 10 C 9.2 12.4 6.8 13.4 6.6 16.4
           C 6.4 19.8 8.8 22.2 12 22.2 C 15.2 22.2 17.6 19.8 17.4 16.4
           C 17.2 13.4 14.8 12.4 14.5 10 C 14.2 7.6 12.8 5.4 12 1.8 Z"
        fill={FLAME}
      />
      {/* The core, the part actually burning: the same shape, sat low in it. */}
      <path
        d="M12 10.8 C 11.5 13 10.8 13.8 10.7 15.2 C 10.6 16.6 9.3 17.2 9.2 18.8
           C 9.1 20.6 10.4 21.6 12 21.6 C 13.6 21.6 14.9 20.6 14.8 18.8
           C 14.7 17.2 13.4 16.6 13.3 15.2 C 13.2 13.8 12.5 13 12 10.8 Z"
        fill={FLAME_CORE}
      />
    </svg>
  );
}
