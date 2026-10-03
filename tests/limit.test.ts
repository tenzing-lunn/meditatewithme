import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { distinctLimiter, rateLimiter } from '../lib/limit.ts';

const MIN = 60_000;

describe('rateLimiter', () => {
  test('allows up to the limit in a window and refuses the next', () => {
    const l = rateLimiter(3, MIN);
    assert.equal(l.allow('a', 0), true);
    assert.equal(l.allow('a', 1), true);
    assert.equal(l.allow('a', 2), true);
    assert.equal(l.allow('a', 3), false);
    assert.equal(l.allow('a', MIN - 1), false);
  });

  test('a new window starts fresh', () => {
    const l = rateLimiter(1, MIN);
    assert.equal(l.allow('a', 0), true);
    assert.equal(l.allow('a', 10), false);
    assert.equal(l.allow('a', MIN), true);
  });

  test('keys are independent', () => {
    const l = rateLimiter(1, MIN);
    assert.equal(l.allow('a', 0), true);
    assert.equal(l.allow('b', 0), true);
    assert.equal(l.allow('a', 1), false);
    assert.equal(l.allow('b', 1), false);
  });

  test('does not grow without bound', () => {
    const l = rateLimiter(1, MIN);
    for (let i = 0; i < 20_000; i++) l.allow(`k${i}`, 0);
    // The earliest keys were evicted, so they are allowed again as if new.
    assert.equal(l.allow('k0', 1), true);
    // The latest are still held.
    assert.equal(l.allow('k19999', 1), false);
  });
});

describe('distinctLimiter', () => {
  test('a repeated member never counts twice', () => {
    const l = distinctLimiter(2, MIN);
    assert.equal(l.allow('ip', 'x', 0), true);
    assert.equal(l.allow('ip', 'x', 1), true);
    assert.equal(l.allow('ip', 'x', 2), true);
    assert.equal(l.allow('ip', 'y', 3), true);
    assert.equal(l.allow('ip', 'z', 4), false);
    // The ones already in are still fine while a new one is refused.
    assert.equal(l.allow('ip', 'x', 5), true);
  });

  test('the window resets the set', () => {
    const l = distinctLimiter(1, MIN);
    assert.equal(l.allow('ip', 'x', 0), true);
    assert.equal(l.allow('ip', 'y', 1), false);
    assert.equal(l.allow('ip', 'y', MIN), true);
  });
});
