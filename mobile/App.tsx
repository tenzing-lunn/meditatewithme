import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_700Bold } from '@expo-google-fonts/newsreader/700Bold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { normalize, parsePreferences } from '../lib/preferences';
import type { Point } from '../lib/pond';
import type { UserPreferences } from '../lib/types';
import Arrive from './Arrive';
import { SITE, handoff } from './auth';
import BellTest from './BellTest';
import Pond, { type Thrown } from './Pond';
import SignIn from './SignIn';
import { Back, EASE, PAPER, Rail } from './ui';
import { useStones } from './world';
import './supabase';

/**
 * The iPhone app: the site's arrival, native, with the site's sitting
 * behind it.
 *
 * Tenzing's call, 3 October 2026, was to wrap the site first and replace it
 * piece by piece. Since 6 October the first thing replaced is the arrival:
 * the pond, the sentence and its wheels, Begin and the throw are drawn by the
 * phone (`Arrive.tsx`, `Picker.tsx`, `Pond.tsx`), and *Sign in* in its
 * corner opens the native sign-in (`SignIn.tsx`). The site is loaded the
 * whole time, underneath and still, and the two talk (`useAppBridge.ts` on
 * the site's side):
 *
 * - the site says what its arrival would show — the preferences, the
 *   guide's line, the name if signed in — and the native sentence reads it;
 * - a choice made on a wheel is written to the site at once, and a bell or a
 *   bed played on a wheel is played by the site, so they are its own sounds;
 * - Begin throws the stone here and asks the site to begin, then, once the
 *   stone has gone in and the site says the sitting has begun, the native
 *   water fades away and the site's sitting is what is left;
 * - when that sitting is over and the site is back at its arrival, the
 *   native arrival comes back over it.
 *
 * The session is handed to the site in the address's fragment (`handoff`)
 * after a native sign-in, which remounts the web view. The user agent ends
 * in `MeditateWithMeApp`, which is how the site knows to talk at all.
 *
 * `EXPO_PUBLIC_SITE=http://localhost:3000/` points the app at a local
 * `next dev`; `EXPO_PUBLIC_BELL_TEST=1 npx expo start` shows the
 * bell-on-a-locked-phone test instead (`BellTest.tsx`).
 */

const PREFS_KEY = 'mwm.app.prefs';
/** The stone's skim on a phone (4.4 s) and its sink (1.1 s): then the site's sitting shows. */
const THROW_MS = 5600;
/** The site's sitting fading up as the native water goes, as its own words do. */
const SHOW_MS = 1000;
const BACK_MS = 300;

