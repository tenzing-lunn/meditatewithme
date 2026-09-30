import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  RESEND_GAP_MS,
  canResend,
  codeUsable,
  isCode,
  isGoogleMail,
  normalizeEmail,
} from '../lib/emailCode.ts';

describe('normalizeEmail', () => {
  test('trims and lower-cases, so one address is one row', () => {
    assert.equal(normalizeEmail('  Henry@Example.COM '), 'henry@example.com');
  });
  test('refuses what cannot be an address', () => {
    for (const bad of ['', 'henry', 'henry@', '@x.com', 'a b@c.com', 'a@b', 42, null]) {
      assert.equal(normalizeEmail(bad), null, String(bad));
    }
  });
  test('refuses an address longer than the column', () => {
    assert.equal(normalizeEmail(`${'a'.repeat(250)}@b.co`), null);
  });
});

describe('isGoogleMail', () => {
  test('gmail and googlemail, any case', () => {
    assert.equal(isGoogleMail('a@gmail.com'), true);
    assert.equal(isGoogleMail(' A@GoogleMail.com '), true);
  });
  test('nothing else, not even lookalikes', () => {
    assert.equal(isGoogleMail('a@fordham.edu'), false);
    assert.equal(isGoogleMail('a@gmail.com.evil.io'), false);
    assert.equal(isGoogleMail('a@notgmail.com'), false);
  });
});

describe('isCode', () => {
  test('six digits and nothing else', () => {
    assert.equal(isCode('012345'), true);
    assert.equal(isCode('12345'), false);
    assert.equal(isCode('1234567'), false);
    assert.equal(isCode('12a456'), false);
    assert.equal(isCode(123456), false);
  });
});

describe('canResend', () => {
  test('the first code always goes', () => {
    assert.equal(canResend(null, 0), true);
  });
  test('a second waits out the gap', () => {
    assert.equal(canResend(1000, 1000 + RESEND_GAP_MS - 1), false);
    assert.equal(canResend(1000, 1000 + RESEND_GAP_MS), true);
  });
});

describe('codeUsable', () => {
  const expiresAt = 5000 + CODE_TTL_MS;
  test('good until it expires', () => {
    assert.equal(codeUsable({ attempts: 0, expiresAt }, expiresAt - 1), true);
    assert.equal(codeUsable({ attempts: 0, expiresAt }, expiresAt), false);
  });
  test('dead after the last wrong try', () => {
    assert.equal(codeUsable({ attempts: MAX_ATTEMPTS - 1, expiresAt }, 0), true);
    assert.equal(codeUsable({ attempts: MAX_ATTEMPTS, expiresAt }, 0), false);
  });
});
