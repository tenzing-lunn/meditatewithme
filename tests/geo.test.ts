import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  GRID_DEGREES,
  snapToCell,
  subsolarPoint,
  wrapLongitude,
} from '../lib/geo.ts';

const at = (iso: string) => Date.parse(iso);

describe('wrapLongitude', () => {
  test('leaves the ordinary range alone', () => {
    assert.equal(wrapLongitude(0), 0);
    assert.equal(wrapLongitude(-179), -179);
    assert.equal(wrapLongitude(179), 179);
  });

  test('folds the antimeridian onto one value', () => {
    // -180 and 180 are the same meridian. Two cells there would be one room
    // drawn as two lights, on the one part of the map where nobody would
    // notice it was wrong.
    assert.equal(wrapLongitude(180), -180);
    assert.equal(wrapLongitude(-180), -180);
  });

  test('wraps past a full turn in both directions', () => {
    assert.equal(wrapLongitude(190), -170);
    assert.equal(wrapLongitude(-190), 170);
    assert.equal(wrapLongitude(540), -180);
  });

  test('never returns negative zero', () => {
    // `-0` and `0` are unequal as map keys via template strings, which would
    // split one cell in two.
    assert.equal(Object.is(wrapLongitude(-0), -0), false);
  });
});

describe('snapToCell', () => {
  test('returns the centre of the containing cell', () => {
    // London, roughly. One degree is about 111km, so this is the region, and
    // 51.5 / -0.5 is the middle of it rather than the corner nearest the
    // reading it came from.
    assert.deepEqual(snapToCell(51.5074, -0.1278), { lat: 51.5, lon: -0.5 });
  });

  test('two readings in the same region become one cell', () => {
    // This is the whole point of the grid. Nothing downstream can tell these
    // two people apart by position, because after this there is nothing to
    // tell apart.
    assert.deepEqual(
      snapToCell(51.5074, -0.1278),
      snapToCell(51.9, -0.9),
    );
  });

  test('places the southern and western hemispheres correctly', () => {
    // Floor, not truncate: -33.9 must land in the cell below -33, not above.
    assert.deepEqual(snapToCell(-33.86, 151.2), { lat: -33.5, lon: 151.5 });
    assert.deepEqual(snapToCell(-22.9, -43.2), { lat: -22.5, lon: -43.5 });
  });

  test('accepts strings, because headers are strings', () => {
    assert.deepEqual(snapToCell('51.5074', '-0.1278'), {
      lat: 51.5,
      lon: -0.5,
    });
  });

  test('refuses anything that is not a position', () => {
    // Every one of these is a real header value: absent, blank, or garbage.
    // Null means "not placed", which is a heartbeat that still counts.
    for (const bad of [null, undefined, '', 'abc', NaN, Infinity]) {
      assert.equal(snapToCell(bad, 0), null, String(bad));
      assert.equal(snapToCell(0, bad), null, String(bad));
    }
  });

  test('refuses out-of-range coordinates', () => {
    assert.equal(snapToCell(91, 0), null);
    assert.equal(snapToCell(-91, 0), null);
    assert.equal(snapToCell(0, 181), null);
    assert.equal(snapToCell(0, -181), null);
  });

  test('does not put a cell centre past the pole', () => {
    const north = snapToCell(90, 0);
    const south = snapToCell(-90, 0);
    assert.ok(north && north.lat <= 90 - GRID_DEGREES / 2);
    assert.ok(south && south.lat >= -90 + GRID_DEGREES / 2);
  });

  test('null island is a real place and everywhere else is not it', () => {
    // The classic version of this bug: an unplaceable request defaulting to
    // (0, 0) puts every VPN and every localhost hit in the Gulf of Guinea,
    // which would be the brightest light on the map.
    assert.equal(snapToCell(null, null), null);
    assert.deepEqual(snapToCell(0, 0), { lat: 0.5, lon: 0.5 });
  });

  test('cell centres are exact enough to group by', () => {
    // Rows are grouped by these two numbers as a string key. 51.5 alongside
    // 51.50000000000001 is one room drawn as two lights.
    for (let lat = -89; lat <= 89; lat += 0.37) {
      const cell = snapToCell(lat, 0);
      assert.ok(cell);
      assert.equal(cell.lat, Number(cell.lat.toFixed(6)));
    }
  });
});

describe('subsolarPoint', () => {
  /**
   * The terminator is real for the same reason the candle is: two people
   * opening this in the same second must see the same earth. These check it
   * against the four moments everybody already knows the answer to.
   */
  test('sits on the equator at the equinoxes', () => {
    assert.ok(Math.abs(subsolarPoint(at('2026-03-20T12:00:00Z')).lat) < 0.5);
    assert.ok(Math.abs(subsolarPoint(at('2026-09-22T12:00:00Z')).lat) < 0.5);
  });

  test('reaches the tropics at the solstices', () => {
    const june = subsolarPoint(at('2026-06-21T12:00:00Z')).lat;
    const december = subsolarPoint(at('2026-12-21T12:00:00Z')).lat;
    assert.ok(Math.abs(june - 23.44) < 0.3, `June ${june}`);
    assert.ok(Math.abs(december + 23.44) < 0.3, `December ${december}`);
  });

  test('is over Greenwich at noon UTC, within the equation of time', () => {
    // The sun is not over the prime meridian at exactly 12:00 — that is what
    // the equation of time measures, and it never exceeds about 4 degrees.
    const lon = subsolarPoint(at('2026-03-20T12:00:00Z')).lon;
    assert.ok(Math.abs(lon) < 4.5, String(lon));
  });

  test('travels west at fifteen degrees an hour', () => {
    const noon = subsolarPoint(at('2026-06-21T12:00:00Z')).lon;
    const later = subsolarPoint(at('2026-06-21T15:00:00Z')).lon;
    // Three hours later, 45 degrees west. Wrapped, because the subtraction can
    // cross the antimeridian.
    assert.ok(Math.abs(wrapLongitude(noon - later) - 45) < 0.2);
  });

  test('always returns a drawable position', () => {
    // Stepping through a year: the globe reads this every frame, and one NaN
    // is a black screen rather than a slightly wrong terminator.
    for (let d = 0; d < 365; d += 7) {
      const p = subsolarPoint(at('2026-01-01T00:00:00Z') + d * 86_400_000);
      assert.ok(Number.isFinite(p.lat) && Number.isFinite(p.lon));
      assert.ok(p.lat >= -24 && p.lat <= 24);
      assert.ok(p.lon >= -180 && p.lon <= 180);
    }
  });
});
