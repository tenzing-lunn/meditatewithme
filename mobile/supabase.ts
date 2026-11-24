// The app's own Supabase client, and since 24 November 2026 the only holder
// of the person's session.
//
// Same project and same anon key as the website (`lib/supabase.ts`). Until
// then the session was handed to the site in the web view after a native
// sign-in and the app forgot its copy, because two clients refreshing one
// refresh token knock each other out (Supabase rotates it, and a spent one
// can revoke the whole session). Tenzing chose the other way round: the app
// keeps the session, refreshes it while it is in front, and syncs the
// account itself (`account.ts`); the site in the web view stays a guest,
// used only for a guided sitting until the live video is native. One owner,
// so nothing fights over the token.
//
// The session is kept in the app's own storage (expo-sqlite's localStorage,
// inside the app's sandbox, as Supabase's own Expo guide keeps it), under
// a key of its own. `detectSessionInUrl` is off because a phone has no
// address bar; the deep link back from Google or Apple is read by hand in
// `auth.ts`.
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy mobile/.env.example to mobile/.env.local.');
}

export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = key;

// Before 7 October 2026 a session was kept on disk under Supabase's default
// key and, once the site had rotated its token, reused stale. Never read.
localStorage.removeItem(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`);

export const supabase = createClient(url, key, {
  auth: {
    storage: localStorage,
    storageKey: 'mwm.app.session',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
});

// Refreshed only while the app is in front, as Supabase asks of a phone: a
// timer in the background would be frozen mid-refresh by the system.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
