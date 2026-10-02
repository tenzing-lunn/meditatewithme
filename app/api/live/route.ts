import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { HOUR_MS, LIVE_STALE_MS, hlsUrl, hourOf, onAir, type LiveStream } from '@/lib/live';

/**
 * Who is on air right now, and where to watch.
 *
 * `{ live: { slug, hls } }` while someone is on air; `{ live: null, next }`
 * between sessions — someone is waiting and goes on at `next`, the top of
 * the hour; `{ live: null }` when nobody is live — and also when anything
 * fails, so the page falls back to the earth rather than showing an error.
 * The guide's name is sent only if they turned that on in their account
 * (`stream_keys.show_name`); otherwise `name` is absent.
 *
 * One collaborator holds each hour and handovers happen on the hour; the
 * rules are `onAir` in lib/live.ts. This route claims the hour for them in
 * `live_hours` the first time it is asked in that hour.
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
    const now = Date.now();
    const { data: rows, error } = await supabase
      .from('stream_keys')
      .select('slug, name, show_name, live_since')
      .is('revoked_at', null)
      .not('live_since', 'is', null)
      .gt('live_seen', new Date(now - LIVE_STALE_MS).toISOString());
    if (error) return none();

    // The hours held since the earliest of these sessions began, and the
    // current one: enough to know who holds this hour and who has had a turn.
    const hour = hourOf(now);
    const earliest = Math.min(hour, ...rows.map((r) => Date.parse(r.live_since!)));
    const { data: held, error: heldError } = rows.length
      ? await supabase
          .from('live_hours')
          .select('hour, slug')
          .gte('hour', new Date(hourOf(earliest) - HOUR_MS).toISOString())
      : { data: [], error: null };
    if (heldError) return none();

    const hours = held.map((h) => ({ hour: Date.parse(h.hour), slug: h.slug }));
    const lastHeld = (slug: string) => {
      const mine = hours.filter((h) => h.slug === slug).map((h) => h.hour);
      return mine.length ? Math.max(...mine) : null;
    };
    const streams: LiveStream[] = rows.map((r) => ({
      slug: r.slug,
      since: Date.parse(r.live_since!),
      lastHeld: lastHeld(r.slug),
    }));
    let holder = hours.find((h) => h.hour === hour)?.slug ?? null;

    let air = onAir(streams, holder, now);
    if (air.kind === 'live' && air.claim) {
      // Only one request can claim the hour; if another got there first
      // with someone else, theirs stands.
      await supabase
        .from('live_hours')
        .upsert({ hour: new Date(hour).toISOString(), slug: air.slug }, { ignoreDuplicates: true });
      const { data: won } = await supabase
        .from('live_hours')
        .select('slug')
        .eq('hour', new Date(hour).toISOString())
        .maybeSingle();
      holder = won?.slug ?? air.slug;
      air = onAir(streams, holder, now);
    }

    const named = rows.find((r) => r.slug === (air.kind === 'live' ? air.slug : null));
    const body =
      air.kind === 'live'
        ? {
            live: {
              slug: air.slug,
              hls: hlsUrl(base, air.slug),
              ...(named?.show_name ? { name: named.name } : {}),
            },
          }
        : air.kind === 'between'
          ? { live: null, next: new Date(air.next).toISOString() }
          : { live: null };
    return NextResponse.json(body, {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'public, s-maxage=5',
      },
    });
  } catch {
    return none();
  }
}
