import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { hourStart } from '@/lib/session';

/**
 * Record that an anonymous participant is present in the current session.
 *
 * Called every 30s by clients that have pressed Begin. Goes through a route
 * handler rather than straight from the browser because `heartbeats` has RLS
 * enabled with no browser policy — so the anon key cannot touch it and nobody
 * can inflate the count from the console.
 *
 * The server, not the client, decides which hour a heartbeat belongs to. A
 * client-supplied hour would let anyone write rows into arbitrary hours.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let anonId: unknown;

  try {
    ({ anonId } = await request.json());
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
    const { error } = await supabase.from('heartbeats').upsert(
      {
        anon_id: anonId,
        hour_start: hourStart(Date.now()).toISOString(),
        last_seen: new Date().toISOString(),
      },
      { onConflict: 'anon_id,hour_start' },
    );

    if (error) throw error;

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
