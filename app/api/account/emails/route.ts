import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { isCode, isGoogleMail, normalizeEmail } from '@/lib/emailCode';
import { callerOf, checkCode, issueCode, ownerOf } from '../../_email/codes';

/**
 * The addresses on the caller's account: list, connect (send a code, then
 * prove it), and remove.
 *
 * Every action is on the account whose access token came with the request,
 * as proved by the Auth server (`callerOf`) — never on an id from the body,
 * for the reason `app/api/account` gives.
 *
 * Answers carry a `reason` the client turns into words: `taken` (another
 * account holds it), `yours` (already on this one), `wait`, `wrong`, `dead`,
 * `last` (the only address left), `unavailable` (no mail key).
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const answer = (body: object, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

async function others(db: Awaited<ReturnType<typeof serviceClient>>, userId: string) {
  const { data, error } = await db
    .from('account_emails')
    .select('email')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.email as string);
}

async function start(request: Request) {
  try {
    const db = await serviceClient();
    const user = await callerOf(request, db);
    return user ? { db, user } : null;
  } catch {
    return null;
  }
}

/** The main address and the connected ones, newest first. */
export async function GET(request: Request) {
  const s = await start(request);
  if (!s) return answer({ ok: false }, 401);
  try {
    return answer({ ok: true, main: s.user.email, others: await others(s.db, s.user.id) });
  } catch {
    return answer({ ok: false }, 500);
  }
}

/** Send a code to an address to be connected. */
export async function POST(request: Request) {
  const s = await start(request);
  if (!s) return answer({ ok: false }, 401);
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  if (!email) return answer({ ok: false, reason: 'invalid' }, 400);
  if (isGoogleMail(email)) return answer({ ok: false, reason: 'gmail' }, 400);
  try {
    const owner = await ownerOf(s.db, email);
    if (owner === s.user.id) return answer({ ok: false, reason: 'yours' }, 409);
    if (owner) return answer({ ok: false, reason: 'taken' }, 409);
    const sent = await issueCode(s.db, email, 'connect', s.user.id);
    if (sent !== 'sent') return answer({ ok: false, reason: sent }, sent === 'wait' ? 429 : 503);
    return answer({ ok: true });
  } catch {
    return answer({ ok: false }, 500);
  }
}

/** Prove the code, and the address joins the account. */
export async function PUT(request: Request) {
  const s = await start(request);
  if (!s) return answer({ ok: false }, 401);
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  if (!email || !isCode(body?.code)) return answer({ ok: false, reason: 'wrong' }, 400);
  try {
    const result = await checkCode(s.db, email, 'connect', body.code);
    if (typeof result === 'string') return answer({ ok: false, reason: result }, 400);
    if (result.userId !== s.user.id) return answer({ ok: false, reason: 'dead' }, 400);
    // Checked again: another account may have taken it in the ten minutes.
    const owner = await ownerOf(s.db, email);
    if (owner && owner !== s.user.id) return answer({ ok: false, reason: 'taken' }, 409);
    if (!owner) {
      const { error } = await s.db.from('account_emails').insert({ email, user_id: s.user.id });
      if (error) throw error;
    }
    return answer({ ok: true, main: s.user.email, others: await others(s.db, s.user.id) });
  } catch {
    return answer({ ok: false }, 500);
  }
}

/**
 * Remove an address. Removing the main one makes the newest connected
 * address the main one — the one the mailing list and Supabase's own mail
 * use — so there is always exactly one.
 */
export async function DELETE(request: Request) {
  const s = await start(request);
  if (!s) return answer({ ok: false }, 401);
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  if (!email) return answer({ ok: false, reason: 'invalid' }, 400);
  try {
    const list = await others(s.db, s.user.id);
    if (email === s.user.email?.toLowerCase()) {
      const next = list[0];
      if (!next) return answer({ ok: false, reason: 'last' }, 409);
      // Already proved by its connect code, so confirmed here directly.
      const { error } = await s.db.auth.admin.updateUserById(s.user.id, { email: next, email_confirm: true });
      if (error) throw error;
      const { error: gone } = await s.db.from('account_emails').delete().eq('email', next);
      if (gone) throw gone;
      return answer({ ok: true, main: next, others: list.slice(1) });
    }
    if (!list.includes(email)) return answer({ ok: false, reason: 'invalid' }, 404);
    const { error } = await s.db.from('account_emails').delete().eq('email', email).eq('user_id', s.user.id);
    if (error) throw error;
    return answer({ ok: true, main: s.user.email, others: list.filter((e) => e !== email) });
  } catch {
    return answer({ ok: false }, 500);
  }
}
