import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_700Bold } from '@expo-google-fonts/newsreader/700Bold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { serverNow } from '../lib/clock';
import { MIN_LOGGED_SECONDS } from '../lib/practice';
import { normalize, parsePreferences } from '../lib/preferences';
import type { Point } from '../lib/pond';
import { endsAt as computeEndsAt, hasEnded, monotonicEndAtFromServerTarget, nextSharedBellAt } from '../lib/timer';
import type { TrackSlug, UserPreferences } from '../lib/types';
import Afterwards, { COOLDOWN_MS, SameSetup } from './Afterwards';
import Arrive from './Arrive';
import { holdForSitting, openingBell, previewBell, scheduleBell, stopPreviewBell, useMix, type ScheduledBell } from './audio';
import { SITE, handoffScript } from './auth';
import BellTest from './BellTest';
import { useClock } from './clock';
import Pond, { type PondHandle, type Stone, type Thrown } from './Pond';
import { usePresence } from './presence';
import { lay } from './remind';
import SignIn, { type Ask } from './SignIn';
import Sitting, { type Sit } from './Sitting';
import { Back, EASE, PAPER, Rail } from './ui';
import { useStones } from './world';
import * as Crypto from 'expo-crypto';
import { forgetSession } from './supabase';

/**
 * The iPhone app: the site's arrival and its sitting, native, with the site
 * loaded behind them for the account.
 *
 * Tenzing's call, 3 October 2026, was to wrap the site first and replace it
 * piece by piece. On 6 October the arrival went native — the pond, the
 * sentence and its wheels, Begin and the throw (`Arrive.tsx`, `Picker.tsx`,
 * `Pond.tsx`), and *Sign in* in its corner (`SignIn.tsx`) — and then the
 * sitting: the timer and the shared hour on the site's clock (`clock.ts`),
 * the beds and the bells on the phone's own audio (`audio.ts`), presence
 * (`presence.ts`), the sitting itself and its ending (`Sitting.tsx`,
 * `Afterwards.tsx`). The site is loaded the whole time, underneath and
 * still, because it still holds the account, and the two talk
 * (`useAppBridge.ts` on the site's side):
 *
 * - the site says what its arrival would show — the preferences, the
 *   guide's line, the name if signed in, the label the person is seen by —
 *   and the native sentence and fish read it;
 * - a choice made on a wheel is written to the site at once, and a sitting
 *   sat here is handed to the site's practice log, which syncs it to the
 *   account as it syncs its own;
 * - a guided sitting, which needs the live video, is still the site's:
 *   Begin throws the stone here and asks the site to begin, then, once the
 *   stone has gone in and the site says the sitting has begun, the native
 *   water fades away and the site's sitting is what is left; when it is
 *   over and the site is back at its arrival, the native arrival comes back
 *   over it.
 *
 * The session is handed to the site after a native sign-in by a script that
 * writes it into the site's own storage before the page loads
 * (`handoffScript`), on a fresh web view; the app then forgets its copy. The user agent ends
 * in `MeditateWithMeApp`, which is how the site knows to talk at all.
 *
 * `EXPO_PUBLIC_SITE=http://localhost:3000/` points the app at a local
 * `next dev`; `EXPO_PUBLIC_BELL_TEST=1 npx expo start` shows the
 * bell-on-a-locked-phone test instead (`BellTest.tsx`).
 */

const PREFS_KEY = 'mwm.app.prefs';
/** Sittings sat here and not yet handed to the site's practice log. */
const UNSENT_KEY = 'mwm.app.unsent';
/** The sitting fading out from under the minutes. */
const FADE_MS = 800;
/** The site's `THROW_MS`: the stone's skim and sink, then the sitting's words (and a guided sitting's page) show. */
const THROW_MS = 6400;
/**
 * A guided Begin the site has not answered this long after the stone went
 * in: the page is not coming (a site without the bridge, or a begin that
 * was lost), so the arrival comes back rather than leaving you on the water.
 */
const GUIDED_WAIT_MS = 8000;
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
  /** The word the site's own corner shows when signed in; null signed out. Absent from an older site. */
  corner?: string | null;
  /** "Ana from Lisbon", if they chose to be seen. Absent from a site older than the native sitting. */
  label?: string | null;
  /** The questions the site would ask after Begin. Absent from an older site. */
  ask?: ('name' | 'origin')[];
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

/** A native sitting: where it is, from Begin to the minutes. */
type Stage =
  | { kind: 'arrive' }
  | { kind: 'sitting'; sit: Sit; bell: ScheduledBell | null; opening: ScheduledBell | null }
  | { kind: 'finished'; sit: Sit; minutes: number; endedAt: number };

