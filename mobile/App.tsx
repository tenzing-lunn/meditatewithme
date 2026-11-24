import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_700Bold } from '@expo-google-fonts/newsreader/700Bold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { serverNow } from '../lib/clock';
import { screensFor } from '../lib/journey';
import { normalize, parsePreferences } from '../lib/preferences';
import type { Point } from '../lib/pond';
import { endsAt as computeEndsAt, hasEnded, monotonicEndAtFromServerTarget, nextSharedBellAt } from '../lib/timer';
import type { TrackSlug, UserPreferences } from '../lib/types';
import Afterwards, { COOLDOWN_MS, SameSetup } from './Afterwards';
import Arrive from './Arrive';
import { holdForSitting, openingBell, previewBell, scheduleBell, stopPreviewBell, useMix, type ScheduledBell } from './audio';
import { cornerWord, useAccount } from './account';
import AccountScreen from './AccountScreen';
import BellTest from './BellTest';
import { useClock } from './clock';
import { guideLine, useLive } from './live';
import LiveLayer from './LiveLayer';
import Pond, { type PondHandle, type Stone, type Thrown } from './Pond';
import { usePresence } from './presence';
import { lay } from './remind';
import SignIn, { type Ask } from './SignIn';
import Sitting, { type Sit } from './Sitting';
import { PAPER, Rail } from './ui';
import { useStones } from './world';
import * as Crypto from 'expo-crypto';

/**
 * The iPhone app: the site's arrival, its sitting and its account, native.
 *
 * Tenzing's call, 3 October 2026, was to wrap the site first and replace it
 * piece by piece. On 6 October the arrival went native — the pond, the
 * sentence and its wheels, Begin and the throw (`Arrive.tsx`, `Picker.tsx`,
 * `Pond.tsx`), and *Sign in* in its corner (`SignIn.tsx`) — and then the
 * sitting: the timer and the shared hour on the site's clock (`clock.ts`),
 * the beds and the bells on the phone's own audio (`audio.ts`), presence
 * (`presence.ts`), the sitting itself and its ending (`Sitting.tsx`,
 * `Afterwards.tsx`). On 24 November the account (`account.ts`,
 * `AccountScreen.tsx`): the app holds the session and syncs the
 * preferences, the profile and the practice log itself. And the same day
 * the last piece, the guided sitting's live video (`live.ts`,
 * `LiveLayer.tsx`), on the phone's own player — so the site is no longer
 * loaded in the app at all; the app talks only to its API, as the site's
 * own pages do.
 *
 * `EXPO_PUBLIC_SITE=http://localhost:3000/` points the app at a local
 * `next dev`; `EXPO_PUBLIC_BELL_TEST=1 npx expo start` shows the
 * bell-on-a-locked-phone test instead (`BellTest.tsx`).
 */

const PREFS_KEY = 'mwm.app.prefs';
/** The sitting fading out from under the minutes. */
const FADE_MS = 800;
/** The site's `THROW_MS`: the stone's skim and sink, then the sitting's words show. */
const THROW_MS = 6400;

