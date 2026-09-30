/**
 * The rules for the site's own email codes — connecting another address to an
 * account, and signing in with a connected one. Pure: the routes in
 * `app/api/account/emails` and `app/api/signin` bring the clock, the random
 * digits and the hashing.
 */

/** A code is good for ten minutes. */
export const CODE_TTL_MS = 10 * 60_000;

/** Five wrong tries and the code is dead; ask for another. */
export const MAX_ATTEMPTS = 5;

/** No second code to the same address inside a minute. */
export const RESEND_GAP_MS = 60_000;

/** Lower-cased and trimmed, or null if it cannot be an address. */
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const email = input.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/**
 * A Gmail address, which signs in only through *Continue with Google*
 * (Tenzing, 30 September 2026). Google sign-in finds an account by Google's
 * own identity, not by our `account_emails`, so a Gmail address connected or
 * signed in by code would sooner or later meet a second account made for it
 * by the Google button. Taking Gmail out of the code path removes that.
 */
export function isGoogleMail(email: string): boolean {
  return /@(gmail|googlemail)\.com$/i.test(email.trim());
}

export function isCode(input: unknown): input is string {
  return typeof input === 'string' && /^[0-9]{6}$/.test(input);
}

/** Whether another code may be sent, given when the last one went. */
export function canResend(sentAt: number | null, now: number): boolean {
  return sentAt === null || now - sentAt >= RESEND_GAP_MS;
}

/** Whether a stored code can still be tried at all. */
export function codeUsable(row: { attempts: number; expiresAt: number }, now: number): boolean {
  return row.attempts < MAX_ATTEMPTS && now < row.expiresAt;
}
