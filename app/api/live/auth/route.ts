import { serviceClient } from '@/lib/supabase';
import { authCheck, type AuthRequest } from '@/lib/live';
import { basicPassword, hashKey, secretMatches } from '../secret';

/**
 * MediaMTX's `authHTTPAddress`. Called every time someone tries to publish.
 *
 * Any 2xx lets them in; anything else turns them away. Reads never arrive
 * here — the server config excludes them, so a viewer never waits on Vercel.
 *
 * Fails closed: if the database cannot be reached, nobody new can go live.
 * A stream already running is unaffected; only a reconnect would be refused.
 */

export const dynamic = 'force-dynamic';

const deny = () => new Response(null, { status: 401 });

export async function POST(request: Request) {
  if (!secretMatches(basicPassword(request), process.env.LIVE_AUTH_SECRET)) {
    return deny();
  }

  let body: AuthRequest;
  try {
    body = (await request.json()) as AuthRequest;
  } catch {
    return deny();
  }

  const check = authCheck(body);
  if (check.kind === 'deny') return deny();

  try {
    const supabase = await serviceClient();
    const { data, error } = await supabase
      .from('stream_keys')
      .select('slug')
      .eq('slug', check.slug)
      .eq('key_hash', hashKey(check.key))
      .is('revoked_at', null)
      .maybeSingle();
    if (error || !data) return deny();
    return new Response(null, { status: 204 });
  } catch {
    return deny();
  }
}
