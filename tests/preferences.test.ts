import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PREFERENCES,
  normalize,
  parsePreferences,
  toRow,
  fromRow,
  samePreferences,
  type PreferencesRow,
} from '../lib/preferences.ts';

describe('normalize', () => {
  test('passes a valid set through unchanged', () => {
    const p = {
      timerMinutes: 30,
      endBell: 'gong',
      focusSlug: 'water',
      soundMix: { rain: 0.4 },
      showCount: false,
    };
    assert.deepEqual(normalize(p), p);
  });

  test('never returns a partial object', () => {
    // One bad field must not cost the others. A user who hand-edits
    // timerMinutes should not lose their bell as well.
    const p = normalize({ timerMinutes: 'nonsense', endBell: 'gong' });
    assert.equal(p.endBell, 'gong');
    assert.equal(p.timerMinutes, DEFAULT_PREFERENCES.timerMinutes);
    assert.deepEqual(Object.keys(p).sort(), Object.keys(DEFAULT_PREFERENCES).sort());
  });

  test('rejects a bell that is not one of the three', () => {
    // This value selects an audio buffer. A bad one does nothing at all until
    // the moment a sitting ends, which is the worst possible time to find out.
    assert.equal(normalize({ endBell: 'airhorn' }).endBell, DEFAULT_PREFERENCES.endBell);
  });

  test('snaps timerMinutes onto a slider stop', () => {
    assert.equal(normalize({ timerMinutes: 43 }).timerMinutes, 45);
    assert.equal(normalize({ timerMinutes: 999 }).timerMinutes, 60);
    assert.equal(normalize({ timerMinutes: 0 }).timerMinutes, 5);
  });

  test('clamps sound gains into 0..1', () => {
    // These are applied straight to an AudioNode; 40 would be deafening.
    const mix = normalize({ soundMix: { rain: 40, wind: -3, sea: 0.5 } }).soundMix;
    assert.deepEqual(mix, { rain: 1, wind: 0, sea: 0.5 });
  });

  test('drops non-numeric gains rather than passing NaN to the mixer', () => {
    assert.deepEqual(normalize({ soundMix: { rain: 'loud' } }).soundMix, {});
  });

  test('treats an array or a null soundMix as empty', () => {
    assert.deepEqual(normalize({ soundMix: [1, 2] }).soundMix, {});
    assert.deepEqual(normalize({ soundMix: null }).soundMix, {});
  });

  test('only an explicit false hides the count', () => {
    assert.equal(normalize({}).showCount, true);
    assert.equal(normalize({ showCount: undefined }).showCount, true);
    assert.equal(normalize({ showCount: false }).showCount, false);
  });

  test('survives being handed nonsense', () => {
    for (const junk of [null, undefined, 42, 'string', []]) {
      assert.deepEqual(normalize(junk), DEFAULT_PREFERENCES);
    }
  });
});

describe('parsePreferences', () => {
  test('defaults on absent or corrupt JSON', () => {
    assert.deepEqual(parsePreferences(null), DEFAULT_PREFERENCES);
    assert.deepEqual(parsePreferences('{not json'), DEFAULT_PREFERENCES);
  });

  test('reads a stored set back', () => {
    const stored = JSON.stringify({ timerMinutes: 20, endBell: 'struck-bell' });
    const p = parsePreferences(stored);
    assert.equal(p.timerMinutes, 20);
    assert.equal(p.endBell, 'struck-bell');
  });
});

describe('the database row mapping', () => {
  test('round-trips through a row', () => {
    const before = normalize({
      timerMinutes: 45,
      endBell: 'gong',
      focusSlug: 'water',
      soundMix: { rain: 0.25 },
      showCount: false,
    });
    assert.deepEqual(fromRow(toRow('user-1', before)), before);
  });

  test('a row written before today constraints existed is still safe', () => {
    // 0001 allowed timer_minutes down to 1 and put no constraint on end_bell
    // at all. Rows from that era must not reach the audio graph unchecked.
    const legacy: PreferencesRow = {
      user_id: 'user-1',
      timer_minutes: 3,
      end_bell: 'something-removed',
      focus_slug: null,
      sound_mix: null,
      show_count: null,
    };
    const p = fromRow(legacy);
    assert.equal(p.timerMinutes, 5);
    assert.equal(p.endBell, DEFAULT_PREFERENCES.endBell);
    assert.equal(p.focusSlug, DEFAULT_PREFERENCES.focusSlug);
    assert.equal(p.showCount, true);
  });

  test('carries the user id onto the row', () => {
    assert.equal(toRow('abc', DEFAULT_PREFERENCES).user_id, 'abc');
  });
});

describe('samePreferences', () => {
  test('a pulled row does not look like a change', () => {
    // Without this the sync pulls a row, sets state, sees a change, and pushes
    // the identical row straight back — one write per sign-in, forever.
    const a = normalize({ timerMinutes: 20, soundMix: { rain: 0.3 } });
    const b = fromRow(toRow('user-1', a));
    assert.ok(samePreferences(a, b));
  });

  test('notices every field', () => {
    const base = DEFAULT_PREFERENCES;
    assert.ok(!samePreferences(base, { ...base, timerMinutes: 25 }));
    assert.ok(!samePreferences(base, { ...base, endBell: 'gong' }));
    assert.ok(!samePreferences(base, { ...base, focusSlug: 'water' }));
    assert.ok(!samePreferences(base, { ...base, showCount: false }));
    assert.ok(!samePreferences(base, { ...base, soundMix: { rain: 0.1 } }));
  });
});
