import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { hourStart } from '@/lib/session';
import { snapToCell, type Cell } from '@/lib/geo';

/**
 * Record that an anonymous participant is present in the current session.
 *
 * Called every 30s by visible room clients. Goes through a route
 * handler rather than straight from the browser because `heartbeats` has RLS
 * enabled with no browser policy — so the anon key cannot touch it and nobody
 * can inflate the count from the console.
 *
 * The server, not the client, decides which hour a heartbeat belongs to. A
 * client-supplied hour would let anyone write rows into arbitrary hours.
 *
 * The server also decides WHERE a heartbeat is, for the same reason and one
 * more. The reason it shares with the hour: a client-supplied position is a
 * client-supplied lie, and the globe would be trivially seedable with lights
 * from a console. The extra reason is privacy — deriving it here means the
 * browser is never asked for permission, and the reading is thrown away in the
 * same function that coarsens it.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Roughly where the request came from, coarsened to a grid cell.
 *
 * Vercel resolves the client address at the edge and hands the result on as
 * headers; nothing here reads the address itself. On localhost, behind some
 * VPNs, and whenever the edge cannot place an address, the headers are simply
 * absent — `snapToCell` returns null and the heartbeat is written without a
 * cell. It still counts. It is just not on the globe.
 *
 * Note what is NOT read: `x-vercel-ip-city` and `x-vercel-ip-country` are both
 * available and neither is stored. A city name is a much stronger identifier
 * than a one-degree cell for anyone in a small one, and the globe has no use
 * for a label.
 */
function cellFrom(request: Request): Cell | null {
  const h = request.headers;
  return snapToCell(
    h.get('x-vercel-ip-latitude'),
    h.get('x-vercel-ip-longitude'),
  );
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let anonId: unknown;
  let began = false;

  try {
    const body = (await request.json()) as { anonId?: unknown; began?: unknown };
    anonId = body.anonId;
    began = body.began === true;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Validate rather than trust: an unvalidated id lets someone write millions
  // of distinct rows and both inflate the count and bloat the table.
  if (typeof anonId !== 'string' || !UUID_RE.test(anonId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const supabase = serviceClient();

    // Upsert on (anon_id, hour_start): one row per person per session,
    // refreshed rather than appended. The table stays small by construction.
    const now = new Date();
    const start = hourStart(now.getTime()).toISOString();
    const cell = cellFrom(request);
    const heartbeat = {
      anon_id: anonId,
      hour_start: start,
      last_seen: now.toISOString(),
      // A normal liveness update must not erase the moment this person began.
      // A second Begin deliberately restamps it: that is a new sitting.
      ...(began ? { began_at: now.toISOString() } : {}),
      // Spread the same way, and for a related reason: an upsert with
      // `cell_lat: null` would blank a cell that an earlier beat in this hour
      // had placed. Somebody who opens the room on wifi and finishes on a
      // train should stay where they started rather than falling off the
      // globe, and a request the edge cannot place should change nothing.
      ...(cell ? { cell_lat: cell.lat, cell_lon: cell.lon } : {}),
    };

    const { error } = await supabase.from('heartbeats').upsert(
      heartbeat,
      { onConflict: 'anon_id,hour_start' },
    );

    if (error) throw error;

    if (began) {
      // This is a sentence for one moment, not another live counter. Keep the
      // window short enough to mean "together" and make the server's timestamp
      // the authority, so a device with a wrong clock cannot join the cohort.
      const beganCutoff = new Date(now.getTime() - 30_000).toISOString();
      const { count, error: countError } = await supabase
        .from('heartbeats')
        .select('*', { count: 'exact', head: true })
        .eq('hour_start', start)
        .gte('began_at', beganCutoff);

      if (countError) throw countError;

      return NextResponse.json(
        { ok: true, beganCount: count ?? 1 },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    // Non-fatal by design. A failed heartbeat means this person isn't counted
    // for 30 seconds. It must never interrupt their session.
    return NextResponse.json(
      { ok: false },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
