import { snapToCell, type WorldPoint } from '@/lib/geo';

/**
 * An inhabited earth, for looking at while building one.
 *
 * WHY THIS EXISTS
 * The globe cannot be evaluated against real data, and that is not a temporary
 * state of affairs. `/api/heartbeat` derives a cell from Vercel's edge headers,
 * which do not exist in `next dev` — so every heartbeat written locally is
 * unplaced by design, and the globe on localhost is correctly, permanently
 * empty. The only real cells the project has ever recorded are a handful over
 * London. Neither of those tells you whether the thing looks right.
 *
 * WHY IT CANNOT LEAK
 * `process.env.NODE_ENV` is inlined by Next at build time, so the guard in
 * `useWorld` is the literal `false` in a production build and the code that
 * reads this is dead. There is no flag, no env var and no header that turns it
 * on in production — the only way to ship it is to delete the guard.
 *
 * That was not enough on its own, and the near-miss is worth keeping: with a
 * static import at the top of `useWorld`, the dead branch was removed and this
 * module was bundled anyway, because a bundler will not drop a module that
 * computes a value at import time. The fixture rode into the production chunk
 * unreachable but present. `useWorld` now reaches it through a dynamic import
 * *inside* the dead branch, so the reference dies with the branch. **If this
 * module is ever imported normally from anywhere, that protection is gone.**
 *
 * That matters more here than it would elsewhere. A meditation site inventing
 * company is the specific dishonesty this product refuses everywhere else: the
 * count degrades to hidden rather than to zero, the globe goes dark rather than
 * empty, and `/api/world` reports what it actually read. A demo fixture that
 * escaped into production would undo all of that at once, so it is built so it
 * cannot.
 *
 * The counts are deliberately uneven and `live` is always below `lit` — a grid
 * of identical lights would flatter the renderer and hide exactly the thing
 * worth looking at, which is whether a dim candle reads at all next to a bright
 * one.
 */

/** `[name, latitude, longitude, lit this hour, still here]` */
const CITIES: [string, number, number, number, number][] = [
  ['London', 51.507, -0.128, 9, 6],
  ['Paris', 48.857, 2.352, 5, 3],
  ['Berlin', 52.52, 13.405, 4, 2],
  ['Reykjavik', 64.147, -21.942, 1, 1],
  ['Moscow', 55.755, 37.617, 3, 1],
  ['Istanbul', 41.008, 28.978, 4, 2],
  ['Cairo', 30.044, 31.236, 3, 1],
  ['Lagos', 6.524, 3.379, 2, 2],
  ['Nairobi', -1.292, 36.821, 2, 1],
  ['Johannesburg', -26.204, 28.047, 2, 1],
  ['Delhi', 28.613, 77.209, 7, 5],
  ['Mumbai', 19.076, 72.877, 5, 3],
  ['Kathmandu', 27.7, 85.324, 3, 3],
  ['Bangkok', 13.756, 100.501, 3, 1],
  ['Singapore', 1.352, 103.82, 4, 2],
  ['Beijing', 39.904, 116.407, 4, 1],
  ['Seoul', 37.566, 126.978, 3, 2],
  ['Tokyo', 35.682, 139.692, 8, 5],
  ['Sydney', -33.868, 151.209, 4, 3],
  ['Auckland', -36.848, 174.763, 2, 1],
  ['Anchorage', 61.218, -149.9, 1, 0],
  ['Vancouver', 49.283, -123.121, 3, 2],
  ['San Francisco', 37.775, -122.419, 7, 4],
  ['Los Angeles', 34.052, -118.244, 5, 2],
  ['Mexico City', 19.433, -99.133, 4, 3],
  ['Toronto', 43.653, -79.383, 3, 1],
  ['New York', 40.713, -74.006, 10, 7],
  ['Rio de Janeiro', -22.907, -43.173, 3, 2],
  ['Sao Paulo', -23.551, -46.633, 4, 2],
  ['Buenos Aires', -34.604, -58.382, 2, 1],
];

/**
 * Through `snapToCell`, not hand-written cell centres.
 *
 * The fixture has to be wrong in the same way the real data is wrong. Writing
 * `{ lat: 51.5, lon: -0.5 }` directly would let the grid change under it and
 * leave the demo showing a precision the live globe never has — which is the
 * one thing a fixture used for judging the rendering must not do.
 */
export const DEMO_POINTS: WorldPoint[] = CITIES.flatMap(
  ([, lat, lon, lit, live]) => {
    const cell = snapToCell(lat, lon);
    return cell ? [{ lat: cell.lat, lon: cell.lon, lit, live }] : [];
  },
);

export const DEMO_PLACED = DEMO_POINTS.reduce((n, p) => n + p.lit, 0);
