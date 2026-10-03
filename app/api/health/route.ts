import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { report } from '../_report';

/**
 * Is the server wired up? For an uptime monitor and for a person after a
 * deploy, so that "the count is null" can be told apart from "nobody is
 * sitting" without opening a database console.
 *
 * Three things are checked and named, nothing more: the environment
 * variables the routes need are set (names only, never values); the service
 * client can reach the database; and every table a route depends on answers
 * a `head` select. A table that was never migrated — the known risk, since
 * the migration history and the folder disagree (`CLAUDE.md`) — fails here
 * instead of as a silent null somewhere in the room.
 *
 * 200 when everything passes, 503 when anything does not, with the failing
 * names in the body. Cached briefly at the edge so a monitor polling every
 * minute, or a loop, costs the origin almost nothing.
 */

export const dynamic = 'force-dynamic';

const ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

/** Every table a route handler reads or writes. Keep in step with `supabase/migrations/`. */
const TABLES = [
  'heartbeats',
  'profiles',
  'preferences',
  'sittings',
  'stream_keys',
  'live_hours',
  'admins',
  'guide_applications',
  'account_emails',
  'email_codes',
] as const;

export async function GET() {
  const failed: string[] = [];
  for (const name of ENV) if (!process.env[name]) failed.push(`env:${name}`);

  if (!failed.length) {
    try {
      const db = await serviceClient();
      const results = await Promise.all(
        TABLES.map((t) => db.from(t).select('*', { count: 'exact', head: true }).limit(1)),
      );
      results.forEach((r, i) => {
        if (r.error) failed.push(`table:${TABLES[i]}`);
      });
    } catch (err) {
      report('health', err);
      failed.push('database');
    }
  }

  return NextResponse.json(
    { ok: failed.length === 0, failed },
    {
      status: failed.length ? 503 : 200,
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'public, s-maxage=30',
      },
    },
  );
}
