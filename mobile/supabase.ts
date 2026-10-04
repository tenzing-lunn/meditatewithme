// The app's own Supabase client, for signing in natively.
//
// Same project and same anon key as the website (`lib/supabase.ts`), a
// different session store: the site keeps its session in the web view's
// localStorage, this one in SQLite through Expo's localStorage shim. The two
// never share a token on purpose — see `handoff` in `auth.ts`: once the
// person is signed in here, the session is handed to the site once, and the
// site owns it from then on. That is why `autoRefreshToken` is off: two
// clients refreshing the same refresh token would knock each other out
// (Supabase rotates it), and the native side only needs the session for the
// minute between signing in and the site loading.
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

export const supabase = createClient(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
});
