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
 */
export function browserClient(): SupabaseClient {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
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
