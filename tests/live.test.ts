import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  authCheck,
  GRACE_MS,
  HOUR_MS,
  hlsUrl,
  keyFrom,
  onAir,
  sinceFrom,
  slugFromPath,
} from '../lib/live.ts';

const KEY = 'a'.repeat(43);

describe('slugFromPath', () => {
  test('reads the slug from live/<slug>', () => {
    assert.equal(slugFromPath('live/abcd1234'), 'abcd1234');
  });

  test('refuses anything else', () => {
    for (const p of ['live/ABCD1234', 'live/abc', 'other/abcd1234', 'live/abcd1234/x', '', null, 7]) {
      assert.equal(slugFromPath(p), null, String(p));
    }
  });
});

describe('keyFrom', () => {
  test('takes ?key= from the query', () => {
    assert.equal(keyFrom(`key=${KEY}`, ''), KEY);
  });

  test('falls back to the password (SRT streamid)', () => {
    assert.equal(keyFrom('', KEY), KEY);
  });

  test('a malformed ?key= is refused, not replaced by the password', () => {
    assert.equal(keyFrom('key=short', KEY), null);
  });

  test('nothing usable is null', () => {
    assert.equal(keyFrom('', ''), null);
    assert.equal(keyFrom(undefined, undefined), null);
    assert.equal(keyFrom('key=has spaces in it and is long enough ok', ''), null);
  });
});

describe('authCheck', () => {
  test('a publish with a slug and a key is checked', () => {
    assert.deepEqual(
      authCheck({ action: 'publish', path: 'live/abcd1234', query: `key=${KEY}` }),
      { kind: 'check', slug: 'abcd1234', key: KEY },
    );
  });

  test('reads, the API and anything unknown are denied', () => {
    for (const action of ['read', 'playback', 'api', 'metrics', undefined]) {
      assert.deepEqual(
        authCheck({ action, path: 'live/abcd1234', query: `key=${KEY}` }),
        { kind: 'deny' },
      );
    }
  });

  test('a publish without a key, or to another path, is denied', () => {
    assert.deepEqual(authCheck({ action: 'publish', path: 'live/abcd1234' }), { kind: 'deny' });
    assert.deepEqual(
      authCheck({ action: 'publish', path: 'mystream', query: `key=${KEY}` }),
      { kind: 'deny' },
    );
  });
});

describe('sinceFrom', () => {
  const now = Date.parse('2026-11-09T10:00:00Z');

  test('accepts the shape hook.sh sends', () => {
    assert.equal(sinceFrom('2026-11-09T09:00:00Z', now), '2026-11-09T09:00:00Z');
  });

  test('refuses other shapes, and anything implausible', () => {
    for (const v of [
      '2026-11-09T09:00:00.000Z',
      '2026-11-09 09:00:00',
      '2026-11-09T10:05:00Z', // five minutes in the future
      '2026-09-01T10:00:00Z', // over a month ago
      '2026-13-40T99:99:99Z',
      '',
      null,
      1731146400000,
    ]) {
      assert.equal(sinceFrom(v, now), null, String(v));
    }
  });
});

describe('hlsUrl', () => {
  test('joins base and path, with or without a trailing slash', () => {
    assert.equal(hlsUrl('https://a.example/', 'abcd1234'), 'https://a.example/live/abcd1234/index.m3u8');
    assert.equal(hlsUrl('http://localhost:8888', 'abcd1234'), 'http://localhost:8888/live/abcd1234/index.m3u8');
  });
});

