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

/**
 * The bands, base to rim: a singing bowl's hammered rings of colour,
 * stacked up its side, each a curved stripe following the bowl round.
 */
const BANDS = ['#1d3f63', '#2c5a86', '#3f75a6', '#2a527c', '#5b8fbf', '#3a6c9b', '#7aa8d2'];
const INSIDE = '#dbe8f4';
const RIM = '#18395c';

const RIM_Y = 96;
const BASE_Y = 180;
const RIM_W = 96;
const BASE_W = 30;
/** Depth of each ring's ellipse against its width: the same tilt as the mouth. */
const TILT = 22 / 96;

/** Half-width of the bowl at depth t (0 at the rim, 1 at the base). */
const widthAt = (t: number) => BASE_W + (RIM_W - BASE_W) * Math.sqrt(1 - t * t);

/** The front half of the ring at depth t, left to right (or back). */
function ring(t: number, back: boolean): string {
  const w = widthAt(t);
  const y = RIM_Y + (BASE_Y - RIM_Y) * t;
  const [from, to] = back ? [120 + w, 120 - w] : [120 - w, 120 + w];
  return `${back ? 'L' : 'M'}${from.toFixed(2)} ${y.toFixed(2)} A${w.toFixed(2)} ${(w * TILT).toFixed(2)} 0 0 ${back ? 1 : 0} ${to.toFixed(2)} ${y.toFixed(2)}`;
}

export function BowlMark({ size }: { size: number }) {
  // Wide and round, as a singing bowl is: a mouth much wider than the bowl
  // is deep, the sides rounding into a small base, on a low cushion.
  const n = BANDS.length;
  return (
    <svg width={size} height={size} viewBox="16 26 208 208" fill="none">
      <ellipse cx="120" cy="190" rx="62" ry="10" fill={RIM} opacity="0.22" />
      {BANDS.map((c, k) => {
        // Drawn from the base up, so each band laps the one below it.
        const lo = 1 - k / n;
        const hi = 1 - (k + 1) / n;
        return <path key={c + k} d={`${ring(hi, false)} ${ring(lo, true)} Z`} fill={c} />;
      })}
      <ellipse cx="120" cy={RIM_Y} rx={RIM_W} ry={RIM_W * TILT} fill={INSIDE} stroke={RIM} strokeWidth="7" />
      <ellipse cx="120" cy={RIM_Y + 4} rx="74" ry="12" fill={BANDS[4]} opacity="0.35" />
    </svg>
  );
}
