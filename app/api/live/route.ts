import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { LIVE_STALE_MS, hlsUrl } from '@/lib/live';

/**
 * Who is live right now, and where to watch.
 *
 * `{ live: { slug, hls } }`, or `{ live: null }` when nobody is — and also
 * when anything fails, so the page falls back to the earth rather than showing
 * an error. The collaborator's name is not sent.
 *
 * Of the streams still reporting, the most recently started wins: at a
 * handover the incoming sitter goes live before the outgoing one stops.
 *
 * Held at the edge for five seconds and not at all in the browser, so a
 * handover or a revocation reaches viewers within about five seconds.
 */

export const dynamic = 'force-dynamic';

const none = () =>
  NextResponse.json({ live: null }, { headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  const base = process.env.LIVE_HLS_BASE;
  if (!base) return none();

  try {
    const supabase = await serviceClient();
    const { data, error } = await supabase
      .from('stream_keys')
      .select('slug')
      .is('revoked_at', null)
      .not('live_since', 'is', null)
      .gt('live_seen', new Date(Date.now() - LIVE_STALE_MS).toISOString())
      .order('live_since', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return none();

    return NextResponse.json(
      { live: data ? { slug: data.slug, hls: hlsUrl(base, data.slug) } : null },
      {
        headers: {
          'Cache-Control': 'public, max-age=0, must-revalidate',
          'CDN-Cache-Control': 'public, s-maxage=5',
        },
      },
    );
  } catch {
    return none();
  }
}