type Entry = { id: string; startedAt: number; seconds: number; completed: boolean };

function readUnsent(): Entry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(UNSENT_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function Root() {
  const [fonts] = useFonts({ Newsreader_400Regular, Newsreader_700Bold });
  const insets = useSafeAreaInsets();
  const web = useRef<WebView>(null);
  const uri = SITE;
  /** The last sign-in, handed to a fresh web view by the script that carries it. */
  const [handed, setHanded] = useState<{ id: string; js: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const [prefs, setPrefs] = useState<UserPreferences>(() => parsePreferences(localStorage.getItem(PREFS_KEY)));
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const [guided, setGuided] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  /** Signed in: the word for the corner, as the site's corner says it. */
  const [corner, setCorner] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  /** What the site would ask after Begin; asked natively before the sitting. */
  const [ask, setAsk] = useState<readonly ('name' | 'origin')[]>([]);
  /** A Begin waiting on those questions. */
  const pending = useRef<{ from: Point; guided: boolean } | null>(null);
  /** The site says its guided sitting is on: from its Begin to its bell, or End. */
  const [webSitting, setWebSitting] = useState(false);

  const [mode, setModeState] = useState<Mode>('native');
  const modeRef = useRef(mode);
  const setMode = (m: Mode) => {
    modeRef.current = m;
    setModeState(m);
  };
  const [layer, setLayer] = useState<'arrive' | 'signin' | 'ask'>('arrive');
  const [dir, setDir] = useState<1 | -1>(1);
  const [thrown, setThrown] = useState<Thrown | null>(null);
  const cover = useRef(new Animated.Value(1)).current;
  const world = useStones(mode !== 'web');
  const clock = useClock();
  const mix = useMix(prefs.soundMix);
  const pond = useRef<PondHandle>(null);

  const [stage, setStageState] = useState<Stage>({ kind: 'arrive' });
  const stageRef = useRef(stage);
  const setStage = (next: Stage) => {
    stageRef.current = next;
    setStageState(next);
  };
  /** The stone has settled after a native Begin: the sitting's words come up. */
  const [landed, setLanded] = useState(true);
  /** Begun again from the minutes: the arrival's words are not there to sink. */
  const [repeat, setRepeat] = useState(false);
  /** Again was pressed on the minutes: *Same setup?* is asked. */
  const [again, setAgain] = useState(false);

  // The page has said where it is, so it can be talked to.
  const ready = useRef(false);
  // Choices made before then, written to it when it is.
  const unsent = useRef<Partial<UserPreferences>>({});
  // A Begin pressed before then.
  const queued = useRef<boolean | null>(null);
  const begun = useRef(false);
  const landedGuided = useRef(false);
  /** A guided Begin was pressed and the site has not yet said its sitting is on. */
  const guidedAsked = useRef(false);
  /** The last guided Begin's two timers, so a later Begin is not timed by them. */
  const guidedTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearGuided = () => {
    guidedTimers.current.forEach(clearTimeout);
    guidedTimers.current = [];
  };
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

  /**
   * Hand the sittings sat here to the site's practice log, which keeps and
   * syncs them as its own, all in one call, with the page there and the app
   * in front. Each is let go only when the site says it has it
   * (`recorded`); until then it is offered again at every arrival and every
   * return to the app. The log takes an id once, so twice costs nothing.
   */
  const flush = () => {
    if (!ready.current || AppState.currentState !== 'active') return;
    const entries = readUnsent();
    if (entries.length) call(`record(${JSON.stringify(entries)})`);
  };
  const recorded = (ids: string[]) => {
    const left = readUnsent().filter((e) => !ids.includes(e.id));
    if (left.length) localStorage.setItem(UNSENT_KEY, JSON.stringify(left));
    else localStorage.removeItem(UNSENT_KEY);
  };
  const record = (entry: Entry) => {
    // Under a minute was a mis-tap, not a sitting.
    if (entry.seconds < MIN_LOGGED_SECONDS) return;
    localStorage.setItem(UNSENT_KEY, JSON.stringify([...readUnsent().filter((e) => e.id !== entry.id), entry]));
    flush();
  };
  // The note before the bell, laid again at every start (`remind.ts`).
  useEffect(() => {
    void lay().catch(() => {});
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') flush();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fadeCover = (to: 0 | 1, ms: number, then?: () => void) =>
    Animated.timing(cover, { toValue: to, duration: ms, easing: EASE, useNativeDriver: true }).start(({ finished }) => {
      if (finished) then?.();
    });

  // ---- a guided sitting: the site's, for its live video -------------------

  /** The stone is in and the sitting has begun: the site's sitting is what is left. */
  const reveal = () => {
    if (!begun.current || !landedGuided.current || modeRef.current !== 'throw') return;
    fadeCover(0, SHOW_MS, () => setMode('web'));
  };

  const sendBegin = (g: boolean) => call(`begin(${JSON.stringify(g)}, ${JSON.stringify(prefsRef.current)})`);

  const beginGuided = (from: Point) => {
    // One Begin: a second tap before this one's render must not throw twice.
    if (modeRef.current !== 'native') return;
    clearGuided();
    begun.current = false;
    landedGuided.current = false;
    guidedAsked.current = true;
    setThrown({ at: from, t: performance.now() });
    setMode('throw');
    if (ready.current) sendBegin(true);
    else queued.current = true;
    guidedTimers.current = [setTimeout(() => {
      landedGuided.current = true;
      // A page that never came cannot begin: say so rather than wait on the water.
      if (failedRef.current) setMode('web');
      else reveal();
    }, THROW_MS), setTimeout(() => {
      if (modeRef.current !== 'throw' || begun.current) return;
      // Never begun: back to the arrival. If it begins after all, it is shown then.
      queued.current = null;
      home();
    }, THROW_MS + GUIDED_WAIT_MS)];
  };

  /** Back to the native arrival, fresh, over the site's own (the cover is out, at 0). */
  const home = () => {
    setThrown(null);
    setLayer('arrive');
    setMode('native');
    fadeCover(1, BACK_MS);
  };

  // ---- a native sitting ------------------------------------------------------

  /**
   * Begin, as the site's: the stored mix and the opening bell at once, the
   * closing bell scheduled on the audio clock for the whole sitting, and the
   * end on the monotonic clock — at the shared bell, converted once from the
   * session clock, for *until the bell*. The stone is thrown from where it
   * was in the hand.
   */
  const beginNative = (from: Point, fromMinutes = false) => {
    // One Begin: a second tap before this one's render would schedule a
    // second pair of bells that End could not cancel.
    if (stageRef.current.kind === 'sitting' || modeRef.current !== 'native') return;
    const p = prefsRef.current;
    mix.ensure();
    mix.restore();
    holdForSitting(true);
    const startedAt = performance.now();
    const sessionNow = clock.now ?? serverNow();
    const together = p.showCount && p.untilBell;
    const end = together
      ? monotonicEndAtFromServerTarget(nextSharedBellAt(sessionNow), sessionNow, startedAt)
      : computeEndsAt(startedAt, p.timerMinutes);
    const seconds = (end - startedAt) / 1000;
    const bell = scheduleBell(seconds, p.endBell);
    const opening = openingBell(p.endBell, seconds);
    setRepeat(fromMinutes);
    setAgain(false);
    setLanded(false);
    setThrown({ at: from, t: performance.now() });
    setStage({
      kind: 'sitting',
      sit: { id: Crypto.randomUUID(), startedAt, startedAtWall: Date.now(), endsAt: end, together, withOthers: p.showCount },
      bell,
      opening,
    });
    // Presence never delays the ritual.
    void presence.begin();
  };

  // The words for the sitting come up once the stone has settled.
  useEffect(() => {
    if (landed) return;
    const t = setTimeout(() => setLanded(true), THROW_MS);
    return () => clearTimeout(t);
  }, [landed]);

  const sit = (from: Point, g: boolean) => (g ? beginGuided(from) : beginNative(from));

  /**
   * Begin, as the site's: when the site would ask the name and the place
   * first (`screensFor`: a guest who has sat once and was never asked), they
   * are asked here, and the last answer begins the sitting.
   */
  const begin = (from: Point) => {
    if (modeRef.current !== 'native' || stageRef.current.kind !== 'arrive') return;
    if (ask.length) {
      pending.current = { from, guided };
      setDir(1);
      setLayer('ask');
      return;
    }
    sit(from, guided);
  };

  const asked: Ask = {
    screens: ask,
    name,
    save: (patch) => call(`profile(${JSON.stringify(patch)})`),
    onFinish: () => {
      const p = pending.current;
      pending.current = null;
      // Asked once: the site says so too on its next `arrive`.
      setAsk([]);
      setDir(-1);
      setLayer('arrive');
      if (p) sit(p.from, p.guided);
    },
  };

  /** Back to the arrival from a native sitting. */
  const homeNative = () => {
    setAgain(false);
    setStage({ kind: 'arrive' });
    setThrown(null);
    setRepeat(false);
    setLanded(true);
    setLayer('arrive');
  };

  const endEarly = () => {
    const st = stageRef.current;
    if (st.kind !== 'sitting') return;
    st.bell?.cancel();
    // Ending while the opening bell rings must not answer with the sound that means begin.
    st.opening?.cancel();
    mix.fadeOut();
    // What was sat, not what was intended.
    record({ id: st.sit.id, startedAt: st.sit.startedAtWall, seconds: (performance.now() - st.sit.startedAt) / 1000, completed: false });
    // Once the fade has gone: a lock inside it would freeze it half done.
    holdForSitting(false, 5_000);
    homeNative();
  };

  // The bell rings itself, on the audio clock. This only moves the screen on.
  useEffect(() => {
    if (stage.kind !== 'sitting' || !hasEnded(stage.sit.endsAt, clock.mono)) return;
    const { sit } = stage;
    record({ id: sit.id, startedAt: sit.startedAtWall, seconds: (sit.endsAt - sit.startedAt) / 1000, completed: true });
    // Across the whole return, not inside it.
    mix.fadeOut(14);
    setStage({ kind: 'finished', sit, endedAt: performance.now(), minutes: Math.max(1, Math.round((sit.endsAt - sit.startedAt) / 60_000)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, clock.mono]);

  // The bell's tail (up to the drum's 27 s) and the 14 s fade ring out with
  // the phone locked, and then the audio may rest. Again holds it again.
  useEffect(() => {
    if (stage.kind === 'finished') holdForSitting(false, COOLDOWN_MS + 30_000);
  }, [stage.kind]);

  const finished = stage.kind === 'finished';
  // The bell has rung and its tail has not gone: the sitting stays, ended.
  const held = stage.kind === 'finished' && clock.mono - stage.endedAt < COOLDOWN_MS;
  const fading = stage.kind === 'finished' && !held && clock.mono - stage.endedAt < COOLDOWN_MS + FADE_MS;
  const shownSit = stage.kind === 'sitting' || held || fading ? stage.sit : null;
  const sittingNow = stage.kind === 'sitting' || held;
  const withOthersNow = sittingNow && (stage.kind === 'sitting' || stage.kind === 'finished') && stage.sit.withOthers;

  // A guided sitting on the site is a sitting with others too, from the
  // throw until the site says it is over.
  const guidedNow = mode === 'throw' || (mode === 'web' && webSitting);
  // And it keeps the app's audio as a native sitting does: resting it as
  // the phone locks could take the page's sound with it.
  const wasGuided = useRef(false);
  useEffect(() => {
    if (guidedNow) holdForSitting(true);
    else if (wasGuided.current) holdForSitting(false, COOLDOWN_MS + 30_000);
    wasGuided.current = guidedNow;
  }, [guidedNow]);
  const presence = usePresence({
    label: withOthersNow || guidedNow ? label : null,
    sitting: sittingNow || guidedNow,
  });

  // One fish per person here now. While you sit, your own heartbeat is among
  // them and you are not a fish: one comes off — yours by name if you share
  // one — down to the count of everybody else (`count` includes you). By
  // yourself, no fish.
  const stones = useMemo<Stone[]>(() => {
    if (stage.kind === 'arrive') return world;
    if (!stage.sit.withOthers) return [];
    const out = [...world];
    const { count } = presence;
    const others = Math.max(0, count === null ? out.length - 1 : Math.min(out.length, count - 1));
    while (out.length > others) {
      let drop = label ? out.findIndex((st) => st.label === label) : -1;
      for (let k = out.length - 1; drop < 0 && k >= 0; k--) if (!out[k]!.label) drop = k;
      out.splice(drop < 0 ? out.length - 1 : drop, 1);
    }
    return out;
  }, [world, stage, presence.count, label]);
  const labels = useMemo(() => world.flatMap((st) => (st.label ? [st.label] : [])), [world]);

  // The sitting's words: up once the stone has settled, out from under the minutes.
  const sitShown = useRef(new Animated.Value(0)).current;
  const sitVisible = shownSit !== null && landed && !fading;
  useEffect(() => {
    Animated.timing(sitShown, { toValue: sitVisible ? 1 : 0, duration: fading ? 700 : 1000, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }).start();
  }, [sitVisible, fading, sitShown]);

  const onMessage = (e: WebViewMessageEvent) => {
    let m: ArriveMessage | { type: 'sitting'; on?: boolean } | { type: 'recorded'; ids: string[] };
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m.type === 'recorded') {
      if (Array.isArray(m.ids)) recorded(m.ids);
      return;
    }
    if (m.type === 'sitting') {
      // A site older than this says only that a sitting has begun.
      const on = m.on !== false;
      setWebSitting(on);
      if (!on) return;
      begun.current = true;
      const late = guidedAsked.current;
      guidedAsked.current = false;
      if (modeRef.current === 'site') setMode('web');
      else if (modeRef.current === 'native' && late && stageRef.current.kind === 'arrive') {
        // Begun after the arrival had come back: show it now.
        setMode('throw');
        landedGuided.current = true;
        reveal();
      } else reveal();
      return;
    }
    if (m.type !== 'arrive') return;
    ready.current = true;
    setGuide(m.guide);
    setName(m.name);
    const word = m.corner !== undefined ? m.corner : (m.name?.split(/\s+/)[0] ?? null);
    setCorner(word);
    setLabel(m.label ?? null);
    setAsk(m.ask ?? []);
    const mine = unsent.current;
    unsent.current = {};
    if (Object.keys(mine).length) call(`update(${JSON.stringify(mine)})`);
    keep(normalize({ ...m.prefs, ...mine }));
    flush();
    if (queued.current !== null) {
      sendBegin(queued.current);
      queued.current = null;
    }
    // The site is back at its arrival after a guided sitting, or signed out
    // from its own corner.
    if (modeRef.current === 'web' || (modeRef.current === 'site' && word === null)) home();
  };

  const account = () => {
    if (!corner) {
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

  const atArrive = stage.kind === 'arrive' || (!landed && !repeat);

  return (
    <View style={s.screen}>
      <StatusBar style="dark" />
      <WebView
        key={`${attempt}:${handed?.id ?? ''}`}
        ref={web}
        source={{ uri }}
        injectedJavaScriptBeforeContentLoaded={handed?.js}
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
          // Over the site through a guided throw too: a tap there would land
          // on the hidden page. Only the account corner is the site's to touch.
          pointerEvents={mode === 'site' ? 'none' : 'auto'}
        >
          {fonts && (
            <>
              <Pond
                ref={pond}
                stones={stones}
                you={(thrown !== null || stage.kind !== 'arrive') && !again}
                throwFrom={thrown}
                water={mode === 'native' && layer === 'arrive' && stage.kind === 'arrive'}
                bellAt={finished ? stage.endedAt : null}
              />

              {finished && !held && !again && (
                <Afterwards minutes={stage.minutes} onAgain={() => setAgain(true)} onDone={homeNative} />
              )}
              {finished && !held && again && (
                <SameSetup
                  prefs={prefs}
                  now={clock.now}
                  onYes={(from) => beginNative(from, true)}
                  onNo={homeNative}
                  onBack={() => setAgain(false)}
                />
              )}

              {shownSit !== null && (
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: sitShown }]} pointerEvents={sitVisible ? 'box-none' : 'none'}>
                  <Sitting
                    // A new sitting is a new screen, its controls awake, even
                    // when Again is pressed while the last one is fading.
                    key={shownSit.id}
                    sit={shownSit}
                    now={clock.now}
                    mono={clock.mono}
                    count={presence.count}
                    litCount={presence.litCount}
                    labels={labels}
                    ownLabel={label}
                    soundMix={prefs.soundMix}
                    onSound={(patch: Partial<Record<TrackSlug, number>>) => update({ soundMix: { ...prefsRef.current.soundMix, ...patch } })}
                    onSoundOpen={mix.unmute}
                    onEnd={endEarly}
                    onBack={endEarly}
                    onTap={(at) => pond.current?.scatter(at)}
                    ended={finished}
                  />
                </Animated.View>
              )}

              {atArrive && (
                <View style={StyleSheet.absoluteFill} pointerEvents={stage.kind === 'arrive' ? 'box-none' : 'none'}>
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
                          name={corner}
                          others={world.length}
                          now={clock.now}
                          leaving={mode === 'throw' || stage.kind !== 'arrive'}
                          onAccount={account}
                          onBegin={begin}
                          onPreviewBell={previewBell}
                          onStopBell={stopPreviewBell}
                          onTaste={mix.taste}
                          onHush={mix.hush}
                        />
                      ) : (
                        <SignIn
                          ask={l === 'ask' ? asked : undefined}
                          onClose={() => {
                            pending.current = null;
                            setDir(-1);
                            setLayer('arrive');
                          }}
                          onDone={(session) => {
                            // A fresh web view that loads signed in, the session
                            // written into the site's storage before the page
                            // runs; it says the name on its first arrive. This
                            // side keeps no copy.
                            ready.current = false;
                            const id = Crypto.randomUUID();
                            setHanded({ id, js: handoffScript(session, id) });
                            forgetSession();
                            setDir(-1);
                            setLayer('arrive');
                          }}
                        />
                      )
                    }
                  />
                </View>
              )}
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
