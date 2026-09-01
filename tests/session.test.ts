import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  HOUR_MS,
  SESSION_MS,
  hourStart,
  nextHourStart,
  msIntoHour,
  msUntilNextSession,
  candleBurn,
  ambientSession,
  sessionFromRow,
  resolveSession,
  hourKey,
  toWire,
  fromWire,
} from '../lib/session.ts';

const at = (iso: string) => Date.parse(iso);

describe('hourStart', () => {
  test('floors to the top of the UTC hour', () => {
    assert.equal(
      hourStart(at('2026-08-23T14:37:12.482Z')).toISOString(),
      '2026-08-23T14:00:00.000Z',
    );
  });

  test('is idempotent on an exact hour', () => {
    const exact = at('2026-08-23T14:00:00.000Z');
    assert.equal(hourStart(exact).getTime(), exact);
  });

  test('handles the epoch without going negative', () => {
    assert.equal(hourStart(0).getTime(), 0);
  });

  test('does not drift across a DST boundary', () => {
    // UTC has no DST, which is exactly why the schedule is anchored to it.
    // 2026-10-25 is when the UK falls back; UTC must be unaffected.
    const before = hourStart(at('2026-10-25T00:30:00Z'));
    const after = hourStart(at('2026-10-25T01:30:00Z'));
    assert.equal(after.getTime() - before.getTime(), HOUR_MS);
  });

  test('handles a leap-second-adjacent year boundary', () => {
    assert.equal(
      hourStart(at('2026-12-31T23:59:59.999Z')).toISOString(),
      '2026-12-31T23:00:00.000Z',
    );
  });
});

describe('nextHourStart', () => {
  test('rolls to the next hour', () => {
    assert.equal(
      nextHourStart(at('2026-08-23T14:37:00Z')).toISOString(),
      '2026-08-23T15:00:00.000Z',
    );
  });

  test('rolls across midnight', () => {
    assert.equal(
      nextHourStart(at('2026-08-23T23:10:00Z')).toISOString(),
      '2026-08-24T00:00:00.000Z',
    );
  });

  test('on an exact hour, returns the following hour not the current one', () => {
    assert.equal(
      nextHourStart(at('2026-08-23T14:00:00.000Z')).toISOString(),
      '2026-08-23T15:00:00.000Z',
    );
  });
});

describe('msIntoHour', () => {
  test('is zero at the top of the hour', () => {
    assert.equal(msIntoHour(at('2026-08-23T14:00:00Z')), 0);
  });

  test('counts minutes correctly', () => {
    assert.equal(msIntoHour(at('2026-08-23T14:12:30Z')), 12.5 * 60_000);
  });

  test('is always within [0, HOUR_MS)', () => {
    for (let m = 0; m < 60; m++) {
      const t = at('2026-08-23T14:00:00Z') + m * 60_000;
      const into = msIntoHour(t);
      assert.ok(into >= 0 && into < HOUR_MS, `minute ${m} gave ${into}`);
    }
  });
});

describe('msUntilNextSession', () => {
  test('is a full hour immediately after one starts', () => {
    assert.equal(msUntilNextSession(at('2026-08-23T14:00:00Z')), HOUR_MS);
  });

  test('counts down through the hour', () => {
    assert.equal(msUntilNextSession(at('2026-08-23T14:45:00Z')), 15 * 60_000);
  });

  test('is never zero or negative', () => {
    for (let m = 0; m < 60; m++) {
      const t = at('2026-08-23T14:00:00Z') + m * 60_000;
      assert.ok(msUntilNextSession(t) > 0);
    }
  });
});

describe('candleBurn', () => {
  test('a fresh candle at the top of the hour', () => {
    assert.equal(candleBurn(at('2026-08-23T14:00:00Z')), 0);
  });

  test('half burned at half past', () => {
    assert.equal(candleBurn(at('2026-08-23T14:30:00Z')), 0.5);
  });

  test('nearly gone at :59 — the point being you can SEE you are late', () => {
    const burn = candleBurn(at('2026-08-23T14:59:00Z'));
    assert.ok(burn > 0.98 && burn < 1, `got ${burn}`);
  });

  test('never reaches 1, because a new candle replaces it first', () => {
    for (let m = 0; m < 60; m++) {
      const b = candleBurn(at('2026-08-23T14:00:00Z') + m * 60_000);
      assert.ok(b >= 0 && b < 1, `minute ${m} gave ${b}`);
    }
  });

  test('resets across the hour boundary rather than continuing', () => {
    // Somebody sitting through :00 sees a new candle lit under them.
    const before = candleBurn(at('2026-08-23T14:59:59Z'));
    const after = candleBurn(at('2026-08-23T15:00:00Z'));
    assert.ok(before > 0.99);
    assert.equal(after, 0);
  });

  test('the session now fills its whole hour, leaving no dead time', () => {
    // The old model ran 45 minutes and refused to start a sitting for the
    // other 15. This asserts that gap is gone for good.
    assert.equal(SESSION_MS, HOUR_MS);
  });
});

