import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { ingest, ingestHost } from '@/lib/live';
import { cleanText } from '@/lib/label';
import { callerOf } from '../../_email/codes';
import { accountKey, hashKey } from '../../live/secret';
import { report } from '../../_report';

/**
 * The caller's stream key, if they are approved to stream.
 *
 * Approval is an admin's (`/admin`, or `npm run live:key -- approve`); this
 * route only ever reads and changes the caller's own row, found by the
 * account the access token proves (`callerOf`) — never an id from the
 * body. A caller with no working key gets `{ approved: false }` and where
 * their application stands (`application`: null, `pending`, `declined`);
 * PUT is applying. Every answer says whether the caller is an admin, so
 * the account page can show the way to `/admin`.
 *
 * GET shows the server, the key and the one-line address; the key is
 * worked out, not stored (`accountKey`), and if the stored hash does not
 * match it (a row just approved, or the service-role key changed) this is
 * where the matching hash is written. PATCH sets `showName`. POST makes a
 * new key: the old one is refused at its next connection, and a stream
 * already running is not cut.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const answer = (body: object, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

type Row = { slug: string; name: string; key_version: number; key_hash: string; show_name: boolean };

async function start(request: Request) {
  try {
    const db = await serviceClient();
    const user = await callerOf(request, db);
    return user ? { db, user } : null;
  } catch (err) {
    report('account/stream', err);
    return null;
  }
}

async function isAdmin(db: Awaited<ReturnType<typeof serviceClient>>, userId: string): Promise<boolean> {
  const { data, error } = await db.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data !== null;
}

async function rowOf(db: Awaited<ReturnType<typeof serviceClient>>, userId: string): Promise<Row | null> {
  const { data, error } = await db
    .from('stream_keys')
    .select('slug, name, key_version, key_hash, show_name')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** The answer for a row whose `key_hash` already matches its version. */
function shown(row: Row, host: string) {
  const key = accountKey(row.slug, row.key_version);
  return { ok: true, approved: true, name: row.name, showName: row.show_name, ...ingest(host, row.slug, key) };
}

const hostNow = () => ingestHost(process.env.LIVE_INGEST_HOST, process.env.LIVE_HLS_BASE);

export async function GET(request: Request) {
  const s = await start(request);
  if (!s) return answer({ ok: false }, 401);
  try {
    const [row, admin] = await Promise.all([rowOf(s.db, s.user.id), isAdmin(s.db, s.user.id)]);
    if (!row) {
      const { data: app, error } = await s.db
        .from('guide_applications')
        .select('status')
        .eq('user_id', s.user.id)
        .maybeSingle();
      if (error) throw error;
      return answer({ ok: true, approved: false, admin, application: app?.status ?? null });
    }
    const host = hostNow();
    if (!host) return answer({ ok: false, reason: 'unavailable' }, 503);
    const hash = hashKey(accountKey(row.slug, row.key_version));
    if (hash !== row.key_hash) {
      const { error } = await s.db.from('stream_keys').update({ key_hash: hash }).eq('slug', row.slug);
      if (error) throw error;
    }
    return answer({ ...shown(row, host), admin });
  } catch (err) {
    report('account/stream', err);
    return answer({ ok: false }, 500);
  }
}

/** Apply to guide: a name to be known by and a few words. Again replaces. */
export async function PUT(request: Request) {
  const s = await start(request);
  if (!s) return answer({ ok: false }, 401);
  const body = await request.json().catch(() => null);
  const name = cleanText(body?.name, 60);
  const about = typeof body?.about === 'string' ? body.about.trim().slice(0, 1000) : '';
  if (!name || !about) return answer({ ok: false, reason: 'empty' }, 400);
  try {
    if (await rowOf(s.db, s.user.id)) return answer({ ok: false, reason: 'already' }, 409);
    const { error } = await s.db.from('guide_applications').upsert({
      user_id: s.user.id,
      name,
      about,
      status: 'pending',
      created_at: new Date().toISOString(),
      decided_at: null,
    });
    if (error) throw error;
    return answer({ ok: true, application: 'pending' });
  } catch (err) {
    report('account/stream', err);
    return answer({ ok: false }, 500);
  }
}

export async function PATCH(request: Request) {
  const s = await start(request);
  if (!s) return answer({ ok: false }, 401);
  const body = await request.json().catch(() => null);
  if (typeof body?.showName !== 'boolean') return answer({ ok: false }, 400);
  try {
    const { data, error } = await s.db
      .from('stream_keys')
      .update({ show_name: body.showName })
      .eq('user_id', s.user.id)
      .is('revoked_at', null)
      .select('slug');
    if (error) throw error;
    if (!data.length) return answer({ ok: false }, 404);
    return answer({ ok: true, showName: body.showName });
  } catch (err) {
    report('account/stream', err);
    return answer({ ok: false }, 500);
  }
}

export async function POST(request: Request) {
  const s = await start(request);
  if (!s) return answer({ ok: false }, 401);
  try {
    const row = await rowOf(s.db, s.user.id);
    if (!row) return answer({ ok: false }, 404);
    const host = hostNow();
    if (!host) return answer({ ok: false, reason: 'unavailable' }, 503);
    const version = row.key_version + 1;
    const { error } = await s.db
      .from('stream_keys')
      .update({ key_version: version, key_hash: hashKey(accountKey(row.slug, version)) })
      .eq('slug', row.slug);
    if (error) throw error;
    return answer(shown({ ...row, key_version: version }, host));
  } catch (err) {
    report('account/stream', err);
    return answer({ ok: false }, 500);
  }
}
