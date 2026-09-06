/**
 * Equal Earth: the map at `/world`, as two functions.
 *
 * Pure — no React, no canvas, no I/O — so it can be tested, which matters more
 * here than it looks. A projection fails in a way that looks plausible: a map
 * with lights on it, all of them in the wrong places, and a flipped sign is
 * indistinguishable from correct if you only ever check one hemisphere. See
 * `tests/projection.test.ts`.
 *
 * WHY THIS PROJECTION
 * The cheap flat map is the one where longitude is the x axis and latitude is
 * the y axis, and it is cheap here in particular: `land.json` is already in
 * those coordinates and the sun maths comes out in them too. It also inflates
 * everything away from the equator, so Greenland arrives the size of Africa and
 * Antarctica becomes a bar along the bottom of the frame.
 *
 * That is not a taste objection on a page that counts people. The northern
 * hemisphere holds most of them; a projection that gives the north more room
 * per person than the south is drawing a claim about where the world is, on top
 * of a picture whose only job is to say where the world actually is tonight.
 * Equal Earth (Šavrič, Patterson & Jenny, 2018) is equal-area — a square
 * kilometre is a square kilometre wherever it falls — and it is a curve rather
 * than a grid, which keeps `/world` an object to look at rather than a chart.
 *
 * The constants are the paper's. Do not tune them; they are what make it
 * equal-area.
 */

const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;

/** sin of the parametric latitude at the pole; the paper's √3⁄2. */
const K = Math.sqrt(3) / 2;

const RAD = Math.PI / 180;

/** The paper's y(θ), which is also the length of the central meridian. */
function poly(t: number): number {
  const t2 = t * t;
  const t6 = t2 * t2 * t2;
  return t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
}

/** Its derivative, which the x term and the inverse both need. */
function polyPrime(t: number): number {
  const t2 = t * t;
  const t6 = t2 * t2 * t2;
  return A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2);
}

/** Half the map, in projection units: 2.7066 wide by 1.3174 tall. */
export const X_MAX = Math.PI / (K * A1);
export const Y_MAX = poly(Math.asin(K));

/** The map's own aspect, which the frame is fitted to rather than filled. */
export const ASPECT = X_MAX / Y_MAX;

export interface Point {
  x: number;
  y: number;
}

/** Degrees to projection units. `y` is up here; the canvas flips it. */
export function project(lat: number, lon: number): Point {
  const theta = Math.asin(K * Math.sin(lat * RAD));
  return {
    x: (lon * RAD * Math.cos(theta)) / (K * polyPrime(theta)),
    y: poly(theta),
  };
}

/**
 * Back the other way — and the reason the map can be shaded at all.
 *
 * The terrain and the terminator are both computed *per screen pixel*: take a
 * pixel, ask which place on earth it is, and shade it. There is no closed form
 * for θ from y, so it is a few turns of Newton on a function that is monotonic
 * over the whole range and whose derivative never approaches zero.
 *
 * Null means "off the earth" — the corners outside the curve — and callers use
 * it to leave those pixels transparent rather than painting a rectangle.
 */
export function unproject(
  x: number,
  y: number,
): { lat: number; lon: number } | null {
  if (Math.abs(y) > Y_MAX) return null;

  let theta = y / A1;
  for (let i = 0; i < 6; i += 1) {
    const step = (poly(theta) - y) / polyPrime(theta);
    theta -= step;
    if (Math.abs(step) < 1e-12) break;
  }

  const sinLat = Math.sin(theta) / K;
  if (sinLat < -1 || sinLat > 1) return null;

  const lon = (x * K * polyPrime(theta)) / Math.cos(theta) / RAD;
  if (lon < -180 || lon > 180) return null;

  return { lat: Math.asin(sinLat) / RAD, lon };
}
