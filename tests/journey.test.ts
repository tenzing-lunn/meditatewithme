import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { screensFor, step, usualFingerprint } from '../lib/journey.ts';
import { DEFAULT_PREFERENCES } from '../lib/preferences.ts';

describe('screensFor', () => {
  test('a guest, first time', () => {
    assert.deepEqual(
      screensFor({ signedIn: false, usual: false, hasAnswers: false, originAsked: false }),
      ['mode', 'name', 'origin', 'time', 'bell', 'sound', 'bowl'],
    );
  });

  test('a guest who has answered before', () => {
    assert.deepEqual(
      screensFor({ signedIn: false, usual: false, hasAnswers: true, originAsked: true }),
      ['mode', 'time', 'bell', 'sound', 'bowl'],
    );
  });

  test('a guest who skips the questions', () => {
    assert.deepEqual(
      screensFor({ signedIn: false, usual: true, hasAnswers: true, originAsked: true }),
      ['mode', 'bowl'],
    );
  });

  test('signed in, never asked where they are from', () => {
    assert.deepEqual(
      screensFor({ signedIn: true, usual: false, hasAnswers: true, originAsked: false }),
      ['mode', 'origin', 'time', 'bell', 'sound', 'bowl'],
    );
  });

  test('signed in, usual', () => {
    assert.deepEqual(
      screensFor({ signedIn: true, usual: true, hasAnswers: true, originAsked: true }),
      ['mode', 'bowl'],
    );
  });

  test('the bowl is always last and the doors are always first', () => {
    for (const signedIn of [true, false])
      for (const usual of [true, false])
        for (const hasAnswers of [true, false])
          for (const originAsked of [true, false]) {
            const s = screensFor({ signedIn, usual, hasAnswers, originAsked });
            assert.equal(s[s.length - 1], 'bowl');
            assert.equal(s[0], 'mode');
            assert.equal(new Set(s).size, s.length);
          }
  });
});

describe('step', () => {
  const s = screensFor({ signedIn: false, usual: false, hasAnswers: false, originAsked: false });
  test('forward, back, and off the ends', () => {
    assert.equal(step(s, 'mode', 1), 'name');
    assert.equal(step(s, 'name', -1), 'mode');
    assert.equal(step(s, 'mode', -1), null);
    assert.equal(step(s, 'bowl', 1), null);
    assert.equal(step(s, 'sound', 1), 'bowl');
  });
});

describe('usualFingerprint', () => {
  test('changes with any answer, and ignores a bed at zero', () => {
    const a = usualFingerprint(DEFAULT_PREFERENCES);
    assert.equal(usualFingerprint({ ...DEFAULT_PREFERENCES, soundMix: { rain: 0 } }), a);
    assert.notEqual(usualFingerprint({ ...DEFAULT_PREFERENCES, timerMinutes: 5 }), a);
    assert.notEqual(usualFingerprint({ ...DEFAULT_PREFERENCES, endBell: 'gong' }), a);
    assert.notEqual(usualFingerprint({ ...DEFAULT_PREFERENCES, showCount: false }), a);
    assert.notEqual(usualFingerprint({ ...DEFAULT_PREFERENCES, soundMix: { rain: 0.5 } }), a);
  });
});