describe('ambientSession', () => {
  test('is always ambient with no stream', () => {
    const s = ambientSession(hourStart(at('2026-08-23T14:20:00Z')));
    assert.equal(s.kind, 'ambient');
    assert.equal(s.streamUrl, null);
    assert.equal(s.lighterId, null);
    assert.equal(s.focusSlug, 'candle');
  });
});

describe('sessionFromRow', () => {
  test('maps a live row', () => {
    const s = sessionFromRow({
      hour_start: '2026-08-23T14:00:00.000Z',
      kind: 'live',
      focus_slug: 'water',
      stream_url: 'https://example.test/s.m3u8',
      lighter_id: 'abc',
    });
    assert.equal(s.kind, 'live');
    assert.equal(s.focusSlug, 'water');
    assert.equal(s.streamUrl, 'https://example.test/s.m3u8');
  });

  test('defaults a null focus_slug rather than rendering nothing', () => {
    const s = sessionFromRow({
      hour_start: '2026-08-23T14:00:00.000Z',
      kind: 'ambient',
      focus_slug: null,
      stream_url: null,
      lighter_id: null,
    });
    assert.equal(s.focusSlug, 'candle');
  });

  test('treats an unrecognised kind as ambient, never crashes', () => {
    const s = sessionFromRow({
      hour_start: '2026-08-23T14:00:00.000Z',
      kind: 'something-we-added-later',
      focus_slug: null,
      stream_url: null,
      lighter_id: null,
    });
    assert.equal(s.kind, 'ambient');
  });
});

describe('resolveSession', () => {
  test('a missing row IS the fallback — the site is never empty', async () => {
    const s = await resolveSession(at('2026-08-23T14:20:00Z'), async () => null);
    assert.equal(s.kind, 'ambient');
    assert.equal(s.hourStart.toISOString(), '2026-08-23T14:00:00.000Z');
  });

  test('an override row wins', async () => {
    const s = await resolveSession(at('2026-08-23T14:20:00Z'), async () => ({
      hour_start: '2026-08-23T14:00:00.000Z',
      kind: 'live',
      focus_slug: 'candle',
      stream_url: 'https://example.test/s.m3u8',
      lighter_id: 'lighter-1',
    }));
    assert.equal(s.kind, 'live');
    assert.equal(s.lighterId, 'lighter-1');
  });

  test('looks up by the floored hour, not the raw timestamp', async () => {
    let asked: Date | null = null;
    await resolveSession(at('2026-08-23T14:37:12Z'), async (d) => {
      asked = d;
      return null;
    });
    assert.equal(asked!.toISOString(), '2026-08-23T14:00:00.000Z');
  });
});

describe('hourKey', () => {
  test('is stable across the whole hour', () => {
    const a = hourKey(at('2026-08-23T14:00:00Z'));
    const b = hourKey(at('2026-08-23T14:59:59Z'));
    assert.equal(a, b);
  });

  test('changes at the top of the hour', () => {
    const a = hourKey(at('2026-08-23T14:59:59Z'));
    const b = hourKey(at('2026-08-23T15:00:00Z'));
    assert.notEqual(a, b);
  });
});

describe('the wire format', () => {
  test('survives a round trip through JSON', () => {
    const before = ambientSession(hourStart(at('2026-08-23T14:00:00Z')));
    const after = fromWire(JSON.parse(JSON.stringify(toWire(before))));

    // Deep-equal would pass on two strings; the point of the round trip is
    // that hourStart arrives as a Date on the far side.
    assert.ok(after.hourStart instanceof Date);
    assert.equal(after.hourStart.getTime(), before.hourStart.getTime());
    assert.deepEqual(after, before);
  });

  test('carries a live session unchanged', () => {
    const before = sessionFromRow({
      hour_start: '2026-08-23T14:00:00.000Z',
      kind: 'live',
      focus_slug: 'water',
      stream_url: 'https://example.test/s.m3u8',
      lighter_id: 'lighter-1',
    });
    assert.deepEqual(fromWire(toWire(before)), before);
  });

  test('hourStart on the wire matches the hour key', () => {
    // useSession compares these two strings to discard a session that arrived
    // for the hour we just left. If they ever stop being the same format the
    // comparison silently never matches, and the fetch becomes a no-op.
    const ms = at('2026-08-23T14:37:12Z');
    assert.equal(toWire(ambientSession(hourStart(ms))).hourStart, hourKey(ms));
  });
});
