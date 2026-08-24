import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { hourStart } from '@/lib/session';

/**
 * Participant count for the current session.
 *
 * The whole design rests on one observation: this number is low-value,
 * low-frequency, and IDENTICAL FOR EVERY VIEWER. That is the definition of
 * something to cache rather than push.
 *
 * So one edge cache entry with a 10s TTL serves the entire world. A thousand
 * concurrent users produce roughly one origin query every ten seconds. The
 * Realtime-presence approach would have produced ~N messages per join, with
 * every join landing in the same few seconds at the top of the hour.
 *
 * `stale-while-revalidate` means a viewer never waits on the refresh — they
 * get the slightly-old number instantly and the cache updates behind them.
 * Nobody can tell 43 from 45 people, so slightly-old is free.
 */

/** A heartbeat older than this doesn't count as present. */
const LIVENESS_WINDOW_SECONDS = 90;

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = hourStart(Date.now());

  try {
    const supabase = serviceClient();
    const cutoff = new Date(Date.now() - LIVENESS_WINDOW_SECONDS * 1000);

    const { count, error } = await supabase
      .from('heartbeats')
      .select('*', { count: 'exact', head: true })
      .eq('hour_start', start.toISOString())
      .gt('last_seen', cutoff.toISOString());

    if (error) throw error;

    return NextResponse.json(
      { count: count ?? 0, hourStart: start.toISOString() },
      {
        headers: {
          // Browsers hold it 10s; the edge holds it 10s and serves stale for
          // another 20 while it refreshes.
          'Cache-Control': 'public, max-age=10',
          'CDN-Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
        },
      },
    );
  } catch {
    // Degrade silently. The UI hides the count rather than showing an error —
    // somebody sitting down to meditate should never see a red banner.
    return NextResponse.json(
      { count: null, hourStart: start.toISOString() },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
