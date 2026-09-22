import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { doorPatch, screensFor, step, togetherLine, usualFingerprint } from '../lib/journey.ts';
import { DEFAULT_PREFERENCES } from '../lib/preferences.ts';

describe('screensFor', () => {
  test('a guest, first time: nothing personal is asked', () => {
    assert.deepEqual(
      screensFor({ signedIn: false, usual: false, hasSat: false, originAsked: false }),
      ['mode', 'time', 'bell', 'sound', 'bowl'],
    );
  });

  test('a guest who has sat is asked their name and place, once', () => {
    assert.deepEqual(
      screensFor({ signedIn: false, usual: false, hasSat: true, originAsked: false }),
      ['mode', 'name', 'origin', 'time', 'bell', 'sound', 'bowl'],
    );
    assert.deepEqual(
      screensFor({ signedIn: false, usual: false, hasSat: true, originAsked: true }),
      ['mode', 'time', 'bell', 'sound', 'bowl'],
    );
  });

  test('a guest who skips the questions is still asked, once', () => {
    assert.deepEqual(
      screensFor({ signedIn: false, usual: true, hasSat: true, originAsked: false }),
      ['mode', 'name', 'origin', 'bowl'],
    );
    assert.deepEqual(
      screensFor({ signedIn: false, usual: true, hasSat: true, originAsked: true }),
      ['mode', 'bowl'],
    );
  });

  test('signed in, first time: nothing personal is asked either', () => {
    assert.deepEqual(
      screensFor({ signedIn: true, usual: false, hasSat: false, originAsked: false }),
      ['mode', 'time', 'bell', 'sound', 'bowl'],
    );
  });

  test('signed in and has sat: the place, never the name', () => {
    assert.deepEqual(
      screensFor({ signedIn: true, usual: false, hasSat: true, originAsked: false }),
      ['mode', 'origin', 'time', 'bell', 'sound', 'bowl'],
    );
    assert.deepEqual(
      screensFor({ signedIn: true, usual: false, hasSat: true, originAsked: true }),
      ['mode', 'time', 'bell', 'sound', 'bowl'],
    );
  });

  test('signed in, usual', () => {
    assert.deepEqual(
      screensFor({ signedIn: true, usual: true, hasSat: true, originAsked: true }),
      ['mode', 'bowl'],
    );
  });

  test('the bowl is always last and the doors are always first', () => {
    for (const signedIn of [true, false])
      for (const usual of [true, false])
        for (const hasSat of [true, false])
          for (const originAsked of [true, false]) {
            const s = screensFor({ signedIn, usual, hasSat, originAsked });
            assert.equal(s[s.length - 1], 'bowl');
            assert.equal(s[0], 'mode');
            assert.equal(new Set(s).size, s.length);
            // The name is never asked of a member, and never without the place.
            if (signedIn) assert.equal(s.includes('name'), false);
            if (s.includes('name')) assert.equal(s.includes('origin'), true);
          }
  });
});

describe('step', () => {
  const s = screensFor({ signedIn: false, usual: false, hasSat: true, originAsked: false });
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

describe('doorPatch', () => {
  const alone = { ...DEFAULT_PREFERENCES, showCount: false, untilBell: false };
  const ownLength = { ...DEFAULT_PREFERENCES, showCount: true, untilBell: false };

  test('with everyone, from by yourself, proposes the bell', () => {
    assert.deepEqual(doorPatch('together', alone), { showCount: true, untilBell: true });
  });

  test('with everyone, already with others, keeps a length of your own', () => {
    assert.deepEqual(doorPatch('together', ownLength), { showCount: true });
  });

  test('by yourself drops the bell', () => {
    assert.deepEqual(doorPatch('alone', { ...DEFAULT_PREFERENCES, untilBell: true }), {
      showCount: false,
      untilBell: false,
    });
  });

  test('the usual survives a door: re-fingerprinted with the patched answers', () => {
    // The door changes what the fingerprint compares, which is why the door
    // handler re-fingerprints with the patch applied rather than letting the
    // skip turn itself off.
    const patched = { ...alone, ...doorPatch('together', alone) };
    assert.notEqual(usualFingerprint(patched), usualFingerprint(alone));
    assert.equal(
      usualFingerprint(patched),
      usualFingerprint({ ...alone, showCount: true, untilBell: true }),
    );
    // And a returning with-others sitter's own length is untouched by it.
    assert.equal(
      usualFingerprint({ ...ownLength, ...doorPatch('together', ownLength) }),
      usualFingerprint(ownLength),
    );
  });
});

describe('togetherLine', () => {
  test('names the bell when the door leads to it', () => {
    assert.equal(
      togetherLine({ ...DEFAULT_PREFERENCES, showCount: false, untilBell: false }, '12:55'),
      'Everyone finishes together at 12:55',
    );
    assert.equal(
      togetherLine({ ...DEFAULT_PREFERENCES, showCount: true, untilBell: true }, '12:55'),
      'Everyone finishes together at 12:55',
    );
  });

  test('says so when a length of your own survives the door', () => {
    assert.equal(
      togetherLine({ ...DEFAULT_PREFERENCES, showCount: true, untilBell: false }, '12:55'),
      'Your own length, with everyone',
    );
  });

  test('before the clock knows, no time', () => {
    assert.equal(
      togetherLine({ ...DEFAULT_PREFERENCES, showCount: false, untilBell: false }, null),
      'Everyone finishes together',
    );
  });
});
