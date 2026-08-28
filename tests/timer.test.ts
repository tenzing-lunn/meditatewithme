import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  TIMER_STOPS,
  TIMER_MIN_MINUTES,
  TIMER_MAX_MINUTES,
  TIMER_DEFAULT_MINUTES,
  clampMinutes,
  durationLabel,
  timerStopIndex,
  endsAt,
  remainingMs,
  hasEnded,
  timerProgress,
  mmss,
  monotonicEndAtFromServerTarget,
  nextSharedBellAt,
  SHARED_BELL_MIN_LEAD_MS,
} from '../lib/timer.ts';

describe('shared bell target', () => {
  test('uses the upcoming hour when there is enough time to choose it', () => {
    const now = 10 * 3_600_000 + 30 * 60_000;
    assert.equal(nextSharedBellAt(now), 11 * 3_600_000);
  });

  test('rolls a late arrival to the following hour', () => {
    const now = 10 * 3_600_000 + 57 * 60_000;
    assert.equal(nextSharedBellAt(now), 12 * 3_600_000);
  });

  test('keeps exactly five minutes as a viable shared sit', () => {
    const now = 11 * 3_600_000 - SHARED_BELL_MIN_LEAD_MS;
    assert.equal(nextSharedBellAt(now), 11 * 3_600_000);
  });

  test('converts the absolute target to monotonic time once', () => {
    assert.equal(
      monotonicEndAtFromServerTarget(1_500_000, 1_000_000, 42_000),
      542_000,
    );
  });
});

describe('clampMinutes', () => {
  test('keeps values already on a stop', () => {
    assert.equal(clampMinutes(10), 10);
    assert.equal(clampMinutes(TIMER_MIN_MINUTES), TIMER_MIN_MINUTES);
    assert.equal(clampMinutes(TIMER_MAX_MINUTES), TIMER_MAX_MINUTES);
  });

  test('clamps outside one minute to an hour', () => {
    assert.equal(clampMinutes(0), TIMER_MIN_MINUTES);
    assert.equal(clampMinutes(-5), TIMER_MIN_MINUTES);
    assert.equal(clampMinutes(1000), TIMER_MAX_MINUTES);
    assert.equal(clampMinutes(90), TIMER_MAX_MINUTES);
  });

  test('snaps to the nearest stop', () => {
    assert.equal(clampMinutes(12), 10);
    assert.equal(clampMinutes(13), 15);
    assert.equal(clampMinutes(2), 1);
  });

  test('a tie goes to the longer sit', () => {
    // 3 is equidistant from 1 and 5; 17.5 from 15 and 20. Rounding 3 down
    // would cut the sit by two thirds to save two minutes.
    assert.equal(clampMinutes(3), 5);
    assert.equal(clampMinutes(17.5), 20);
  });

  test('one minute is a real stop, not rounded away', () => {
    // The proposal promised a one-minute floor and the code used to snap it
    // to five. This is the regression that change was for.
    assert.equal(clampMinutes(1), 1);
    assert.equal(TIMER_MIN_MINUTES, 1);
  });

  test('honours both documents: 45 and 60 are reachable', () => {
    // 45 is the proposal's ceiling, 60 the build spec's. The range is the
    // superset, so neither promise is broken.
    assert.equal(clampMinutes(45), 45);
    assert.equal(clampMinutes(60), 60);
  });

  test('every stop survives a round trip', () => {
    for (const m of TIMER_STOPS) {
      assert.equal(clampMinutes(m), m);
    }
  });

  test('falls back to the default on nonsense', () => {
    // Reachable from a corrupted localStorage value, which is why it is
    // guarded rather than assumed.
    assert.equal(clampMinutes(NaN), TIMER_DEFAULT_MINUTES);
    assert.equal(clampMinutes(Infinity), TIMER_DEFAULT_MINUTES);
  });
});

describe('timerStopIndex', () => {
  test('maps each stop to its own position', () => {
    TIMER_STOPS.forEach((m, i) => {
      assert.equal(timerStopIndex(m), i);
    });
  });

  test('never returns -1, whatever it is handed', () => {
    // The slider renders this value directly. A -1 would put the thumb off
    // the track rather than throw, which is the kind of bug nobody reports.
    assert.equal(timerStopIndex(17), TIMER_STOPS.indexOf(15));
    assert.equal(timerStopIndex(NaN), TIMER_STOPS.indexOf(10));
    assert.equal(timerStopIndex(9999), TIMER_STOPS.length - 1);
  });
});

describe('durationLabel', () => {
  test('does not say "1 minutes"', () => {
    // Reachable the moment a one-minute stop exists, and invisible in any
    // test that only checks the number.
    assert.deepEqual(durationLabel(1), { value: '1', unit: 'minute' });
  });

  test('an hour is an hour, not sixty minutes', () => {
    assert.deepEqual(durationLabel(60), { value: '1', unit: 'hour' });
  });

  test('everything else is plural minutes', () => {
    assert.deepEqual(durationLabel(10), { value: '10', unit: 'minutes' });
    assert.deepEqual(durationLabel(45), { value: '45', unit: 'minutes' });
  });
});

describe('endsAt', () => {
  test('adds the duration in milliseconds', () => {
    assert.equal(endsAt(1_000, 10), 1_000 + 600_000);
  });

  test('clamps the duration before applying it', () => {
    assert.equal(endsAt(0, 99), TIMER_MAX_MINUTES * 60_000);
  });

  test('an hour is reachable', () => {
    assert.equal(endsAt(0, 60), 3_600_000);
  });

  test('a one-minute sit is a minute, not five', () => {
    assert.equal(endsAt(0, 1), 60_000);
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
