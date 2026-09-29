/**
 * The singing bowl, as a mark: the bowl that began a sitting on the old
 * rail (`Bowl.tsx`), drawn in blue for the tab and the home screen.
 * Tenzing, 28 September 2026, in place of the flame.
 *
 * Rendered by satori inside `ImageResponse`, never by the browser, so it is
 * plain SVG with literal colours: satori reads neither custom properties
 * nor `currentColor`. At 32px the rings and the shadow would be mud, so it
 * is the body, the mouth and the rim only.
 */

/** The page's pale water, so the tab reads as the site. */
export const WATER = '#e5e9ec';

const BODY_TOP = '#7ea9d1';
const BODY_BOTTOM = '#2f5f8f';
const INSIDE = '#dbe8f4';
const RIM = '#1f4a75';

export function BowlMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="24 44 192 140" fill="none">
      <defs>
        <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BODY_TOP} />
          <stop offset="1" stopColor={BODY_BOTTOM} />
        </linearGradient>
      </defs>
      <path d="M32 78 C32 138, 70 174, 120 174 C170 174, 208 138, 208 78 Z" fill="url(#b)" />
      <ellipse cx="120" cy="78" rx="88" ry="24" fill={INSIDE} stroke={RIM} strokeWidth="7" />
      <ellipse cx="120" cy="81" rx="68" ry="14" fill={BODY_TOP} opacity="0.45" />
    </svg>
  );
}
