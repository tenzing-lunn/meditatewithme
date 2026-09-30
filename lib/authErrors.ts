/**
 * What to say when the sign-in service says no.
 *
 * Supabase's own messages are written for developers — "For security
 * purposes, you can only request this after 52 seconds" — and a product that
 * never otherwise sounds like that should not start at the one moment
 * somebody is trusting it with an email address. So the account panel never
 * prints `error.message`; it prints one of the three sentences here.
 *
 * Mapped on the error's `code` first, which the auth server sends with every
 * response it makes (`over_email_send_rate_limit`, `otp_expired`, …), and
 * only then on words in the message, for errors that arrive without one.
 * Anything unrecognised — `otp_disabled`, a database error, nothing at all —
 * is the third sentence: the remedy is the same whether the service could
 * not be reached or answered something this file has never seen, and a more
 * precise sentence would be a guess.
 *
 * Pure, and it takes the code and the message as strings rather than the
 * AuthError, so it costs nothing to test and nothing to move.
 */

/** Too many emails, or too many tries, in too short a time. */
export const RATE_LIMITED = 'Give it a minute, then ask again.';

/** A six-digit code that did not match, or is too old to. */
export const CODE_REJECTED =
  'That code did not match, or it has expired. Send yourself a fresh one.';

/** No usable answer from the service at all. */
export const SERVICE_UNREACHABLE =
  'Could not reach the sign-in service. Please try again.';

const RATE_LIMIT_CODES = new Set([
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  'over_sms_send_rate_limit',
]);

const CODE_REJECTED_CODES = new Set(['otp_expired', 'validation_failed']);

export function authErrorMessage(
  code: string | null | undefined,
  message: string | null | undefined,
): string {
  if (code && RATE_LIMIT_CODES.has(code)) return RATE_LIMITED;
  if (code && CODE_REJECTED_CODES.has(code)) return CODE_REJECTED;

  const text = message ?? '';
  if (/rate limit|security purposes/i.test(text)) return RATE_LIMITED;
  if (/expired|invalid|not match/i.test(text)) return CODE_REJECTED;
  return SERVICE_UNREACHABLE;
}

/**
 * What to say for a `reason` from the site's own email routes
 * (`app/api/account/emails`, `app/api/signin`).
 */
export function emailReasonMessage(reason: unknown): string {
  switch (reason) {
    case 'taken': return 'That email already has its own account here.';
    case 'yours': return 'That email is already on your account.';
    case 'invalid': return 'That does not look like an email address.';
    case 'wait': return RATE_LIMITED;
    case 'wrong':
    case 'dead': return CODE_REJECTED;
    case 'last': return 'This is the only email on your account, so it has to stay.';
    case 'unavailable': return 'Connecting another email is not switched on yet.';
    default: return SERVICE_UNREACHABLE;
  }
}
