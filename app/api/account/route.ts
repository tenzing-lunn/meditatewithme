import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { report } from '../_report';

/**
 * Delete the calling user's account, and everything the account holds.
 *
 * WHY THIS IS A ROUTE HANDLER AND NOT A BUTTON THAT TALKS TO SUPABASE
 * There is no way for a signed-in browser to delete its own `auth.users` row.
 * RLS governs the tables in `public`, not the auth schema, and the only API
 * that removes a user — `auth.admin.deleteUser` — requires the service role
 * key. So this is the one operation in the product that genuinely cannot
 * happen client-side, which is why it gets a handler of its own.
 *
 * THE WHOLE SECURITY OF THIS ENDPOINT IS ONE LINE
 * The id passed to `deleteUser` comes from `getUser(token)` — the Auth server's
 * own answer to "whose token is this?" — and never from the request. There is
 * deliberately no body, no `userId` parameter, and nothing to tamper with: the
 * only account this route can delete is the one that proved it owns the token.
 * Taking an id from the caller here, guarded by any amount of checking, would
 * be a service-role-key endpoint that deletes arbitrary users on request.
 *
 * WHAT ACTUALLY GOES
 * Everything, by cascade, which is why no migration was needed to add this:
 *
 *   auth.users  →  profiles  →  preferences
 *                           →  sittings
 *
 * All three foreign keys were already ON DELETE CASCADE (verified against the
 * live database, not assumed from the migration files). Removing the auth row
 * removes the email, the name in `user_metadata`, the profile, the synced
 * preferences and every synced sitting, in one transaction.
 *
 * WHAT IS NOT DELETED, AND WHY THAT IS NOT AN OVERSIGHT
 * `heartbeats` is keyed by `anon_id` — the per-browser id from localStorage —
 * and has no `user_id` column at all. A signed-in person's heartbeats are not
 * linked to their account by design (§8 of ARCHITECTURE.md: the count must not
 * become a record of who was in the room). There is therefore nothing here to
 * find and nothing to delete; the rows are ephemeral and pruned on a schedule.
 * That is the privacy property working, not a gap in this handler.
 *
 * The practice log in this browser's localStorage is also untouched. See the
 * note on the confirmation copy in `Home.tsx` — it is the visitor's own copy on
 * their own device, they were not asked whether to destroy it, and the panel
 * says plainly that it stays.
 */

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let supabase;
  try {
    supabase = await serviceClient();
  } catch (err) {
    // No service key configured. Nothing can be deleted, and saying so as a 500
    // is honest — this is not a request the caller got wrong.
    report('account', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  try {
    // Verified against the Auth server rather than decoded here. A locally
    // parsed JWT would still look valid after the session was revoked.
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      data.user.id,
    );

    // Hard delete, which is the default. A soft delete would leave the row —
    // and the email address on it — in the database, which is not what anybody
    // pressing "Delete my account" is asking for, and not what the App Store
    // guideline it satisfies means either.
    if (deleteError) throw deleteError;

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    // Deliberately no detail. This one is worth surfacing to the caller as a
    // failure — unlike the heartbeat, a deletion that quietly does nothing is
    // the worst possible outcome — but the reason belongs in the server log,
    // not in a response to an unauthenticated-for-all-we-know client.
    report('account', err);
    return NextResponse.json(
      { ok: false },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
