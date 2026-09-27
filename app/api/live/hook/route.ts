import { serviceClient } from '@/lib/supabase';
import { sinceFrom, slugFromPath } from '@/lib/live';
import { bearer, secretMatches } from '../secret';

/**
 * MediaMTX says a stream came online, is still online, or went offline.
 *
 * Called by infra/mediamtx/hook.sh, which the server runs for as long as a
 * stream is online: `online` once, `seen` every 30 seconds, `offline` when it
 * stops. Every call carries `since`, when that stream came online, and that
 * is what makes them safe out of order: `online` and `seen` are the same
 * write, and `offline` only clears a row that still holds its own `since` —
 * so a reconnect's late `offline` cannot wipe the stream that replaced it.
 *
 * Guarded by a bearer secret only the server holds.
 */

export const dynamic = 'force-dynamic';

type Body = { path?: unknown; state?: unknown; since?: unknown; server?: unknown };

export async function POST(request: Request) {
  if (!secretMatches(bearer(request), process.env.LIVE_HOOK_SECRET)) {
    return new Response(null, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new Response(null, { status: 400 });
  }

  const slug = slugFromPath(body.path);
  const since = sinceFrom(body.since, Date.now());
  const state = body.state;
  if (!slug || !since || (state !== 'online' && state !== 'seen' && state !== 'offline')) {
    return new Response(null, { status: 400 });
  }
  const server =
    typeof body.server === 'string' && body.server !== ''
      ? body.server.slice(0, 40)
      : null;

  try {
    const supabase = await serviceClient();
    const rows = supabase.from('stream_keys');
    const { error } =
      state === 'offline'
        ? await rows
            .update({ live_since: null, live_seen: null, live_server: null })
            .eq('slug', slug)
            .eq('live_since', since)
        : await rows
            .update({
              live_since: since,
              live_seen: new Date().toISOString(),
              live_server: server,
            })
            .eq('slug', slug);
    return new Response(null, { status: error ? 500 : 204 });
  } catch {
    return new Response(null, { status: 500 });
  }
}
