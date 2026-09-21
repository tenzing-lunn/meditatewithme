import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  COVER_HEIGHT_SHARE,
  COVER_TOP_SHARE,
  containFit,
  coverFit,
  longitudeFromOffset,
} from '../lib/earthView.ts';
import { X_MAX, project } from '../lib/projection.ts';

const LISBON = { lat: 38.7, lon: -9.1 };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

describe('the earth behind the doors', () => {
  test('contains the whole earth, centred, for the sitting', () => {
    const f = containFit(1000, 1000);
    assert.ok(near(f.width, 1000));
    assert.ok(near(f.left, 0));
    assert.ok(near(f.top, (1000 - f.height) / 2));
  });

  test('covers a wide screen with the whole width of the earth', () => {
    const f = coverFit(1280, 800, LISBON);
    assert.ok(near(f.width, 1280));
    assert.ok(near(f.left, 0));
    assert.ok(near(f.top, 800 * COVER_TOP_SHARE));
  });

  test('gives a phone an earth tall enough to see, cropped around you', () => {
    const f = coverFit(390, 844, LISBON);
    assert.ok(near(f.height, 844 * COVER_HEIGHT_SHARE));
    assert.ok(f.width > 390);
    const p = project(LISBON.lat, LISBON.lon);
    assert.ok(near(f.left + (p.x + X_MAX) * f.scale, 195));
  });

  test('never leaves dusk beside the map at the date line', () => {
    const east = coverFit(390, 844, { lat: 0, lon: 179 });
    assert.ok(near(east.left + east.width, 390));
    const west = coverFit(390, 844, { lat: 0, lon: -179 });
    assert.ok(near(west.left, 0));
  });

  test('reads a time zone as a longitude', () => {
    assert.equal(longitudeFromOffset(0), 0);
    assert.equal(longitudeFromOffset(-60), 15);
    assert.equal(longitudeFromOffset(300), -75);
    assert.equal(longitudeFromOffset(-720), -180);
    assert.equal(longitudeFromOffset(-840), -150);
    assert.equal(longitudeFromOffset(Number.NaN), 0);
  });
});
