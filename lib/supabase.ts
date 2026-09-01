import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Two clients, two very different trust levels. Keeping them in one file makes
 * it obvious which is which — mixing them up is the classic way to leak a
 * service key to the browser.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Browser client. Uses the publishable (anon) key, which is safe to ship —
 * every table it can reach is protected by RLS. Safety here comes from the
 * policies in supabase/migrations/0001_init.sql, not from hiding the key.
 *
 * ONE INSTANCE, DELIBERATELY
 * This used to build a fresh client per call, which was harmless while nothing
 * authenticated. It stops being harmless the moment auth exists: every client
 * shares the same localStorage key, so two of them race each other refreshing
 * the same token, and only one wins. Signing in from a second instance also
 * leaves the first holding a stale session with no idea anything changed.
 *
 * IMPLICIT FLOW, NOT PKCE
 * PKCE stores its verifier in the localStorage of the browser that asked for
 * the link, so opening the email on a phone when you requested it on a laptop
 * fails — and requesting a link on a laptop and reading mail on a phone is the
 * normal case, not the edge case. Implicit costs us server-side sessions, which
 * this app has no use for: the room is a client component, and preferences are
 * guarded by RLS against the user's own JWT rather than by anything rendered on
 * the server. If a server component ever needs to know who is watching, this
 * becomes @supabase/ssr and a callback route.
 */
let browser: SupabaseClient | null = null;

export function browserClient(): SupabaseClient {
  if (browser) return browser;

  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.',
    );
  }

  browser = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'implicit',
      // The magic link lands back on the site with the token in the URL
      // fragment; this is what picks it up. There is no callback route.
      detectSessionInUrl: true,
    },
  });

  return browser;
}

/**
 * Server-only client. The service role key BYPASSES RLS entirely — it can read
 * and write every row in the database.
 *
 * Never import this into a component that runs in the browser. It is only used
 * by route handlers under app/api/, which run on the server. The key has no
 * NEXT_PUBLIC_ prefix precisely so Next.js will not inline it into the client
 * bundle.
 *
 * If you ever find yourself wanting this in a component, the answer is a route
 * handler, not an exception.
 */
export function serviceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
