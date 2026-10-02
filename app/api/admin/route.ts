import { createHash, randomBytes, randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from '@/lib/supabase';
import { cleanText } from '@/lib/label';
import { normalizeEmail } from '@/lib/emailCode';
import { HOUR_MS, LIVE_STALE_MS, hlsUrl, hourOf, makeSlug, mayShow } from '@/lib/live';
import { callerOf, ownerOf, sendMail } from '../_email/codes';
import { accountKey, hashKey } from '../live/secret';

/**
 * The guides, for an admin (`admins`): Jonny and Tenzing.
 *
 * GET is the whole page: applications waiting, every guide with a working
 * key, and who is connected right now — on air, or waiting for a go-ahead.
 * POST is one action, `{ action, ... }`:
 *
 * - `accept` `{ userId }` / `decline` `{ userId }` an application
 * - `invite` `{ email, name }` — make an account a guide directly
 * - `alone` `{ slug, on }` — goes on air by themselves, or waits
 * - `on-air` `{ slug }` — the go-ahead, good to the end of this hour
 * - `renew` `{ slug }` — a new key for an account guide; the old one is
 *   refused at its next connection
 * - `remove` `{ slug }` — revoke the key; they are no longer a guide
 * - `shut-off` `{ slug }` — revoke the key, tell viewers it will be back
 *   soon, and the server cuts the connection at its next beat (`hook.sh`)
 *
 * Accepting or inviting emails the guide that their server and key are in
 * their account; if the email fails the guide is still made, and the
 * answer says so. Every call proves the caller is an admin first.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const answer = (body: object, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

const SITE = 'https://www.meditatewithme.online';

async function admin(request: Request) {
  try {
    const db = await serviceClient();
    const user = await callerOf(request, db);
    if (!user) return null;
    const { data } = await db.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    return data ? { db, user } : null;
  } catch {
    return null;
  }
}

async function emailOf(db: SupabaseClient, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await db.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/** Tell a new guide where their key is. False if it could not be sent. */
async function welcome(to: string | null, name: string): Promise<boolean> {
  if (!to) return false;
  try {
    await sendMail(
      to,
      'You can guide on Meditate With Me',
      `Hello ${name},\n\nYou can now guide on Meditate With Me. Sign in at ${SITE}, open Account, and your server and stream key are under Streaming.\n\nPoint your streaming app at them and you are on the water for everyone sitting with a guide.`,
      `<p>Hello ${name},</p><p>You can now guide on Meditate With Me. Sign in at <a href="${SITE}">${SITE.replace('https://', '')}</a>, open <b>Account</b>, and your server and stream key are under <b>Streaming</b>.</p><p>Point your streaming app at them and you are on the water for everyone sitting with a guide.</p>`,
    );
    return true;
  } catch {
    return false;
  }
}

/** A key row for an account. The real hash is written the first time they look. */
async function makeGuide(db: SupabaseClient, userId: string, name: string): Promise<'made' | 'already'> {
  const { error } = await db.from('stream_keys').insert({
    slug: makeSlug(randomInt),
    name,
    key_hash: createHash('sha256').update(randomBytes(32)).digest('hex'),
    user_id: userId,
    on_air_alone: false,
  });
  if (error?.code === '23505') return 'already';
  if (error) throw error;
  await db.from('guide_applications').delete().eq('user_id', userId);
  return 'made';
}

export async function GET(request: Request) {
  const a = await admin(request);
  if (!a) return answer({ ok: false }, 403);
  const { db } = a;
  try {
    const now = Date.now();
    const [{ data: apps, error: appsError }, { data: keys, error: keysError }] = await Promise.all([
      db.from('guide_applications').select('user_id, name, about, created_at').eq('status', 'pending').order('created_at'),
      db
        .from('stream_keys')
        .select('slug, name, user_id, on_air_alone, show_name, cleared_until, live_since, live_seen, created_at')
        .is('revoked_at', null)
        .order('created_at'),
    ]);
    if (appsError || keysError) throw appsError ?? keysError;

    const base = process.env.LIVE_HLS_BASE;
    const applications = await Promise.all(
      apps.map(async (r) => ({ userId: r.user_id, name: r.name, about: r.about, at: r.created_at, email: await emailOf(db, r.user_id) })),
    );
    const guides = await Promise.all(
      keys.map(async (r) => {
        const connected = r.live_seen !== null && now - Date.parse(r.live_seen) < LIVE_STALE_MS;
        return {
          slug: r.slug,
          name: r.name,
          email: await emailOf(db, r.user_id),
          account: r.user_id !== null,
          alone: r.on_air_alone,
          showName: r.show_name,
          live: connected ? (mayShow(r, now) ? 'on-air' : 'waiting') : null,
          since: connected ? r.live_since : null,
          hls: connected && base ? hlsUrl(base, r.slug) : null,
        };
      }),
    );
    return answer({ ok: true, applications, guides });
  } catch {
    return answer({ ok: false }, 500);
  }
}

export async function POST(request: Request) {
  const a = await admin(request);
  if (!a) return answer({ ok: false }, 403);
  const { db } = a;
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const slug = typeof body?.slug === 'string' ? body.slug : '';
  const keys = () => db.from('stream_keys');
  try {
    switch (action) {
      case 'accept': {
        const { data: app } = await db
          .from('guide_applications')
          .select('user_id, name')
          .eq('user_id', String(body?.userId ?? ''))
          .eq('status', 'pending')
          .maybeSingle();
        if (!app) return answer({ ok: false, reason: 'gone' }, 404);
        if ((await makeGuide(db, app.user_id, app.name)) === 'already') return answer({ ok: false, reason: 'already' }, 409);
        return answer({ ok: true, emailed: await welcome(await emailOf(db, app.user_id), app.name) });
      }
      case 'decline': {
        const { error } = await db
          .from('guide_applications')
          .update({ status: 'declined', decided_at: new Date().toISOString() })
          .eq('user_id', String(body?.userId ?? ''));
        if (error) throw error;
        return answer({ ok: true });
      }
      case 'invite': {
        const email = normalizeEmail(body?.email);
        const name = cleanText(body?.name, 60);
        if (!email || !name) return answer({ ok: false, reason: 'empty' }, 400);
        const userId = await ownerOf(db, email);
        if (!userId) return answer({ ok: false, reason: 'no-account' }, 404);
        if ((await makeGuide(db, userId, name)) === 'already') return answer({ ok: false, reason: 'already' }, 409);
        return answer({ ok: true, emailed: await welcome(email, name) });
      }
      case 'alone': {
        const { error } = await keys().update({ on_air_alone: body?.on === true }).eq('slug', slug).is('revoked_at', null);
        if (error) throw error;
        return answer({ ok: true });
      }
      case 'on-air': {
        const until = new Date(hourOf(Date.now()) + HOUR_MS).toISOString();
        const { error } = await keys().update({ cleared_until: until }).eq('slug', slug).is('revoked_at', null);
        if (error) throw error;
        return answer({ ok: true });
      }
      case 'renew': {
        const { data: row } = await keys().select('key_version, user_id').eq('slug', slug).is('revoked_at', null).maybeSingle();
        if (!row?.user_id) return answer({ ok: false, reason: 'no-account' }, 404);
        const version = row.key_version + 1;
        const { error } = await keys()
          .update({ key_version: version, key_hash: hashKey(accountKey(slug, version)) })
          .eq('slug', slug);
        if (error) throw error;
        return answer({ ok: true });
      }
      case 'remove':
      case 'shut-off': {
        const at = new Date().toISOString();
        const { error } = await keys()
          .update(action === 'remove' ? { revoked_at: at } : { revoked_at: at, stopped_at: at })
          .eq('slug', slug)
          .is('revoked_at', null);
        if (error) throw error;
        return answer({ ok: true });
      }
      default:
        return answer({ ok: false }, 400);
    }
  } catch {
    return answer({ ok: false }, 500);
  }
}
