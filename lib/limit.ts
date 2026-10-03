/**
 * Rate limits for the public routes, in memory.
 *
 * Two shapes. `rateLimiter` answers "has this key made more than N requests
 * in the window?" — for `/api/signin` and the heartbeat, per address.
 * `distinctLimiter` answers "has this key introduced more than N *different*
 * members in the window?" — for the heartbeat, per address, counting anon
 * ids: a loop that invents a fresh UUID per request passes the first check
 * and is what inflates the count, so it is the one that matters there.
 *
 * Both are fixed windows. A sliding window would be fairer at the boundary
 * and is not worth the bookkeeping for limits this loose; a legitimate
 * client sits far below every number used.
 *
 * WHAT THIS IS AND IS NOT
 *
 * One `Map` per warm function instance. On Vercel an instance serves many
 * requests, so it is a real speed bump against the casual `curl` loop; it is
 * not a wall, because a burst can land on several instances and a cold one
 * starts empty. The wall is Vercel's Firewall rate-limit rules, set in the
 * dashboard, not in code. This exists so the application is not defenceless
 * when that rule is missing, mis-set or on the wrong path — and so the limit
 * is in the repository where a test can read it.
 *
 * Pure: time comes in as a parameter, nothing here reads a clock or an
 * address. The route finds the address (`app/api/_ip.ts`); this counts.
 */

export type Limiter = {
  /** True if this request is within the limit; false means refuse it. */
  allow(key: string, now: number): boolean;
};

export type DistinctLimiter = {
  /**
   * True if `member` is already known for `key` this window, or is new and
   * there is room for it. False means too many different members.
   */
  allow(key: string, member: string, now: number): boolean;
};

/** Keep the maps from growing without bound on a long-lived instance. */
const MAX_KEYS = 10_000;

/** Drop the oldest entries once the map is past its cap. Insertion order is what `Map` keeps. */
function trim<V>(map: Map<string, V>): void {
  if (map.size <= MAX_KEYS) return;
  const drop = map.size - MAX_KEYS;
  let n = 0;
  for (const key of map.keys()) {
    map.delete(key);
    if (++n >= drop) break;
  }
}

/** Up to `limit` requests per `key` in each `windowMs`. */
export function rateLimiter(limit: number, windowMs: number): Limiter {
  const hits = new Map<string, { start: number; count: number }>();
  return {
    allow(key, now) {
      const h = hits.get(key);
      if (!h || now - h.start >= windowMs) {
        hits.delete(key); // re-insert so it is newest in iteration order
        hits.set(key, { start: now, count: 1 });
        trim(hits);
        return true;
      }
      h.count += 1;
      return h.count <= limit;
    },
  };
}

/** Up to `limit` distinct `member`s per `key` in each `windowMs`. */
export function distinctLimiter(limit: number, windowMs: number): DistinctLimiter {
  const seen = new Map<string, { start: number; members: Set<string> }>();
  return {
    allow(key, member, now) {
      let s = seen.get(key);
      if (!s || now - s.start >= windowMs) {
        seen.delete(key);
        s = { start: now, members: new Set() };
        seen.set(key, s);
        trim(seen);
      }
      if (s.members.has(member)) return true;
      if (s.members.size >= limit) return false;
      s.members.add(member);
      return true;
    },
  };
}
