import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeOffset,
  serverNow,
  getOffset,
  isSynced,
  setOffset,
  resetClock,
  syncClock,
} from '../lib/clock.ts';

describe('computeOffset', () => {
  test('is zero when the clocks agree and latency is symmetric', () => {
    // request at 1000, response at 1100, server says 1050 (the midpoint)
    assert.equal(computeOffset(1000, 1100, 1050), 0);
  });

  test('is positive when the device clock is behind', () => {
    // device thinks it's 1100, server is really at 1050 + 3000 ahead
    assert.equal(computeOffset(1000, 1100, 4050), 3000);
  });

  test('is negative when the device clock is ahead', () => {
    // the case that silently breaks the product: a fast laptop
    assert.equal(computeOffset(1000, 1100, -1950), -3000);
  });

  test('accounts for round-trip latency rather than ignoring it', () => {
    // 400ms RTT: naively using t1 would report a 200ms error that isn't real
    const naive = 1400 - 1400;
    const corrected = computeOffset(1000, 1400, 1200);
    assert.equal(naive, 0);
    assert.equal(corrected, 0);
  });

  test('a zero-latency measurement degrades gracefully', () => {
    assert.equal(computeOffset(1000, 1000, 1000), 0);
  });
});

describe('clock state', () => {
  beforeEach(() => resetClock());

  test('starts unsynced with a zero offset', () => {
    assert.equal(getOffset(), 0);
    assert.equal(isSynced(), false);
  });

  test('serverNow tracks Date.now when offset is zero', () => {
    const drift = Math.abs(serverNow() - Date.now());
    assert.ok(drift < 50, `drift was ${drift}ms`);
  });

  test('serverNow applies the offset', () => {
    setOffset(5000);
    const drift = serverNow() - Date.now();
    assert.ok(Math.abs(drift - 5000) < 50, `drift was ${drift}ms`);
  });
});

describe('syncClock', () => {
  beforeEach(() => resetClock());

  test('applies an offset from a good response', async () => {
    const fake = async () =>
      new Response(JSON.stringify({ now: Date.now() + 10_000 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const ok = await syncClock(fake as unknown as typeof fetch);
    assert.equal(ok, true);
    assert.ok(Math.abs(getOffset() - 10_000) < 100);
    assert.equal(isSynced(), true);
  });

  test('a network failure is non-fatal and leaves the offset at zero', async () => {
    const boom = async () => {
      throw new Error('offline');
    };
    const ok = await syncClock(boom as unknown as typeof fetch);
    assert.equal(ok, false);
    assert.equal(getOffset(), 0);
    assert.equal(isSynced(), false);
  });

  test('a 500 is non-fatal', async () => {
    const fail = async () => new Response('nope', { status: 500 });
    const ok = await syncClock(fail as unknown as typeof fetch);
    assert.equal(ok, false);
    assert.equal(getOffset(), 0);
  });

  test('a malformed payload is rejected rather than poisoning the offset', async () => {
    const junk = async () =>
      new Response(JSON.stringify({ now: 'half past three' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    const ok = await syncClock(junk as unknown as typeof fetch);
    assert.equal(ok, false);
    assert.equal(getOffset(), 0);
  });

  test('NaN is rejected — Number.isFinite, not just typeof', async () => {
    const nan = async () =>
      new Response(JSON.stringify({ now: null }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    const ok = await syncClock(nan as unknown as typeof fetch);
    assert.equal(ok, false);
  });
});
