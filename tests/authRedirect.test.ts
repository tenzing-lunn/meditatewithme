import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLinkError } from '../lib/authRedirect.ts';

test('Google cancellation offers sign-in again, rather than claiming an email expired', () => {
  const message = readLinkError('#error=access_denied&error_description=User+cancelled', '');
  assert.match(message!, /Try Google again/);
  assert.doesNotMatch(message!, /link.*used|expired|User cancelled/);
});

test('spent email links keep their useful explanation', () => {
  assert.match(readLinkError('#error=access_denied&error_code=otp_expired', '')!, /Each one works once/);
});

test('query errors are read even when an unrelated page anchor exists', () => {
  assert.match(readLinkError('#main', '?error=access_denied')!, /Try Google again/);
});

test('a successful OAuth return or ordinary anchor is not an error', () => {
  assert.equal(readLinkError('#access_token=example&refresh_token=example', ''), null);
  assert.equal(readLinkError('#main', '?demo=sitting'), null);
});
