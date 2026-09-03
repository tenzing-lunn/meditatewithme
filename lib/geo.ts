/**
 * Coarsening a position into a cell.
 *
 * Pure — no React, no I/O, no request objects. The route handler pulls the
 * numbers off the edge's headers; everything about *how coarse* a stored
 * position is lives here, where it can be tested and where there is exactly one
 * of it.
 *
 * WHY A GRID AND NOT A ROUNDED READING
 * Rounding a coordinate to two decimal places still stores a reading — it just
 * stores a slightly worse one, and it is the sort of thing that gets "improved"
 * to three decimals by somebody who thinks the globe looks blocky. A grid cell
 * is a different kind of value: it names a region that thousands of people are
 * in, and the original reading is discarded before it is ever written down.
 * `snapToCell` returns the CENTRE of the cell, so the number in the database
 * does not even encode which corner of it somebody was nearest.
 *
 * The bar this was designed against is an ordinary server access log, which
 * holds a full IP address. One degree is very much coarser than that.
 */

/**
 * One degree: about 111km north-south, and less than that east-west everywhere
 * except the equator.
 *
 * Chosen against the smallest count this will realistically see rather than the
 * largest. At a tenth of a degree a single person sitting alone in the room is
 * a light on their own town; at one degree they are a light on their region,
 * and two people in the same city are one light between them.
 *
 * It is also why the globe draws each cell as a bloom rather than a pin — at
 * this size a hard mark would be claiming a precision the number does not have,
 * and at high counts a lattice of hard marks would look like a grid rather than
 * like people.
 */
export const GRID_DEGREES = 1;

export interface Cell {
  lat: number;
  lon: number;
}

/** Longitude into [-180, 180), the range every map projection expects. */
export function wrapLongitude(lon: number): number {
  const wrapped = ((lon + 180) % 360 + 360) % 360 - 180;
  // -180 and 180 are the same meridian; normalise so one cell is not two.
  return wrapped === -0 ? 0 : wrapped;
}

/**
 * The centre of the grid cell containing this position, or null if it is not a
 * position at all.
 *
 * Null rather than a default, and that distinction is load-bearing: geo headers
 * are absent on localhost, absent behind some VPNs, and absent whenever the
 * edge cannot place an address. A missing cell means "not placed", and a
 * heartbeat that cannot be placed still counts — it simply is not on the globe.
 * Defaulting to (0, 0) would put every unplaceable sitting in the Gulf of
 * Guinea, which is the classic version of this bug and would be the single
 * brightest light on the map.
 */
export function snapToCell(
  lat: unknown,
  lon: unknown,
  grid: number = GRID_DEGREES,
): Cell | null {
  // Rejected BEFORE Number(), not after, and this is the whole failure mode
  // this function exists to prevent. `Number(null)` is 0 and `Number('')` is
  // 0 — and a missing header reads as exactly those two. Coercing first would
  // place every localhost hit, every VPN and every request the edge could not
  // resolve at 0°N 0°E, which is in the Gulf of Guinea and would be the
  // brightest light on the map by a wide margin.
  if (lat === null || lat === undefined || lat === '') return null;
  if (lon === null || lon === undefined || lon === '') return null;

  const rawLat = Number(lat);
  const rawLon = Number(lon);

  if (!Number.isFinite(rawLat) || !Number.isFinite(rawLon)) return null;
  if (rawLat < -90 || rawLat > 90) return null;
  if (rawLon < -180 || rawLon > 180) return null;

  const half = grid / 2;
  // Clamped before flooring: exactly 90 would otherwise land in a cell whose
  // centre is above the pole.
  const lat0 = Math.min(90 - half, Math.max(-90 + half, rawLat));

  return {
    lat: round6(Math.floor(lat0 / grid) * grid + half),
    lon: round6(wrapLongitude(Math.floor(wrapLongitude(rawLon) / grid) * grid + half)),
  };
}

/**
 * Kill floating-point dust.
 *
 * `Math.floor(x / 1) * 1 + 0.5` is exact, but a non-integer grid is not, and
 * two rows that should share a cell must compare equal — they are grouped by
 * these two numbers, and 51.5 alongside 51.50000000000001 is two lights where
 * there is one room.
 */
function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/** A cell with people in it, as `/api/world` reports it. */
export interface WorldPoint {
  lat: number;
  lon: number;
  /** Candles lit here this hour, including people who have since left. */
  lit: number;
  /** How many of those are still present. */
  live: number;
}

/**
 * Where the sun is, as a position on the earth's surface.
 *
 * The globe's terminator is real rather than a shader trick, and it is real for
 * the same reason the candle is: two people opening this in the same second in
 * different timezones must see the same earth. `serverNow()` feeds this, so
 * they do.
 *
 * A low-precision solar position — the equation of centre only, no nutation, no
 * aberration. It is out by well under a degree, which is a few pixels of
 * terminator on a globe this size and considerably less than the softness the
 * atmosphere is drawn with.
 */
export function subsolarPoint(atMs: number): Cell {
  // Julian centuries since J2000.0.
  const jd = atMs / 86_400_000 + 2440587.5;
  const t = (jd - 2451545) / 36525;

  const meanLongitude = norm360(280.46646 + t * (36000.76983 + t * 0.0003032));
  const meanAnomaly = norm360(357.52911 + t * (35999.05029 - t * 0.0001537));
  const m = rad(meanAnomaly);

  const centre =
    Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m) * 0.000289;

  const trueLongitude = rad(meanLongitude + centre);

  // Mean obliquity of the ecliptic.
  const obliquity = rad(
    23.439291 - t * (0.0130042 + t * (0.00000016 - t * 0.000000504)),
  );

  const declination = Math.asin(
    Math.sin(obliquity) * Math.sin(trueLongitude),
  );

  // Right ascension, then the hour angle against Greenwich mean sidereal time.
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(trueLongitude),
    Math.cos(trueLongitude),
  );

  const gmst = norm360(
    280.46061837 +
      360.98564736629 * (jd - 2451545) +
      t * t * (0.000387933 - t / 38710000),
  );

  return {
    lat: deg(declination),
    lon: wrapLongitude(deg(rightAscension) - gmst),
  };
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const norm360 = (d: number) => ((d % 360) + 360) % 360;
