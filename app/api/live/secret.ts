import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Shared by the two routes MediaMTX calls. Server only.
 *
 * Both routes are guarded by a secret the MediaMTX server holds, so nobody
 * else can ask whether a key is valid, or mark a stream live. Both arrive in
 * the Authorization header, never the URL, so they stay out of request logs.
 */

/** Constant-time comparison of a presented secret with the expected one. */
export function secretMatches(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `Authorization: Bearer <secret>` — how hook.sh sends it. */
export function bearer(request: Request): string | null {
  const h = request.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

/**
 * The password of `Authorization: Basic` — how MediaMTX sends it, from the
 * `https://mtx:<secret>@<site>/api/live/auth` it is configured with.
 */
export function basicPassword(request: Request): string | null {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Basic ')) return null;
  const decoded = Buffer.from(h.slice(6), 'base64').toString();
  const colon = decoded.indexOf(':');
  return colon === -1 ? null : decoded.slice(colon + 1);
}

/** Keys are stored as SHA-256 hex; see supabase/migrations/*_stream_keys.sql. */
export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
