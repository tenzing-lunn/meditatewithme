import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  TIMER_MIN_MINUTES,
  TIMER_MAX_MINUTES,
  TIMER_DEFAULT_MINUTES,
  clampMinutes,
  endsAt,
  remainingMs,
  hasEnded,
  timerProgress,
  mmss,
} from '../lib/timer.ts';

describe('clampMinutes', () => {
  test('keeps values already in range', () => {
    assert.equal(clampMinutes(10), 10);
    assert.equal(clampMinutes(TIMER_MIN_MINUTES), TIMER_MIN_MINUTES);
    assert.equal(clampMinutes(TIMER_MAX_MINUTES), TIMER_MAX_MINUTES);
  });

  test('clamps outside the proposal bounds', () => {
    assert.equal(clampMinutes(0), TIMER_MIN_MINUTES);
    assert.equal(clampMinutes(-5), TIMER_MIN_MINUTES);
    assert.equal(clampMinutes(1000), TIMER_MAX_MINUTES);
  });

  test('rounds fractional input', () => {
    assert.equal(clampMinutes(10.4), 10);
    assert.equal(clampMinutes(10.6), 11);
  });

  test('falls back to the default on nonsense', () => {
    // Reachable from a corrupted localStorage value, which is why it is
    // guarded rather than assumed.
    assert.equal(clampMinutes(NaN), TIMER_DEFAULT_MINUTES);
    assert.equal(clampMinutes(Infinity), TIMER_DEFAULT_MINUTES);
  });
});

describe('endsAt', () => {
  test('adds the duration in milliseconds', () => {
    assert.equal(endsAt(1_000, 10), 1_000 + 600_000);
  });

  test('clamps the duration before applying it', () => {
    assert.equal(endsAt(0, 99), TIMER_MAX_MINUTES * 60_000);
  });
});

describe('remainingMs', () => {
  test('counts down', () => {
    assert.equal(remainingMs(10_000, 4_000), 6_000);
  });

  test('never goes negative', () => {
    // A backgrounded tab can wake long past the end. Rendering a negative
    // duration would produce something like "-3:12" on screen.
    assert.equal(remainingMs(10_000, 999_999), 0);
  });
});

describe('hasEnded', () => {
  test('is true at and after the target', () => {
    assert.equal(hasEnded(10_000, 9_999), false);
    assert.equal(hasEnded(10_000, 10_000), true);
    assert.equal(hasEnded(10_000, 10_001), true);
  });
});

describe('timerProgress', () => {
  test('runs 0 to 1 across the sit', () => {
    assert.equal(timerProgress(0, 1_000, 0), 0);
    assert.equal(timerProgress(0, 1_000, 500), 0.5);
    assert.equal(timerProgress(0, 1_000, 1_000), 1);
  });

  test('stays bounded outside the window', () => {
    assert.equal(timerProgress(0, 1_000, -50), 0);
    assert.equal(timerProgress(0, 1_000, 5_000), 1);
  });

  test('returns 1 rather than NaN on a zero duration', () => {
    // NaN would flow into a style attribute and break the layout silently.
    assert.equal(timerProgress(500, 500, 500), 1);
  });
});

describe('mmss', () => {
  test('formats minutes and padded seconds', () => {
    assert.equal(mmss(0), '0:00');
    assert.equal(mmss(9_000), '0:09');
    assert.equal(mmss(60_000), '1:00');
    assert.equal(mmss(605_000), '10:05');
  });

  test('rounds up so the last minute reads as a full minute', () => {
    assert.equal(mmss(59_999), '1:00');
    assert.equal(mmss(1), '0:01');
  });

  test('clamps negatives to zero', () => {
    assert.equal(mmss(-5_000), '0:00');
  });
});