export default function App() {
  if (process.env.EXPO_PUBLIC_BELL_TEST === '1') return <BellTest />;
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

/** A native sitting: where it is, from Begin to the minutes. */
type Stage =
  | { kind: 'arrive' }
  | { kind: 'sitting'; sit: Sit; bell: ScheduledBell | null; opening: ScheduledBell | null }
  | { kind: 'finished'; sit: Sit; minutes: number; endedAt: number };

function Root() {
  const [fonts] = useFonts({ Newsreader_400Regular, Newsreader_700Bold });

  const [prefs, setPrefs] = useState<UserPreferences>(() => parsePreferences(localStorage.getItem(PREFS_KEY)));
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  /** *By yourself* or *with a guide*, chosen in the arrival's sentence. */
  const [guided, setGuided] = useState(false);
  const guidedRef = useRef(guided);
  guidedRef.current = guided;
  /** A Begin waiting on those questions. */
  const pending = useRef<{ from: Point; guided: boolean } | null>(null);

  const [layer, setLayer] = useState<'arrive' | 'signin' | 'ask' | 'account'>('arrive');
  const [dir, setDir] = useState<1 | -1>(1);
  const [thrown, setThrown] = useState<Thrown | null>(null);
  const world = useStones(true);
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

  const keep = (next: UserPreferences) => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    prefsRef.current = next;
    setPrefs(next);
  };

  const update = (patch: Partial<UserPreferences>) => keep(normalize({ ...prefsRef.current, ...patch }));

  // The account: the session, and the preferences, profile and practice log synced to it.
  const account = useAccount(prefs, keep);
  const { name, label, record } = account;
  const corner = account.user ? cornerWord(account.user) : null;
  /** The questions the site would ask after Begin (`screensFor`), asked natively before the sitting. */
  const [askDone, setAskDone] = useState(false);
  const ask = askDone
    ? []
    : screensFor({ signedIn: account.user !== null, hasSat: account.entries.some((e) => e.completed), originAsked: account.profile.share !== null })
        .flatMap((sc) => (sc === 'name' || sc === 'origin' ? [sc] : []));
  // Signed out or deleted from the account screen: back to the arrival.
  useEffect(() => {
    if (!account.user && layer === 'account') {
      setDir(-1);
      setLayer('arrive');
    }
  }, [account.user, layer]);

  // The note before the bell, laid again at every start (`remind.ts`).
  useEffect(() => {
    void lay().catch(() => {});
  }, []);

  /**
   * Begin, as the site's: the stored mix and the opening bell at once, the
   * closing bell scheduled on the audio clock for the whole sitting, and the
   * end on the monotonic clock — at the shared bell, converted once from the
   * session clock, for *until the bell* and for a guided sitting, which ends
   * on the shared bell, where the person on camera hands over. The stone is
   * thrown from where it was in the hand.
   */
  const beginNative = (from: Point, g: boolean, fromMinutes = false) => {
    // One Begin: a second tap before this one's render would schedule a
    // second pair of bells that End could not cancel.
    if (stageRef.current.kind === 'sitting') return;
    const p = prefsRef.current;
    mix.ensure();
    mix.restore();
    holdForSitting(true);
    const startedAt = performance.now();
    const sessionNow = clock.now ?? serverNow();
    const together = g || (p.showCount && p.untilBell);
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
      sit: { id: Crypto.randomUUID(), startedAt, startedAtWall: Date.now(), endsAt: end, together, withOthers: g || p.showCount, guided: g },
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

  /**
   * Begin, as the site's: when the site would ask the name and the place
   * first (`screensFor`: a guest who has sat once and was never asked), they
   * are asked here, and the last answer begins the sitting.
   */
  const begin = (from: Point) => {
    if (stageRef.current.kind !== 'arrive') return;
    if (ask.length) {
      pending.current = { from, guided };
      setDir(1);
      setLayer('ask');
      return;
    }
    beginNative(from, guided);
  };

  const asked: Ask = {
    screens: ask,
    name,
    // A skipped question is '' from `SignIn`, as the site writes it: kept as nothing.
    save: (patch) => {
      if (patch.name !== undefined) void account.saveName(patch.name || null);
      if (patch.origin !== undefined || patch.share !== undefined) {
        void account.saveProfile({ origin: patch.origin === undefined ? account.profile.origin : patch.origin || null, share: patch.share ?? false });
      }
    },
    onFinish: () => {
      const p = pending.current;
      pending.current = null;
      setAskDone(true);
      setDir(-1);
      setLayer('arrive');
      if (p) beginNative(p.from, p.guided);
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

  const presence = usePresence({
    label: withOthersNow ? label : null,
    sitting: sittingNow,
  });

  // Whoever is on camera: framed on the water in a guided sitting, and the
  // line under the arrival's sentence.
  const guidedNow = sittingNow && (stage.kind === 'sitting' || stage.kind === 'finished') && stage.sit.guided;
  const onCamera = useLive(guidedNow || (stage.kind === 'arrive' && layer === 'arrive'));

  // One fish per person here now. While you sit, your own heartbeat is among
  // them and you are not a fish: one comes off — yours by name if you share
  // one — down to the count of everybody else (`count` includes you). By
  // yourself, no fish; with a guide, none either: the picture is the company.
  const stones = useMemo<Stone[]>(() => {
    if (stage.kind === 'arrive') return world;
    if (!stage.sit.withOthers || stage.sit.guided) return [];
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

  /** The corner: Sign in, or the account once signed in. */
  const openAccount = () => {
    setDir(1);
    setLayer(corner ? 'account' : 'signin');
  };

  const atArrive = stage.kind === 'arrive' || (!landed && !repeat);

  return (
    <View style={s.screen}>
      <StatusBar style="dark" />
      {fonts && (
        <>
          <Pond
            ref={pond}
            stones={stones}
            you={(thrown !== null || stage.kind !== 'arrive') && !again}
            throwFrom={thrown}
            water={layer === 'arrive' && stage.kind === 'arrive'}
            bellAt={finished ? stage.endedAt : null}
          />

          {guidedNow && (
            <LiveLayer src={onCamera.live?.hls ?? null} guide={onCamera.live?.name ?? null} stopped={onCamera.stopped} />
          )}

          {finished && !held && !again && (
            <Afterwards minutes={stage.minutes} onAgain={() => setAgain(true)} onDone={homeNative} />
          )}
          {finished && !held && again && (
            <SameSetup
              prefs={prefs}
              guided={guided}
              now={clock.now}
              onYes={(from) => beginNative(from, guidedRef.current, true)}
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
                nextSession={shownSit.guided && !onCamera.live ? onCamera.next : null}
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
                      guide={guideLine(onCamera)}
                      name={corner}
                      others={world.length}
                      now={clock.now}
                      leaving={stage.kind !== 'arrive'}
                      onAccount={openAccount}
                      onBegin={begin}
                      onPreviewBell={previewBell}
                      onStopBell={stopPreviewBell}
                      onTaste={mix.taste}
                      onHush={mix.hush}
                    />
                  ) : l === 'account' ? (
                    <AccountScreen
                      account={account}
                      onClose={() => {
                        setDir(-1);
                        setLayer('arrive');
                      }}
                    />
                  ) : (
                    <SignIn
                      ask={l === 'ask' ? asked : undefined}
                      onClose={() => {
                        pending.current = null;
                        setDir(-1);
                        setLayer('arrive');
                      }}
                      onDone={() => {
                        // The session is the app's own now (`account.ts`); what
                        // the questions just saved is read back into it.
                        void account.refreshProfile();
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
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAPER },
});