// Pages the app may show inside itself: the site, and the sign-in round trip.
const INSIDE = [
  new URL(SITE).hostname,
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

/** What the site says while it is at its arrival. */
interface ArriveMessage {
  type: 'arrive';
  prefs: UserPreferences;
  guide: string;
  name: string | null;
}

export default function App() {
  if (process.env.EXPO_PUBLIC_BELL_TEST === '1') return <BellTest />;
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

/**
 * Where the app is: on the native arrival or sign-in (`native`), throwing
 * the stone (`throw`), in the site's sitting (`web`), or looking at the
 * site's account corner from the name in the native one (`site`).
 */
type Mode = 'native' | 'throw' | 'web' | 'site';

function Root() {
  const [fonts] = useFonts({ Newsreader_400Regular, Newsreader_700Bold });
  const insets = useSafeAreaInsets();
  const web = useRef<WebView>(null);
  const [uri, setUri] = useState(SITE);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const [prefs, setPrefs] = useState<UserPreferences>(() => parsePreferences(localStorage.getItem(PREFS_KEY)));
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const [guided, setGuided] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  const [mode, setModeState] = useState<Mode>('native');
  const modeRef = useRef(mode);
  const setMode = (m: Mode) => {
    modeRef.current = m;
    setModeState(m);
  };
  const [layer, setLayer] = useState<'arrive' | 'signin'>('arrive');
  const [dir, setDir] = useState<1 | -1>(1);
  const [thrown, setThrown] = useState<Thrown | null>(null);
  const cover = useRef(new Animated.Value(1)).current;
  const stones = useStones(mode !== 'web');

  // The page has said where it is, so it can be talked to.
  const ready = useRef(false);
  // Choices made before then, written to it when it is.
  const unsent = useRef<Partial<UserPreferences>>({});
  // A Begin pressed before then.
  const queued = useRef<boolean | null>(null);
  const begun = useRef(false);
  const landed = useRef(false);
  const failedRef = useRef(failed);
  failedRef.current = failed;

  const call = (js: string) => web.current?.injectJavaScript(`window.mwmApp && window.mwmApp.${js}; true;`);

  const keep = (next: UserPreferences) => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    setPrefs(next);
  };

  const update = (patch: Partial<UserPreferences>) => {
    keep(normalize({ ...prefsRef.current, ...patch }));
    if (ready.current) call(`update(${JSON.stringify(patch)})`);
    else unsent.current = { ...unsent.current, ...patch };
  };

  const fadeCover = (to: 0 | 1, ms: number, then?: () => void) =>
    Animated.timing(cover, { toValue: to, duration: ms, easing: EASE, useNativeDriver: true }).start(({ finished }) => {
      if (finished) then?.();
    });

  /** The stone is in and the sitting has begun: the site's sitting is what is left. */
  const reveal = () => {
    if (!begun.current || !landed.current || modeRef.current !== 'throw') return;
    fadeCover(0, SHOW_MS, () => setMode('web'));
  };

  const sendBegin = (g: boolean) => call(`begin(${JSON.stringify(g)}, ${JSON.stringify(prefsRef.current)})`);

  const begin = (from: Point) => {
    begun.current = false;
    landed.current = false;
    setThrown({ at: from, t: performance.now() });
    setMode('throw');
    if (ready.current) sendBegin(guided);
    else queued.current = guided;
    setTimeout(() => {
      landed.current = true;
      // A page that never came cannot begin: say so rather than wait on the water.
      if (failedRef.current) setMode('web');
      else reveal();
    }, THROW_MS);
  };

  /** Back to the native arrival, fresh, over the site's own (the cover is out, at 0). */
  const home = () => {
    setThrown(null);
    setLayer('arrive');
    setMode('native');
    fadeCover(1, BACK_MS);
  };

  const onMessage = (e: WebViewMessageEvent) => {
    let m: ArriveMessage | { type: 'sitting' };
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m.type === 'sitting') {
      begun.current = true;
      if (modeRef.current === 'site') setMode('web');
      else reveal();
      return;
    }
    if (m.type !== 'arrive') return;
    ready.current = true;
    setGuide(m.guide);
    setName(m.name);
    const mine = unsent.current;
    unsent.current = {};
    if (Object.keys(mine).length) call(`update(${JSON.stringify(mine)})`);
    keep(normalize({ ...m.prefs, ...mine }));
    if (queued.current !== null) {
      sendBegin(queued.current);
      queued.current = null;
    }
    // The site is back at its arrival after a sitting.
    if (modeRef.current === 'web') home();
  };

  const account = () => {
    if (!name) {
      setDir(1);
      setLayer('signin');
      return;
    }
    // Signed in: the site's own corner, its account and settings, over the
    // site's arrival; Back comes home.
    setMode('site');
    web.current?.injectJavaScript(`document.querySelector('main header [aria-expanded]')?.click(); true;`);
    fadeCover(0, BACK_MS);
  };

  const fromSite = () => {
    web.current?.injectJavaScript(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); true;`);
    home();
  };

  return (
    <View style={s.screen}>
      <StatusBar style="dark" />
      <WebView
        key={`${attempt}:${uri}`}
        ref={web}
        source={{ uri }}
        style={s.web}
        // Hide the whole container, not just the page: the web view draws its
        // own grey error page in there, which would show under the one above.
        containerStyle={[{ backgroundColor: PAPER }, failed && s.hidden]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        bounces={false}
        overScrollMode="never"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        applicationNameForUserAgent="MeditateWithMeApp"
        onLoadStart={() => {
          ready.current = false;
        }}
        onMessage={onMessage}
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

      {mode !== 'web' && (
        <Animated.View
          style={[StyleSheet.absoluteFill, s.screen, { opacity: fonts ? cover : 1 }]}
          pointerEvents={mode === 'native' ? 'auto' : 'none'}
        >
          {fonts && (
            <>
              <Pond stones={stones} you={thrown !== null} throwFrom={thrown} water={mode === 'native' && layer === 'arrive'} />
              <Rail
                at={layer}
                dir={dir}
                render={(l) =>
                  l === 'arrive' ? (
                    <Arrive
                      prefs={prefs}
                      update={update}
                      guided={guided}
                      onGuided={(g) => {
                        setGuided(g);
                        // By yourself is among the fish, as on the site.
                        if (!g) update({ showCount: true });
                      }}
                      guide={guide}
                      name={name}
                      others={stones.length}
                      leaving={mode === 'throw'}
                      onAccount={account}
                      onBegin={begin}
                      onPreviewBell={(kind) => call(`bell(${JSON.stringify(kind)})`)}
                      onStopBell={() => call('stopBell()')}
                      onTaste={(slug) => call(`taste(${JSON.stringify(slug)})`)}
                      onHush={() => call('hush()')}
                    />
                  ) : (
                    <SignIn
                      onClose={() => {
                        setDir(-1);
                        setLayer('arrive');
                      }}
                      onDone={(session) => {
                        // A fresh web view on the fragment: the site reads the
                        // session as it reads a magic link, and says the name.
                        ready.current = false;
                        setUri(handoff(session));
                        setDir(-1);
                        setLayer('arrive');
                      }}
                    />
                  )
                }
              />
            </>
          )}
        </Animated.View>
      )}

      {mode === 'site' && <Back onPress={fromSite} style={{ position: 'absolute', left: 16, top: insets.top + 12 }} />}

      {failed && mode !== 'native' && (
        <View style={[StyleSheet.absoluteFill, s.screen, s.failed]}>
          <Text style={s.failedTitle}>Meditate With Me could not be reached.</Text>
          <Text style={s.failedBody}>Check your connection, then try again.</Text>
          <Pressable
            onPress={() => {
              // A fresh web view rather than reload(): after a first load
              // that never arrived, WKWebView has no page to reload.
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
            style={({ pressed }) => [s.retry, pressed && { opacity: 0.6 }]}
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAPER },
  web: { flex: 1, backgroundColor: PAPER },
  hidden: { display: 'none' },
  failed: { justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  failedTitle: { color: '#2a3136', fontSize: 22, fontWeight: '700' },
  failedBody: { color: '#4f5a61', fontSize: 17, lineHeight: 24 },
  retry: { alignSelf: 'flex-start', marginTop: 12, minHeight: 48, justifyContent: 'center', paddingHorizontal: 22, borderRadius: 12, backgroundColor: '#3e4c55' },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
