/**
 * Live video: the rules, with no I/O.
 *
 * Every collaborator has a stream key. The key is a secret; the slug is not.
 * They publish to MediaMTX at the path `live/<slug>` and prove who they are
 * with `?key=<key>` (RTMP, OBS's stream key field) or as the password (SRT's
 * streamid). MediaMTX asks our route whether to let them in; the route asks
 * this file what the request says, and the database whether the key is real.
 *
 * Viewers read `live/<slug>/index.m3u8` straight from MediaMTX, so the slug is
 * public by design and the key never appears in anything a viewer can see.
 *
 * Portable: nothing here touches a browser global (tests/portability.test.ts).
 */

/** Eight lowercase letters and digits. Public; appears in the HLS address. */
export const SLUG_RE = /^[a-z0-9]{8}$/;

/** URL-safe base64 of 32 random bytes is 43 characters; allow some slack. */
export const KEY_RE = /^[A-Za-z0-9_-]{32,64}$/;

/**
 * How long a stream counts as live after MediaMTX last said so.
 *
 * The server's hook reports every 30 seconds while a stream is online. If the
 * server itself dies, no "offline" call ever comes, so liveness has to expire
 * on its own: three missed reports, and the site stops showing it.
 */
export const LIVE_STALE_MS = 90_000;

export function pathFor(slug: string): string {
  return `live/${slug}`;
}

/** The slug in `live/<slug>`, or null for any other path. */
export function slugFromPath(path: unknown): string | null {
  if (typeof path !== 'string') return null;
  const m = /^live\/([a-z0-9]{8})$/.exec(path);
  return m ? m[1]! : null;
}

/**
 * The key a publisher sent: `?key=` in the query, else the password field.
 * Null when neither is a well-formed key, so a malformed one never reaches the
 * database.
 */
export function keyFrom(query: unknown, password: unknown): string | null {
  if (typeof query === 'string' && query !== '') {
    const fromQuery = new URLSearchParams(query).get('key');
    if (fromQuery !== null) return KEY_RE.test(fromQuery) ? fromQuery : null;
  }
  if (typeof password === 'string' && KEY_RE.test(password)) return password;
  return null;
}

/**
 * What MediaMTX is asking. Only `publish` is ever sent here — reading is
 * excluded in the server config so viewers never wait on this route — but
 * anything else is refused rather than assumed.
 */
export type AuthRequest = {
  action?: unknown;
  path?: unknown;
  query?: unknown;
  password?: unknown;
};

export type AuthCheck =
  | { kind: 'deny' }
  | { kind: 'check'; slug: string; key: string };

export function authCheck(req: AuthRequest): AuthCheck {
  if (req.action !== 'publish') return { kind: 'deny' };
  const slug = slugFromPath(req.path);
  const key = keyFrom(req.query, req.password);
  if (!slug || !key) return { kind: 'deny' };
  return { kind: 'check', slug, key };
}

/**
 * The `since` a hook call carries: when that stream came online, as the
 * server's `date -u +%Y-%m-%dT%H:%M:%SZ`. Null unless it is exactly that shape
 * and plausible — no later than a minute from now (clock skew), no earlier
 * than a month ago (the longest a stream could honestly have run).
 */
export function sinceFrom(value: unknown, now: number): string | null {
  if (typeof value !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t) || t > now + 60_000 || t < now - 31 * 86_400_000) return null;
  return value;
}

/** Where a viewer reads a slug's stream, given the server's HLS base URL. */
export function hlsUrl(base: string, slug: string): string {
  return `${base.replace(/\/+$/, '')}/${pathFor(slug)}/index.m3u8`;
}
