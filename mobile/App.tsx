import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import BellTest from './BellTest';

/**
 * The iPhone app, for now: the website, full screen.
 *
 * Tenzing's call, 3 October 2026 — wrap the site first so the real thing is
 * on phones today, then replace it piece by piece with native screens (the
 * sitting and the bell first) before anything goes to App Store review,
 * where a site in a wrapper alone is refused (guideline 4.2). See
 * `plans/iphone-app.md`.
 *
 * The site draws its own safe areas (`viewport-fit=cover` and
 * `env(safe-area-inset-*)`), so the web view takes the whole screen and
 * adds no insets of its own. The user agent ends in `MeditateWithMeApp`, so
 * the site can tell when it is inside the app.
 *
 * `EXPO_PUBLIC_BELL_TEST=1 npx expo start` shows the bell-on-a-locked-phone
 * test instead (`BellTest.tsx`).
 */

const SITE = 'https://www.meditatewithme.online/';
const PAPER = '#e5e9ec';

// Pages the app may show inside itself: the site, and the sign-in round trip.
const INSIDE = [
  'meditatewithme.online',
  'supabase.co',
  'appleid.apple.com',
  'accounts.google.com',
];

function inside(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return INSIDE.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export default function App() {
  if (process.env.EXPO_PUBLIC_BELL_TEST === '1') return <BellTest />;
  return <Site />;
}

function Site() {
  const web = useRef<WebView>(null);
  const [failed, setFailed] = useState(false);

  return (
    <View style={s.screen}>
      <StatusBar style="dark" />
      {failed ? (
        <View style={s.failed}>
          <Text style={s.failedTitle}>Meditate With Me could not be reached.</Text>
          <Text style={s.failedBody}>Check your connection, then try again.</Text>
          <Pressable
            onPress={() => {
              setFailed(false);
              web.current?.reload();
            }}
            style={({ pressed }) => [s.retry, pressed && { opacity: 0.6 }]}
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
      <WebView
        ref={web}
        source={{ uri: SITE }}
        style={[s.web, failed && s.hidden]}
        containerStyle={{ backgroundColor: PAPER }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        bounces={false}
        overScrollMode="never"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        applicationNameForUserAgent="MeditateWithMeApp"
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith('about:') || inside(req.url)) return true;
          // Everything else — mail links, credits, other sites — goes to
          // the phone's own apps, not into the app's frame.
          void Linking.openURL(req.url);
          return false;
        }}
        onError={() => setFailed(true)}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) setFailed(true);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAPER },
  web: { flex: 1, backgroundColor: PAPER },
  hidden: { display: 'none' },
  failed: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  failedTitle: { color: '#2a3136', fontSize: 22, fontWeight: '700' },
  failedBody: { color: '#4f5a61', fontSize: 17, lineHeight: 24 },
  retry: { alignSelf: 'flex-start', marginTop: 12, minHeight: 48, justifyContent: 'center', paddingHorizontal: 22, borderRadius: 12, backgroundColor: '#3e4c55' },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
