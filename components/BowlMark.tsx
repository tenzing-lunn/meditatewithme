/**
 * The singing bowl, as a mark: the bowl that began a sitting on the old
 * rail (`Bowl.tsx`), drawn in blue for the tab and the home screen.
 * Tenzing, 28 September 2026, in place of the flame.
 *
 * Rendered by satori inside `ImageResponse`, never by the browser, so it is
 * plain SVG with literal colours: satori reads neither custom properties
 * nor `currentColor`. At 32px the rings and the shadow would be mud, so it
 * is the body, the mouth and the rim only; a striker read as a spoon.
 */

/** The page's pale water, so the tab reads as the site. */
export const WATER = '#e5e9ec';

const BODY_TOP = '#7ea9d1';
const BODY_BOTTOM = '#2f5f8f';
const INSIDE = '#dbe8f4';
const RIM = '#1f4a75';

export function BowlMark({ size }: { size: number }) {
  // Wide and shallow, as a singing bowl is: a mouth much wider than the bowl
  // is deep, the sides rounding into a small flat base, on a low cushion.
  return (
    <svg width={size} height={size} viewBox="16 26 208 208" fill="none">
      <defs>
        <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BODY_TOP} />
          <stop offset="1" stopColor={BODY_BOTTOM} />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="186" rx="58" ry="10" fill={RIM} opacity="0.25" />
      <path
        d="M24 96 C22 146, 62 182, 100 184 L140 184 C178 182, 218 146, 216 96 Z"
        fill="url(#b)"
      />
      <ellipse cx="120" cy="96" rx="96" ry="22" fill={INSIDE} stroke={RIM} strokeWidth="7" />
      <ellipse cx="120" cy="100" rx="74" ry="12" fill={BODY_TOP} opacity="0.4" />
    </svg>
  );
}
