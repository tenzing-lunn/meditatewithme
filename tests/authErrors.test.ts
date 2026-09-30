import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  CODE_REJECTED,
  RATE_LIMITED,
  SERVICE_UNREACHABLE,
  authErrorMessage,
  emailReasonMessage,
} from '../lib/authErrors.ts';

/** The exact strings the auth server sends with these codes today. */
const RATE_LIMIT_RAW = 'For security purposes, you can only request this after 52 seconds';
const OTP_RAW = 'Token has expired or is invalid';

describe('authErrorMessage', () => {
  test('maps on the code first', () => {
    assert.equal(authErrorMessage('over_email_send_rate_limit', RATE_LIMIT_RAW), RATE_LIMITED);
    assert.equal(authErrorMessage('over_request_rate_limit', 'Request rate limit reached'), RATE_LIMITED);
    assert.equal(authErrorMessage('otp_expired', OTP_RAW), CODE_REJECTED);
    assert.equal(authErrorMessage('validation_failed', 'Verify requires a token'), CODE_REJECTED);
  });

  test('falls back to the message when there is no code', () => {
    assert.equal(authErrorMessage(undefined, RATE_LIMIT_RAW), RATE_LIMITED);
    assert.equal(authErrorMessage(undefined, 'Email rate limit exceeded'), RATE_LIMITED);
    assert.equal(authErrorMessage(null, OTP_RAW), CODE_REJECTED);
  });

  test('anything else is the unreachable sentence', () => {
    assert.equal(authErrorMessage('otp_disabled', 'Signups not allowed for otp'), SERVICE_UNREACHABLE);
    assert.equal(authErrorMessage('unexpected_failure', 'Database error saving new user'), SERVICE_UNREACHABLE);
    assert.equal(authErrorMessage(undefined, undefined), SERVICE_UNREACHABLE);
    assert.equal(authErrorMessage(null, ''), SERVICE_UNREACHABLE);
  });

  test("never hands Supabase's own words to the screen", () => {
    for (const [code, raw] of [
      ['over_email_send_rate_limit', RATE_LIMIT_RAW],
      ['otp_expired', OTP_RAW],
      ['unexpected_failure', 'Database error saving new user'],
      [undefined, RATE_LIMIT_RAW],
    ] as const) {
      const out = authErrorMessage(code, raw);
      assert.notEqual(out, raw);
      assert.ok(!/security purposes|\d+ seconds|token/i.test(out), out);
      assert.ok([RATE_LIMITED, CODE_REJECTED, SERVICE_UNREACHABLE].includes(out));
    }
  });
});

describe('emailReasonMessage', () => {
  test('an address on another account says so', () => {
    assert.equal(emailReasonMessage('taken'), 'That email already has its own account here.');
  });
  test('code and rate reasons share the sign-in sentences', () => {
    assert.equal(emailReasonMessage('wrong'), CODE_REJECTED);
    assert.equal(emailReasonMessage('dead'), CODE_REJECTED);
    assert.equal(emailReasonMessage('wait'), RATE_LIMITED);
  });
  test('anything unknown is the unreachable sentence', () => {
    assert.equal(emailReasonMessage(undefined), SERVICE_UNREACHABLE);
  });
});