describe('onAir', () => {
  const H = Date.UTC(2026, 8, 27, 10); // 10:00
  const at = (min: number) => H + min * 60_000;
  const s = (slug: string, sinceMin: number, lastHeldMin: number | null = null) => ({
    slug,
    since: at(sinceMin),
    lastHeld: lastHeldMin === null ? null : at(lastHeldMin),
  });

  test('nobody live is nothing', () => {
    assert.deepEqual(onAir([], null, at(10)), { kind: 'none' });
    assert.deepEqual(onAir([], 'aaaaaaaa', at(10)), { kind: 'none' });
  });

  test('the first to go live in an empty hour claims it and is shown', () => {
    assert.deepEqual(onAir([s('aaaaaaaa', 2)], null, at(2)), {
      kind: 'live', slug: 'aaaaaaaa', claim: true,
    });
  });

  test('a second collaborator waits off the air while the holder sits', () => {
    const r = onAir([s('aaaaaaaa', 2), s('bbbbbbbb', 20)], 'aaaaaaaa', at(30));
    assert.deepEqual(r, { kind: 'live', slug: 'aaaaaaaa', claim: false });
  });

  test('in the grace minutes, with someone waiting, the between screen', () => {
    const r = onAir([s('aaaaaaaa', 2), s('bbbbbbbb', 20)], 'aaaaaaaa', H + HOUR_MS - GRACE_MS);
    assert.deepEqual(r, { kind: 'between', next: H + HOUR_MS });
  });

  test('in the grace minutes, with nobody waiting, the holder carries on', () => {
    const r = onAir([s('aaaaaaaa', 2)], 'aaaaaaaa', at(58));
    assert.deepEqual(r, { kind: 'live', slug: 'aaaaaaaa', claim: false });
  });

  test('the holder leaving early, with someone waiting: between until the hour', () => {
    assert.deepEqual(onAir([s('bbbbbbbb', 20)], 'aaaaaaaa', at(30)), {
      kind: 'between', next: H + HOUR_MS,
    });
  });

  test('the holder leaving with nobody waiting: nothing', () => {
    assert.deepEqual(onAir([], 'aaaaaaaa', at(30)), { kind: 'none' });
  });

  test('a holder who drops and reconnects keeps the hour', () => {
    const r = onAir([s('bbbbbbbb', 20), s('aaaaaaaa', 31)], 'aaaaaaaa', at(32));
    assert.deepEqual(r, { kind: 'live', slug: 'aaaaaaaa', claim: false });
  });

  test('on the hour the one who waited takes over', () => {
    // 11:00. A held 10:00 so has waited since 11:00; B since 10:20.
    const r = onAir([s('aaaaaaaa', 2, 0), s('bbbbbbbb', 20)], null, at(60));
    assert.deepEqual(r, { kind: 'live', slug: 'bbbbbbbb', claim: true });
  });

  test('two who stay live alternate hourly', () => {
    // 12:00. A held 10:00, B held 11:00.
    const r = onAir([s('aaaaaaaa', 2, 0), s('bbbbbbbb', 20, 60)], null, at(120));
    assert.deepEqual(r, { kind: 'live', slug: 'aaaaaaaa', claim: true });
  });

  test('three take turns in the order they arrived', () => {
    // 11:00: A held 10:00; B came at 10:20, C at 10:50.
    const r = onAir([s('aaaaaaaa', 2, 0), s('cccccccc', 50), s('bbbbbbbb', 20)], null, at(60));
    assert.deepEqual(r, { kind: 'live', slug: 'bbbbbbbb', claim: true });
  });

  test('an hour held in an earlier session does not count against a new one', () => {
    // A held 08:00, left, came back at 10:30; B arrived 10:40.
    const r = onAir([s('aaaaaaaa', 30, -120), s('bbbbbbbb', 40)], null, at(45));
    assert.deepEqual(r, { kind: 'live', slug: 'aaaaaaaa', claim: true });
  });

  test('no claim in the grace minutes: one is shown, several wait for the hour', () => {
    assert.deepEqual(onAir([s('aaaaaaaa', 57)], null, at(57)), {
      kind: 'live', slug: 'aaaaaaaa', claim: false,
    });
    assert.deepEqual(onAir([s('aaaaaaaa', 57), s('bbbbbbbb', 58)], null, at(58)), {
      kind: 'between', next: H + HOUR_MS,
    });
    // ...and at 11:00 the one who came first at 10:57 takes it.
    assert.deepEqual(onAir([s('aaaaaaaa', 57), s('bbbbbbbb', 58)], null, at(60)), {
      kind: 'live', slug: 'aaaaaaaa', claim: true,
    });
  });
});
