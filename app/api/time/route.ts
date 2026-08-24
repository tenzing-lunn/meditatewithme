import { NextResponse } from 'next/server';

/**
 * Server clock.
 *
 * The client measures its offset against this once on load and on tab focus,
 * then uses `serverNow()` for all session maths. Without it, a device clock
 * that is three minutes fast lights the candle three minutes early and the
 * shared moment silently isn't shared.
 *
 * MUST NOT be cached — a cached timestamp is worse than no timestamp, because
 * it produces a confidently wrong offset rather than an obvious failure.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function GET() {
  return NextResponse.json(
    { now: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    },
  );
}
