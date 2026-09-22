import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import {
  ambientSession,
  hourStart,
  resolveSession,
  toWire,
  type SessionRow,
} from '@/lib/session';

/**
 * Which session is running right now.
 *
 * `resolveSession()` has existed since the first migration and, until this
 * route, was called by nothing but its own tests. That made the central claim
 * of the architecture — that rows in `sessions` are OVERRIDES and a missing row
 * is the ambient default — an assertion rather than something the running app
 * demonstrated. If the claim were wrong, v2 is when we'd find out, which is the
 * expensive time to find out.
 *
 * So the lookup is injected here exactly as designed: the real Supabase query
 * goes in, a `Session` comes out, and the function's body never learns which it
 * got. Adding live video in v2 is an INSERT into `sessions`, with no change on
 * this path.
 *
 * WHY A ROUTE HANDLER FOR A PUBLIC TABLE
 * `sessions` is world-readable under RLS, so the browser could query it
 * directly with the publishable key. It doesn't, for the same reason the count
 * doesn't: this answer is identical for every viewer on earth and changes at
 * most once an hour. Fetching it per-client would send the whole audience at
 * Supabase in the same few seconds at the top of the hour — precisely the
 * pattern the free tier punishes. One edge cache entry serves everyone.
 *
 * The service role is more privilege than reading a public table needs. It is
 * used because it is the one server client we have, and it buys nothing here
 * that the anon key wouldn't — worth knowing if a write ever lands in this file.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = Date.now();

  try {
    const supabase = await serviceClient();

    const session = await resolveSession(now, async (start) => {
      const { data, error } = await supabase
        .from('sessions')
        .select('hour_start, kind, focus_slug, stream_url, lighter_id')
        .eq('hour_start', start.toISOString())
        // maybeSingle, not single: no row is the expected case in v1, and
        // single() treats it as an error.
        .maybeSingle();

      if (error) throw error;
      return (data as SessionRow | null) ?? null;
    });

    return NextResponse.json(toWire(session), {
      headers: {
        // An hour's session is settled for that hour; a minute of staleness
        // only ever delays a v2 booking that landed mid-hour.
        'Cache-Control': 'public, max-age=60',
        'CDN-Cache-Control':
          'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch {
    // The fallback is not error handling bolted on — it is the same answer the
    // resolver gives for an hour nobody booked, which is almost every hour. A
    // database outage therefore degrades to the normal experience rather than
    // to a broken page.
    return NextResponse.json(toWire(ambientSession(hourStart(now))), {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
