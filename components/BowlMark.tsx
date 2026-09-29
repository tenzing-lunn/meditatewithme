/**
 * The singing bowl, as the site's mark: the bowl that began a sitting on
 * the old rail (`Bowl.tsx`), in blue, its side stacked in bands from base
 * to rim, with its wooden striker standing beside it. Tenzing, 28 September 2026, in
 * place of the flame.
 *
 * One drawing, as a string, for both uses: the tab icon is this SVG served
 * as it is (`app/bowl.svg/route.ts`), so it stays sharp at any size and its
 * ground is transparent; the home-screen icon (`app/apple-icon.tsx`) puts
 * it on the pale water as an image, because iOS wants an opaque square.
 * Literal colours only: satori reads no custom properties.
 */

/** The page's pale water, for the home-screen icon's ground. */
export const WATER = '#e5e9ec';

/** The bands, base to rim: each a curved stripe following the bowl round. */
const BANDS = ['#1d3f63', '#2c5a86', '#3f75a6', '#2a527c', '#5b8fbf', '#3a6c9b', '#7aa8d2'];
const INSIDE = '#dbe8f4';
const RIM = '#18395c';
const WOOD = '#9a6a3f';
const WOOD_DARK = '#6b4526';
const WOOD_LIGHT = '#c08a58';

const CX = 112;
const RIM_Y = 92;
const BASE_Y = 170;
const RIM_W = 90;
const BASE_W = 28;
/** Depth of each ring's ellipse against its width: the same tilt as the mouth. */
const TILT = 0.23;

const f = (n: number) => n.toFixed(2);

/** Half-width of the bowl at depth t (0 at the rim, 1 at the base). */
const widthAt = (t: number) => BASE_W + (RIM_W - BASE_W) * Math.sqrt(1 - t * t);

/** The front half of the ring at depth t, left to right, or back again. */
function ring(t: number, back: boolean): string {
  const w = widthAt(t);
  const y = RIM_Y + (BASE_Y - RIM_Y) * t;
  const [from, to] = back ? [CX + w, CX - w] : [CX - w, CX + w];
  return `${back ? 'L' : 'M'}${f(from)} ${f(y)} A${f(w)} ${f(w * TILT)} 0 0 ${back ? 1 : 0} ${f(to)} ${f(y)}`;
}

/** The mark, 240 units square, on a transparent ground. */
export function bowlSvg(): string {
  const n = BANDS.length;
  const bands = BANDS.map((c, k) => {
    // From the base up, so each band laps the one below it.
    const lo = 1 - k / n;
    const hi = 1 - (k + 1) / n;
    return `<path d="${ring(hi, false)} ${ring(lo, true)} Z" fill="${c}"/>`;
  }).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 6 236 236">` +
    // The cushion's shadow, then the bowl.
    `<ellipse cx="${CX}" cy="${BASE_Y + 12}" rx="64" ry="11" fill="${RIM}" opacity="0.2"/>` +
    bands +
    `<ellipse cx="${CX}" cy="${RIM_Y}" rx="${RIM_W}" ry="${f(RIM_W * TILT)}" fill="${INSIDE}" stroke="${RIM}" stroke-width="7"/>` +
    `<ellipse cx="${CX}" cy="${RIM_Y + 4}" rx="70" ry="12" fill="${BANDS[4]}" opacity="0.35"/>` +
    // The striker, wooden, standing up right beside the bowl with a slight
    // lean: a turned stick, rounded at both ends, lit down one side.
    `<g transform="rotate(-10 212 186)">` +
    `<rect x="204" y="58" width="17" height="130" rx="8.5" fill="${WOOD}" stroke="${WOOD_DARK}" stroke-width="3"/>` +
    `<rect x="208" y="66" width="4" height="112" rx="2" fill="${WOOD_LIGHT}" opacity="0.8"/>` +
    `</g>` +
    `</svg>`
  );
}
