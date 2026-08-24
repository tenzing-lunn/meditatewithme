/**
 * Clock correction.
 *
 * Date.now() reads the user's device clock, which can be minutes wrong. If
 * someone's laptop runs three minutes fast, their candle lights three minutes
 * early and the shared moment silently isn't shared. Nobody would ever report
 * this as a bug — they'd just find the site vaguely off.
 *
 * So: measure the offset against the server once on load, and use
 * `serverNow()` everywhere instead of Date.now() for session maths.
 *
 * IMPORTANT: this is for the SESSION clock only. The personal meditation timer
 * uses performance.now() (see lib/timer.ts) because it needs monotonicity, not
 * absolute correctness — a clock adjustment mid-sit must not move the bell.
 */

/** Offset in ms to add to Date.now() to approximate server time. */
let offsetMs = 0;
let synced = false;

/**
 * Compute the clock offset from a round-trip measurement.
 *
 * Assumes latency is symmetric, so the server's timestamp corresponds to
 * roughly the midpoint of the request. Good to within half the RTT, which on
 * any reasonable connection is far below the precision we need — we care about
 * seconds, not milliseconds.
 *
 * Pure, so it can be tested without a network.
 */
export function computeOffset(
  t0: number,
  t1: number,
  serverTimeMs: number,
): number {
  const rtt = t1 - t0;
  return serverTimeMs + rtt / 2 - t1;
}

/**
 * Server time, as best we can estimate it. Use this for anything involving
 * which session is running.
 */
export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function getOffset(): number {
  return offsetMs;
}

export function isSynced(): boolean {
  return synced;
}

/** Test seam. */
export function setOffset(ms: number): void {
  offsetMs = ms;
  synced = true;
}

export function resetClock(): void {
  offsetMs = 0;
  synced = false;
}

/**
 * Sync against /api/time.
 *
 * Failure is non-fatal by design: we fall back to the device clock with a zero
 * offset. A slightly wrong session time is much better than a broken page —
 * see the failure-mode table in docs/ARCHITECTURE.md.
 *
 * Call on mount and again on tab focus, since laptops sleep and wake with a
 * clock that may have been corrected by NTP in the meantime.
 */
export async function syncClock(
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const t0 = Date.now();
    const res = await fetchImpl('/api/time', { cache: 'no-store' });
    const t1 = Date.now();
    if (!res.ok) return false;

    const { now } = (await res.json()) as { now: number };
    if (typeof now !== 'number' || !Number.isFinite(now)) return false;

    offsetMs = computeOffset(t0, t1, now);
    synced = true;
    return true;
  } catch {
    return false;
  }
}
