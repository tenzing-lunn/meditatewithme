import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * `createClient` is reached through `import()` rather than a static import, and
 * both clients below are `async` for that one reason.
 *
 * Statically imported, `@supabase/supabase-js` sat in the first chunk of the
 * landing page — around 30KB gzipped that a guest downloaded, parsed and never
 * used, on the critical path of a page whose job is to show two doors. Nothing
 * here is wanted synchronously: every call site is already inside an effect, a
 * route handler or an event, so awaiting the library costs nothing that was not
 * already awaited.
 *
 * A type-only import stays: it is erased and carries no code.
 */
const createClient = async () =>
  (await import('@supabase/supabase-js')).createClient;

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
/**
 * The PROMISE is what is cached, not the client.
 *
 * With a synchronous factory, `if (browser) return browser` was enough. It is
 * not enough once there is an `await` between the check and the assignment:
 * four hooks call this in the same tick on mount, all four would find the cache
 * empty, and all four would build a client — which is the exact race the note
 * above is about. Holding the in-flight promise means the second caller waits
 * for the first one's client instead of starting another.
 *
 * Cleared on failure so a client that could not be built is retried rather
 * than remembered as broken for the life of the page.
 */
let browser: Promise<SupabaseClient> | null = null;

export function browserClient(): Promise<SupabaseClient> {
  if (browser) return browser;

  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Promise.reject(
      new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.',
      ),
    );
  }

  browser = (async () =>
    // `detectSessionInUrl` reads the address bar once, as the client is built.
    // Building it after an `import()` rather than at module scope does not
    // move that: nothing has navigated in between, so the fragment is still
    // there to be read.
    (await createClient())(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'implicit',
        // The magic link lands back on the site with the token in the URL
        // fragment; this is what picks it up. There is no callback route.
        detectSessionInUrl: true,
      },
    }))();

  browser.catch(() => {
    browser = null;
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
export async function serviceClient(): Promise<SupabaseClient> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return (await createClient())(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
