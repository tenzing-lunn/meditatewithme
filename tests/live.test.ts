import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  authCheck,
  hlsUrl,
  keyFrom,
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
