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

/**
 * Who is on air: one collaborator per hour, handovers only on the hour.
 *
 * The hour belongs to whoever held it first — claimed by the first request
 * in it that finds someone live, and kept in `live_hours` so it survives a
 * dropped connection (the holder gets it back on reconnecting). Anyone else
 * live waits off the air: connected, able to check their picture, not shown.
 * In the last GRACE_MS of the hour, or once the holder has gone, a waiting
 * collaborator means the between screen until the hour; nobody waiting
 * means the holder just carries on, or nothing.
 *
 * On the hour the air goes to whoever has waited longest: since they went
 * live, or since the end of the last hour they held in this same session.
 * So two collaborators live together alternate hourly, and three take turns
 * in the order they arrived. A claim is never made in the grace minutes, so
 * someone arriving at :57 is not charged an hour they barely had.
 */
export const HOUR_MS = 3_600_000;
export const GRACE_MS = 5 * 60_000;

export type LiveStream = {
  slug: string;
  /** When this session came online, ms. */
  since: number;
  /** Start of the latest hour this slug held, ms; null if never. */
  lastHeld: number | null;
};

export type OnAir =
  | { kind: 'live'; slug: string; claim: boolean }
  | { kind: 'between'; next: number }
  | { kind: 'none' };

export function hourOf(now: number): number {
  return now - (now % HOUR_MS);
}

function waitingSince(s: LiveStream): number {
  const heldEnd = s.lastHeld === null ? null : s.lastHeld + HOUR_MS;
  return heldEnd !== null && heldEnd > s.since ? heldEnd : s.since;
}

export function onAir(streams: LiveStream[], holder: string | null, now: number): OnAir {
  if (streams.length === 0) return { kind: 'none' };
  const next = hourOf(now) + HOUR_MS;
  const grace = now >= next - GRACE_MS;

  let claim = false;
  if (holder === null) {
    if (grace) {
      // Too late in the hour to claim it. One stream is simply shown;
      // several wait for the hour, where the longest waiting takes it.
      return streams.length === 1
        ? { kind: 'live', slug: streams[0]!.slug, claim: false }
        : { kind: 'between', next };
    }
    const first = [...streams].sort(
      (a, b) => waitingSince(a) - waitingSince(b) || (a.slug < b.slug ? -1 : 1),
    )[0]!;
    holder = first.slug;
    claim = true;
  }

  const onAirNow = streams.some((s) => s.slug === holder);
  const waiting = streams.some((s) => s.slug !== holder);
  if (onAirNow && !(grace && waiting)) return { kind: 'live', slug: holder, claim };
  return waiting ? { kind: 'between', next } : { kind: 'none' };
}
