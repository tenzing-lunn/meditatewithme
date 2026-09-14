import { NextResponse } from 'next/server';
import { snapToCell } from '@/lib/geo';

/**
 * Where the connection appears to be from, so the origin question can be
 * answered with a nod rather than typed.
 *
 * Vercel resolves the address at the edge and hands the result on as
 * headers; nothing here reads the address itself. Until 14 September 2026
 * the city and country headers were deliberately unread (see
 * `app/api/heartbeat/route.ts`). They are read here and only here, sent
 * back to the one browser that asked, and never stored: what the person
 * confirms or corrects on the screen is what is kept, and that goes through
 * their own profile, not through this route.
 *
 * Private and uncached: the answer is about this request, nobody else's.
 * On localhost the headers do not exist and every field is null.
 */

export const dynamic = 'force-dynamic';

/** Vercel percent-encodes the city, so "S%C3%A3o%20Paulo" arrives. */
function decode(v: string | null): string | null {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export function GET(request: Request) {
  const h = request.headers;
  return NextResponse.json(
    {
      city: decode(h.get('x-vercel-ip-city')),
      country: h.get('x-vercel-ip-country'),
      cell: snapToCell(h.get('x-vercel-ip-latitude'), h.get('x-vercel-ip-longitude')),
    },
    { headers: { 'cache-control': 'private, no-store' } },
  );
}
