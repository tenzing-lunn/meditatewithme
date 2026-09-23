import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { flickConfig, ringsAt, skimAt, skimConfig, spotFor, touchRings } from '../lib/pond.ts';

describe('skimAt', () => {
  const c = skimConfig({ x: 100, y: 800 }, { x: 720, y: 400 }, 1440, 900);

  test('leaves the hand and stops where it was thrown to', () => {
    const start = skimAt(0, c).stone;
    assert.ok(Math.abs(start.x - 100) < 1e-9 && Math.abs(start.y - 800) < 1e-9);
    const end = skimAt(c.T, c).stone;
    assert.ok(Math.abs(end.x - 720) < 1e-6 && Math.abs(end.y - 400) < 1e-6);
  });

  test('a skim, not a bounce: the lift never passes H', () => {
    for (let t = 0; t <= c.T; t += 0.01) assert.ok(skimAt(t, c).stone.h <= c.H + 1e-9);
  });

  test('touches the water n times, then sinks', () => {
    assert.equal(skimAt(c.T, c).touches.length, c.n);
    assert.equal(skimAt(c.T, c).stone.sunk, 0);
    assert.equal(skimAt(c.T + c.sink + 0.01, c).stone.sunk, 1);
  });

  test('always slowing down', () => {
    let last = Infinity;
    for (let t = 0.05; t <= c.T; t += 0.05) {
      const a = skimAt(t - 0.05, c).stone;
      const b = skimAt(t, c).stone;
      const v = Math.hypot(b.x - a.x, b.y - a.y);
      assert.ok(v <= last + 1e-9);
      last = v;
    }
  });
});

describe('rings', () => {
  test('fade as they spread, and are gone by the end of their life', () => {
    const s = { x: 0, y: 0, reach: 150, period: 2.8, life: 10, phase: 0, strength: 1, yours: false };
    for (const r of ringsAt(7.3, [s])) assert.ok(r.o >= 0 && r.o <= 1 && r.r <= 153);
    const old = touchRings([{ x: 0, y: 0, age: 5, k: 1 }]);
    assert.equal(old.length, 0);
  });
});

describe('spotFor', () => {
  test('the same key, the same place; and it keeps out of the way', () => {
    const avoid = (p: { x: number; y: number }) => p.y > 0.6;
    assert.deepEqual(spotFor('51,0#0', avoid), spotFor('51,0#0', avoid));
    for (let i = 0; i < 50; i++) assert.ok(spotFor(`k${i}`, avoid).y <= 0.6);
  });
});

describe('flickConfig', () => {
  test('lands where the water was touched in 1.9 seconds, near or far', () => {
    for (const to of [{ x: 200, y: 700 }, { x: 300, y: 80 }]) {
      const c = flickConfig({ x: 150, y: 870 }, to, -1);
      assert.equal(c.T, 1.9);
      const end = skimAt(1.9, c).stone;
      assert.ok(Math.abs(end.x - to.x) < 1e-6 && Math.abs(end.y - to.y) < 1e-6);
      assert.ok(c.n >= 3 && c.n <= 9);
    }
  });
});
