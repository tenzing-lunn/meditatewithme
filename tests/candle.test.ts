import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { WAX_STUB, clampHeight, minutesAtHeight, waxHeight } from '../lib/candle.ts';
import { TIMER_MAX_MINUTES, TIMER_MIN_MINUTES, TIMER_STOPS } from '../lib/timer.ts';

describe('the candle', () => {
  test('leaves a stub for the shortest sit and stands full for the longest', () => {
    assert.equal(waxHeight(TIMER_MIN_MINUTES), WAX_STUB);
    assert.equal(waxHeight(TIMER_MAX_MINUTES), 1);
  });

  test('grows taller with every longer stop', () => {
    for (let i = 1; i < TIMER_STOPS.length; i += 1) {
      assert.ok(waxHeight(TIMER_STOPS[i]!) > waxHeight(TIMER_STOPS[i - 1]!));
    }
  });

  test('stands in proportion to the minutes', () => {
    const per = (waxHeight(30) - waxHeight(20)) / 10;
    assert.ok(Math.abs((waxHeight(50) - waxHeight(40)) / 10 - per) < 1e-9);
  });

  test('reads every stop’s own height as that stop', () => {
    for (const m of TIMER_STOPS) assert.equal(minutesAtHeight(waxHeight(m)), m);
  });

  test('reads a height between two stops as the nearer', () => {
    const between = (waxHeight(20) * 3 + waxHeight(25)) / 4;
    assert.equal(minutesAtHeight(between), 20);
  });

  test('holds a rim dragged below the stub or past the top at the ends', () => {
    assert.equal(minutesAtHeight(-0.5), TIMER_MIN_MINUTES);
    assert.equal(minutesAtHeight(1.7), TIMER_MAX_MINUTES);
    assert.equal(clampHeight(-0.5), WAX_STUB);
    assert.equal(clampHeight(1.7), 1);
    assert.equal(clampHeight(0.5), 0.5);
  });

  test('snaps a length off the stops before measuring it', () => {
    assert.equal(waxHeight(17), waxHeight(15));
  });
});
