import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  ASPECT,
  X_MAX,
  Y_MAX,
  project,
  unproject,
} from '../lib/projection.ts';

/**
 * The failure this is here to catch is not a crash.
 *
 * A projection with a flipped sign draws a perfectly convincing map with every
 * light in the wrong place, and it looks correct from one hemisphere — which is
 * why the four cities below are one per quadrant. This replaces the shader
 * check that guarded `Globe.tsx`, deleted with the sphere on 6 September 2026.
 */

/** One in each quadrant. A flipped latitude and a flipped longitude each look
 *  right from one of them. */
const CITIES = [
  { name: 'London', lat: 51.5, lon: -0.1 },
  { name: 'Sydney', lat: -33.9, lon: 151.2 },
  { name: 'Rio', lat: -22.9, lon: -43.2 },
  { name: 'Anchorage', lat: 61.2, lon: -149.9 },
];

describe('Equal Earth', () => {
  test('every quadrant survives the round trip', () => {
    for (const city of CITIES) {
      const p = project(city.lat, city.lon);
      const back = unproject(p.x, p.y);
      assert.ok(back, `${city.name} came back off the earth`);
      assert.ok(
        Math.abs(back.lat - city.lat) < 1e-6,
        `${city.name} latitude: ${back.lat}`,
      );
      assert.ok(
        Math.abs(back.lon - city.lon) < 1e-6,
        `${city.name} longitude: ${back.lon}`,
      );
    }
  });

  test('the axes run the right way', () => {
    // North is up and east is right, which is the whole of what a sign error
    // gets wrong.
    assert.ok(project(50, 0).y > project(-50, 0).y);
    assert.ok(project(0, 90).x > project(0, -90).x);
    assert.equal(Math.round(project(0, 0).x * 1e9), 0);
    assert.equal(Math.round(project(0, 0).y * 1e9), 0);
  });

  test('the map is 2.05:1 and nothing leaves it', () => {
    assert.ok(Math.abs(ASPECT - 2.0546) < 0.001, `aspect ${ASPECT}`);
    for (let lat = -90; lat <= 90; lat += 1) {
      for (let lon = -180; lon <= 180; lon += 5) {
        const p = project(lat, lon);
        assert.ok(Math.abs(p.x) <= X_MAX + 1e-9, `x at ${lat},${lon}: ${p.x}`);
        assert.ok(Math.abs(p.y) <= Y_MAX + 1e-9, `y at ${lat},${lon}: ${p.y}`);
      }
    }
  });

  test('the corners of the frame are off the earth', () => {
    // The boundary is a curve, so the rectangle around it has empty corners.
    // A pixel there must come back null rather than as some plausible place —
    // it is what keeps the ocean from being painted into the margins.
    assert.equal(unproject(X_MAX * 0.99, Y_MAX * 0.99), null);
    assert.equal(unproject(-X_MAX * 0.99, -Y_MAX * 0.99), null);
    assert.equal(unproject(0, Y_MAX * 1.01), null);
    assert.ok(unproject(0, 0));
  });
});
