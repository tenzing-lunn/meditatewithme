// The app's own Supabase client, for signing in natively.
//
// Same project and same anon key as the website (`lib/supabase.ts`), a
// different session store: the site keeps its session in the web view's
// localStorage, this one in memory only. The two never share a token on
// purpose — see `handoffScript` in `auth.ts`: once the person is signed in here,
// the session is handed to the site once, the site owns it from then on,
// and this side forgets it (`forgetSession`). That is why `autoRefreshToken`
// is off and nothing is kept on disk: two clients refreshing the same
// refresh token would knock each other out (Supabase rotates it, and a
// spent one can revoke the whole session), and the native side only needs
// the session for the minutes between signing in and the site loading.
//
// `detectSessionInUrl` is off because a phone has no address bar; the deep
// link back from Google or Apple is read by hand in `auth.ts`.
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy mobile/.env.example to mobile/.env.local.');
}

export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = key;

// Until 7 October 2026 the session was kept on disk and never let go, so the
// next *Sign in* found it, reused it, and once stale refreshed a token the
// site had already rotated. That copy is deleted here, once per launch.
localStorage.removeItem(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`);

const memory = new Map<string, string>();

/** Let go of the session here, without signing it out: the site has it now. */
export function forgetSession(): void {
  memory.clear();
}

export const supabase = createClient(url, key, {
  auth: {
    storage: {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => void memory.set(k, v),
      removeItem: (k) => void memory.delete(k),
    },
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
});
