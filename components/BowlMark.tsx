/**
 * The singing bowl, as the site's mark: the bowl that began a sitting on
 * the old rail (`Bowl.tsx`), in blue, its side stacked in bands from base
 * to rim, with its wooden striker lying in front of it. Tenzing, 28 September 2026, in
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

/**
 * Muted, as metal and wood are, not bright as plastic: the bands in slate
 * blues, darker at the base, and a sheen across the whole side so it reads
 * round. The striker is turned wood in the same dull key, with a suede
 * sleeve the colour of the bowl.
 */
const BANDS = ['#2a4866', '#3a5f84', '#4d76a0', '#34597e', '#6189b3', '#456d95', '#7699bf'];
const INSIDE = '#c9d7e4';
const RIM = '#263c52';
const WOOD = '#8a7661';
const WOOD_DARK = '#5a4a3b';
const WOOD_LIGHT = '#b3a18c';

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
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 14 232 232">` +
    `<defs>` +
    // Light from the upper left: bright down the left of the side, shade on the right.
    `<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>` +
    `<stop offset="0.35" stop-color="#ffffff" stop-opacity="0.06"/>` +
    `<stop offset="0.75" stop-color="#000000" stop-opacity="0.08"/>` +
    `<stop offset="1" stop-color="#000000" stop-opacity="0.3"/>` +
    `</linearGradient>` +
    // Across the stick, so it reads as turned and round.
    `<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${WOOD_LIGHT}"/>` +
    `<stop offset="0.45" stop-color="${WOOD}"/>` +
    `<stop offset="1" stop-color="${WOOD_DARK}"/>` +
    `</linearGradient>` +
    `<linearGradient id="suede" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#7f98b2"/>` +
    `<stop offset="1" stop-color="${RIM}"/>` +
    `</linearGradient>` +
    `</defs>` +
    // Partly see-through, so the tab behind shows in it.
    `<g opacity="0.8">` +
    `<ellipse cx="${CX}" cy="${BASE_Y + 12}" rx="64" ry="11" fill="${RIM}" opacity="0.25"/>` +
    bands +
    `<path d="${ring(0, false)} ${ring(1, true)} Z" fill="url(#sheen)"/>` +
    `<ellipse cx="${CX}" cy="${RIM_Y}" rx="${RIM_W}" ry="${f(RIM_W * TILT)}" fill="${INSIDE}" stroke="${RIM}" stroke-width="6"/>` +
    `<ellipse cx="${CX}" cy="${RIM_Y + 4}" rx="70" ry="12" fill="${BANDS[3]}" opacity="0.3"/>` +
    `</g>` +
    // The striker, lying on the ground in front of the bowl and to its
    // right, its suede end toward the bowl, with its shadow under it.
    `<g opacity="0.9" transform="rotate(-10 172 202)">` +
    `<rect x="120" y="207" width="104" height="9" rx="4.5" fill="#000000" opacity="0.13"/>` +
    `<rect x="120" y="194" width="104" height="15" rx="7.5" fill="url(#wood)"/>` +
    `<rect x="120" y="193" width="44" height="17" rx="8.5" fill="url(#suede)"/>` +
    `</g>` +
    `</svg>`
  );
}
