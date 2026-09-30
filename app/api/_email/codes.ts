import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { CODE_TTL_MS, canResend, codeUsable } from '@/lib/emailCode';

/**
 * The site's own six-digit codes, for the addresses Supabase does not know
 * about (`account_emails`). Server only: the underscore keeps this folder out
 * of the routes, and it holds the service-role client and the mail key.
 *
 * Supabase's mailer can only write to an account's main address, so these go
 * out through Resend's API directly, from the same sender the sign-in mail
 * uses. `RESEND_API_KEY` is a server variable; without it nothing is sent and
 * the routes answer 503.
 */

export type Purpose = 'connect' | 'sign-in';

const SENDER = 'Meditate With Me <signin@meditatewithme.online>';

/** The caller, proved by the Auth server from their access token. */
export async function callerOf(request: Request, db: SupabaseClient): Promise<User | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data.user;
}

/** Who holds an address, main or connected. See `email_owner` in the migration. */
export async function ownerOf(db: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await db.rpc('email_owner', { addr: email });
  if (error) throw error;
  return (data as string | null) ?? null;
}

// Keyed with the service-role key so a leaked `email_codes` row cannot be
// brute-forced offline without it too.
function hash(email: string, code: string): string {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')
    .update(`${email}:${code}`)
    .digest('hex');
}

/** Make, store and send a code. `wait` inside a minute of the last one. */
export async function issueCode(
  db: SupabaseClient,
  email: string,
  purpose: Purpose,
  userId: string,
): Promise<'sent' | 'wait' | 'unavailable'> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return 'unavailable';

  const { data: last } = await db.from('email_codes').select('sent_at').eq('email', email).maybeSingle();
  const now = Date.now();
  if (!canResend(last ? Date.parse(last.sent_at) : null, now)) return 'wait';

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const { error } = await db.from('email_codes').upsert({
    email,
    purpose,
    user_id: userId,
    code_hash: hash(email, code),
    attempts: 0,
    sent_at: new Date(now).toISOString(),
    expires_at: new Date(now + CODE_TTL_MS).toISOString(),
  });
  if (error) throw error;

  const lead = purpose === 'connect' ? 'To connect this address to your account' : 'To sign in';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: SENDER,
      to: email,
      subject: 'Your code for Meditate With Me',
      text: `${lead}, enter this code:\n\n${code}\n\nIt works for ten minutes. If you did not ask for it, you can ignore this email.`,
      html: `<p>${lead}, enter this code:</p><p style="font-size:32px;letter-spacing:6px;font-weight:bold">${code}</p><p>It works for ten minutes. If you did not ask for it, you can ignore this email.</p>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}`);
  return 'sent';
}

/**
 * Try a code. On a match the row is spent and the user it was issued for is
 * returned; a miss counts against the five tries.
 */
export async function checkCode(
  db: SupabaseClient,
  email: string,
  purpose: Purpose,
  code: string,
): Promise<{ userId: string } | 'wrong' | 'dead'> {
  const { data: row, error } = await db
    .from('email_codes')
    .select('purpose, user_id, code_hash, attempts, expires_at')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.purpose !== purpose) return 'dead';
  if (!codeUsable({ attempts: row.attempts, expiresAt: Date.parse(row.expires_at) }, Date.now())) return 'dead';

  const given = Buffer.from(hash(email, code));
  const kept = Buffer.from(row.code_hash);
  if (given.length !== kept.length || !timingSafeEqual(given, kept)) {
    await db.from('email_codes').update({ attempts: row.attempts + 1 }).eq('email', email);
    return 'wrong';
  }
  await db.from('email_codes').delete().eq('email', email);
  return { userId: row.user_id };
}
