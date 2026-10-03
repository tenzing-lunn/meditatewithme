import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { isCode, normalizeEmail } from '@/lib/emailCode';
import { rateLimiter } from '@/lib/limit';
import { checkCode, issueCode } from '../_email/codes';
import { clientIp } from '../_ip';
import { report } from '../_report';

/**
 * Signing in with a connected address (`account_emails`).
 *
 * Supabase knows only an account's main address; asked to sign in any other,
 * it makes a new account. So every sign-in asks here first. POST answers
 * `{ kind: 'account' }` for an address this route has nothing to do with —
 * the client carries on with Supabase's own code, as before — or sends the
 * site's own code and answers `{ kind: 'connected' }`.
 *
 * PUT proves that code and returns a one-time `token_hash` for the account's
 * main address, from `generateLink` (which sends nothing). The browser trades
 * it with `verifyOtp` for an ordinary session, so everything after is the
 * same as any other sign-in.
 *
 * It does tell a caller whether an address is a connected one. Supabase
 * already says as much about main addresses when one is changed; the codes
 * are what keep the account, and they are rate-limited and die after five
 * tries.
 */

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const answer = (body: object, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * `canResend` holds each address to one email a minute; this holds each
 * caller to a handful of addresses a minute, so a list of connected
 * addresses and a loop is not a way to spend the sender's reputation. See
 * `lib/limit.ts` for the limits of an in-memory count.
 */
const asks = rateLimiter(5, 60_000);

export async function POST(request: Request) {
  if (!asks.allow(clientIp(request), Date.now())) return answer({ kind: 'connected', ok: false, reason: 'wait' }, 429);
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  if (!email) return answer({ kind: 'account' });
  try {
    const db = await serviceClient();
    const { data, error } = await db.from('account_emails').select('user_id').eq('email', email).maybeSingle();
    if (error) throw error;
    if (!data) return answer({ kind: 'account' });
    const sent = await issueCode(db, email, 'sign-in', data.user_id);
    if (sent !== 'sent') return answer({ kind: 'connected', ok: false, reason: sent }, sent === 'wait' ? 429 : 503);
    return answer({ kind: 'connected', ok: true });
  } catch (err) {
    report('signin', err);
    return answer({ ok: false }, 500);
  }
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  if (!email || !isCode(body?.code)) return answer({ ok: false, reason: 'wrong' }, 400);
  try {
    const db = await serviceClient();
    const result = await checkCode(db, email, 'sign-in', body.code);
    if (typeof result === 'string') return answer({ ok: false, reason: result }, 400);
    const { data: found, error } = await db.auth.admin.getUserById(result.userId);
    if (error || !found.user?.email) throw error ?? new Error('no main address');
    const { data: link, error: linkError } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email: found.user.email,
    });
    if (linkError) throw linkError;
    return answer({ ok: true, tokenHash: link.properties.hashed_token });
  } catch (err) {
    report('signin', err);
    return answer({ ok: false }, 500);
  }
}
