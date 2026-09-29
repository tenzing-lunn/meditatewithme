'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { serverNow } from '@/lib/clock';
import { localTime } from '@/lib/format';
import { composeLabel } from '@/lib/label';
import { screensFor, step, type Screen as ScreenName } from '@/lib/journey';
import type { Point } from '@/lib/pond';
import type { PracticeEntry } from '@/lib/practice';
import {
  endsAt as computeEndsAt,
  hasEnded,
  monotonicEndAtFromServerTarget,
  nextSharedBellAt,
} from '@/lib/timer';
import type { UserPreferences } from '@/lib/types';
import Afterwards, { COOLDOWN_MS } from './Afterwards';
import Arrive from './Arrive';
import Pond, { type PondHandle, type Stone } from './Pond';
import Rail from './Rail';
import type { Sit } from './Sitting';
import type { MixPatch } from './Sounds';
import { openingBell, previewBell, scheduleBell, unlockAudio, type ScheduledBell } from './audio';
import { ICON, WORD } from './controls';
import { displayName, type AuthState } from './useAuth';
import { useClock } from './useClock';
import { useFullscreen } from './useFullscreen';
import { useLive } from './useLive';
import { useWakeLock } from './useWakeLock';
import type { Mix } from './useMix';
import { useOrigin } from './useOrigin';
import { usePresence } from './usePresence';
import { useProfile } from './useProfile';
import { useReducedMotion } from './useReducedMotion';
import type { SyncStatus } from './useSyncPreferences';
import { useUsual } from './useUsual';
import { useWorld } from './useWorld';

/**
 * The journey: the arrival, the sitting, and after, all on one pond.
 *
 * ONE POND, ONE STAGE AT A TIME
 * Pale water (22 September 2026). The pond is drawn once, under everything,
 * and stays mounted from the arrival to the ending, so the stones never move
 * and your rings carry on while the words above them change. The arrival is
 * one sentence and Begin; the name and place, when they are due, are rail
 * screens after it, and the last one's Next begins. Begin is the only way a
 * sitting begins, and that is deliberate: it is a real gesture, so the audio
 * can start inside it, and it is the same gesture for a guest, for somebody
 * signed in, and for Again at the end. There is no auto-start.
 *
 * THE THROW
 * Begin throws your stone from the button to its place on the water. The
 * sitting has started at the press — its clock, its bell and the opening
 * bell — and the words for it fade in once the stone has settled.
 *
 * TWO CLOCKS, KEPT APART
 * The session clock is absolute, shared and corrected against the server.
 * The personal timer is relative, private and monotonic. `now` and `mono`
 * come from `useClock` on the same tick and are never substituted for one
 * another. A sitting may run through the top of the hour and is not
 * interrupted.
 *
 * WHAT MAKES SOUND, AND WHEN
 * Choosing a bell in the sentence strikes it, straight to the context.
 * Begin restores the stored mix and rings the opening bell. Nothing else
 * does: choosing a sound only writes it down until Begin.
 */


/**
 * Everything past the arrival, in its own chunk.
 *
 * The rail mounts every screen it will ever show, all at once, so anything
 * it holds is downloaded, parsed and rendered on the one page where nothing
 * but the arrival is on screen. `Account` is the same argument behind a
 * menu, and `Sitting` behind Begin — and `LiveLayer`, only ever in a sitting
 * with others.
 *
 * Deliberately NOT here: `Arrive` and `Pond`, which are the landing and
 * must never wait for anything; `Afterwards`, which is 72 lines and holds a constant the
 * render reads; and anything that has to run inside the gesture that starts
 * it — `unlockAudio` and `mix.ensure` must be reached synchronously from a
 * click or the browser will not start an AudioContext, so `audio.ts` and
 * `mix.ts` stay where they are however large they get.
 *
 * `loading: () => null` because there is nothing to show: every screen but
 * the current one is `visibility: hidden` and `inert` anyway, and `warm()`
 * below means the current one is never the one waiting.
 */
const CHUNKS = {
  account: () => import('./Account'),
  name: () => import('./NameScreen'),
  origin: () => import('./OriginScreen'),
  sitting: () => import('./Sitting'),
  live: () => import('./LiveLayer'),
} as const;

const nothing = () => null;
const Account = dynamic(CHUNKS.account, { loading: nothing });
const NameScreen = dynamic(CHUNKS.name, { loading: nothing });
const OriginScreen = dynamic(CHUNKS.origin, { loading: nothing });
const Sitting = dynamic(CHUNKS.sitting, { loading: nothing });
const LiveLayer = dynamic(CHUNKS.live, { loading: nothing });

/**
 * Fetch all of them, once the doors are on screen and the browser is idle.
 *
 * Splitting a chunk off only helps if it is off the *critical path*; it does
 * not have to be late. A visitor has to read two doors and choose one, which
 * is seconds, and these are fetched within a frame or two of the first paint
 * — so in practice the screen after the doors is already in memory when it is
 * asked for, and `loading: () => null` never shows. The bundler hands back the
 * same promise for a second `import()` of the same module, so this costs one
 * request apiece whether or not anything has asked yet.
 *
 * Idle rather than immediately: the earth, the clock and the first count are
 * all in flight at that moment and they are what the visitor is looking at.
 */
function warm(): () => void {
  const run = () => {
    for (const load of Object.values(CHUNKS)) void load();
  };
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const t = window.setTimeout(run, 300);
  return () => window.clearTimeout(t);
}

type Stage =
  | { kind: 'rail'; at: ScreenName; dir: 1 | -1 }
  | {
      kind: 'sitting';
      sit: Sit;
      bell: ScheduledBell | null;
      opening: ScheduledBell | null;
      /** Where Begin was pressed, and when: the stone is thrown from there. */
      thrown: Thrown;
    }
  | {
      kind: 'finished';
      /** Kept for the held beat: the earth stays until the bell's tail has gone. */
      sit: Sit;
      minutes: number;
      /** Monotonic, at the bell. */
      endedAt: number;
      thrown: Thrown;
    };

/** Null when the sitting began from a question rather than from Begin. */
type Thrown = { at: Point; t: number } | null;

/** From Begin to the stone settled: the throw's five seconds and its sink. */
const THROW_MS = 6400;

/** One fish per person lit this hour, and no more than the water can hold. */
const MAX_STONES = 400;

function newSittingId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export interface JourneyProps {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  /** Runs inside the change event, because the graph needs a gesture. */
  onSound: (patch: MixPatch) => void;
  mix: Mix;
  entries: PracticeEntry[];
  record: (entry: {
    id: string;
    startedAt: number;
    seconds: number;
    completed: boolean;
  }) => void;
  auth: AuthState;
  sync: SyncStatus;
  signIn: (email: string, name?: string) => Promise<string | null>;
  verify: (email: string, code: string) => Promise<string | null>;
  linkError?: string | null;
  signOut: () => void;
  /**
   * Present when signed in, and it carries the whole difference: Escape on
   * the arrival goes here, and Done at the end goes here. Absent for a
   * guest, whose way out is the arrival.
   */
  home?: () => void;
}

export default function Journey({
  prefs,
  update,
  onSound,
  mix,
  record,
  entries,
  auth,
  sync,
  signIn,
  verify,
  linkError,
  signOut,
  home,
}: JourneyProps) {
  const { now, mono } = useClock();
  const { profile, setProfile } = useProfile({
    userId: auth.status === 'signed-in' ? auth.user.id : null,
    name: auth.status === 'signed-in' ? displayName(auth.user) : undefined,
  });
  const { afterFirstSitting } = useUsual(prefs);
  const origin = useOrigin();
  const fullscreen = useFullscreen();
  const wakeLock = useWakeLock();
  const reduced = useReducedMotion();
  const signedIn = Boolean(home);

  // The chunks for everything past the arrival. See `warm` above.
  useEffect(warm, []);

  // A completed sitting in the log, on this device or the account. The
  // record of having sat, for the rail and for the landing's foot.
  const hasSat = entries.some((e) => e.completed);

  // Decided once, when the journey is mounted. The facts it reads can change
  // while the rail is walked (the sitting's end writes the log), and a rail
  // that re-arranged itself underfoot would be worse than one that asked a
  // question it could have skipped.
  const decide = useCallback(
    (): readonly ScreenName[] =>
      screensFor({
        signedIn,
        hasSat,
        originAsked: profile.share !== null,
      }),
    [signedIn, hasSat, profile.share],
  );
  const [screens, setScreens] = useState<readonly ScreenName[]>(decide);

  const [stage, setStage] = useState<Stage>(() => ({ kind: 'rail', at: screens[0]!, dir: 1 }));

  /**
   * The arrival's words are kept on screen, fading, while the stone is in
   * the air; the sitting's own words arrive once it has settled.
   */
  const [landed, setLanded] = useState(true);
  const thrownAt = stage.kind === 'sitting' ? stage.thrown : null;
  useEffect(() => {
    if (thrownAt === null || reduced) {
      setLanded(true);
      return;
    }
    setLanded(false);
    const t = window.setTimeout(() => setLanded(true), THROW_MS);
    return () => window.clearTimeout(t);
  }, [thrownAt, reduced]);

  // The bell has rung and its tail has not gone: the sitting stays on screen,
  // ended, before the minutes are said.
  const held = stage.kind === 'finished' && mono - stage.endedAt < COOLDOWN_MS;
  const sit = stage.kind === 'sitting' || held ? stage.sit : null;

  // The others' stones, only while sitting with others, and through the
  // held beat. And on the arrival, which opens on them.
  const withOthersNow = sit !== null && sit.withOthers;
  const guidedNow = sit !== null && sit.guided;
  const atArrive = stage.kind === 'rail' && stage.at === 'arrive';
  const world = useWorld(withOthersNow || atArrive);
  /** *By yourself* or *with a guide*, chosen in the arrival's sentence. */
  const [guidedPick, setGuidedPick] = useState(false);
  const labels = world.points.flatMap((p) => p.labels ?? []);
  const ownLabel = profile.share ? composeLabel(profile.name, profile.origin) : null;

  // Whoever is on camera, framed on the water, in a guided sitting — and
  // on the arrival, for the line under the sentence. Low Power Mode
  // refuses to autoplay even muted video; a tap on the sitting is a gesture
  // it accepts, so any tap starts it (`livePlay`).
  const onCamera = useLive(guidedNow || atArrive);
  const livePlay = useRef<(() => void) | null>(null);

  // Seen by name only while sitting with others, and only if they said so.
  const { count, litCount, begin: recordBegin } = usePresence({
    label: withOthersNow ? ownLabel : null,
    sitting: sit !== null,
  });

  // Read in cleanup and at the bell, where a stale closure would otherwise
  // leave a bell scheduled after the component is gone, or read a count
  // from a render ago.
  const pond = useRef<PondHandle | null>(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const go = useCallback(
    (dir: 1 | -1) => {
      setStage((s) => {
        if (s.kind !== 'rail') return s;
        const next = step(screens, s.at, dir);
        if (!next) return s;
        return { kind: 'rail', at: next, dir };
      });
    },
    [screens],
  );

  /** Back off the first screen: home for somebody signed in, nothing for a guest. */
  const back = useCallback(() => {
    const s = stageRef.current;
    if (s.kind !== 'rail') return;
    if (step(screens, s.at, -1) === null) home?.();
    else go(-1);
  }, [screens, go, home]);

  /**
   * A guest coming back to the arrival after a sitting is starting a new
   * journey, so the list is decided again: the sitting is in the log now, so
   * the name and place are asked, once, and never twice.
   */
  const restart = useCallback(() => {
    const next = decide();
    setScreens(next);
    setStage({ kind: 'rail', at: next[0]!, dir: -1 });
  }, [decide]);

  /**
   * Begin, when the name and place are still to be asked: on to them. The
   * graph is built silent inside the click, as it always was on the way in.
   */
  const next = useCallback(() => {
    unlockAudio();
    mix.ensure({ silent: true });
    go(1);
  }, [mix, go]);

  // Escape is Back, unless a dialog or menu has the keyboard, or a control
  // has already used this Escape for itself and said so with preventDefault
  // (the place list on the origin question closes on it). React listens on
  // the document in the App Router, the same node as this, so a control's
  // stopPropagation cannot keep the key from reaching here; defaultPrevented
  // can.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || stageRef.current.kind !== 'rail') return;
      const el = document.activeElement;
      if (el?.closest('[role="dialog"], [role="menu"]')) return;
      back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [back]);

  const begin = useCallback((thrown: Thrown, guided = false) => {
    // Inside the click, all of it. The context, the graph, the stored mix,
    // and full screen if it was asked for: none of them start any other way.
    unlockAudio();
    mix.ensure();
    mix.restore();
    if (fullscreen.supported && fullscreen.wanted) fullscreen.enter();
    // And the screen stays on: a phone that locks mid-sitting suspends the
    // audio graph, and the bell is late.
    wakeLock.request();

    const startedAt = performance.now();
    const sessionNow = now ?? serverNow();
    // A guided sitting ends with everyone on the shared bell at :55, which
    // is where the person on camera hands over.
    const together = guided || (prefs.showCount && prefs.untilBell);
    const end = together
      ? monotonicEndAtFromServerTarget(nextSharedBellAt(sessionNow), sessionNow, startedAt)
      : computeEndsAt(startedAt, prefs.timerMinutes);

    // On the audio clock, not a JS timer: background tabs throttle timers to
    // about one tick a minute, and a bell ninety seconds late has failed.
    const seconds = (end - startedAt) / 1000;
    const bell = scheduleBell(seconds, prefs.endBell);
    // Bounded at both ends by the same sound.
    const opening = openingBell(prefs.endBell, seconds);

    setStage({
      kind: 'sitting',
      sit: {
        id: newSittingId(),
        startedAt,
        startedAtWall: Date.now(),
        endsAt: end,
        together,
        withOthers: guided || prefs.showCount,
        guided,
      },
      bell,
      opening,
      thrown,
    });
    // Presence never delays the ritual.
    void recordBegin();
  }, [prefs, now, mix, fullscreen, wakeLock, recordBegin]);

  const endEarly = useCallback(() => {
    const s = stageRef.current;
    if (s.kind === 'sitting') {
      s.bell?.cancel();
      // Stopping ten seconds in is stopping while the opening bell is still
      // going; leaving it to ring would answer "I've changed my mind" with
      // the sound that means "begin".
      s.opening?.cancel();
      mix.fadeOut();
      // What was actually sat, not what was intended. Under a minute records
      // nothing; that was a mis-tap.
      record({
        id: s.sit.id,
        startedAt: s.sit.startedAtWall,
        seconds: (performance.now() - s.sit.startedAt) / 1000,
        completed: false,
      });
    }
    fullscreen.exit();
    wakeLock.release();
    if (home) home();
    else restart();
  }, [mix, record, fullscreen, wakeLock, home, restart]);

  // The bell rings itself, on the audio clock. This only moves the UI on.
  useEffect(() => {
    if (stage.kind !== 'sitting') return;
    if (!hasEnded(stage.sit.endsAt, mono)) return;
    const { sit } = stage;
    record({
      id: sit.id,
      startedAt: sit.startedAtWall,
      seconds: (sit.endsAt - sit.startedAt) / 1000,
      completed: true,
    });
    // Across the whole return, not inside it.
    mix.fadeOut(14);
    wakeLock.release();
    setStage({
      kind: 'finished',
      sit,
      endedAt: performance.now(),
      minutes: Math.max(1, Math.round((sit.endsAt - sit.startedAt) / 60_000)),
      thrown: stage.thrown,
    });
  }, [stage, mono, record, mix, wakeLock]);

  // The first completed sitting turns the skip on, with what was just sat
  // (`useUsual`). `finished` is only ever reached from the effect above,
  // never from End, so it means completed.
  useEffect(() => {
    if (stage.kind === 'finished') afterFirstSitting();
  }, [stage.kind, afterFirstSitting]);

  // A bell left sounding into a page nobody is on is the one thing this
  // site promised never to do. Nor a screen held awake for it.
  const releaseWakeLock = wakeLock.release;
  useEffect(() => {
    return () => {
      const s = stageRef.current;
      if (s.kind === 'sitting') {
        s.bell?.cancel();
        s.opening?.cancel();
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  const bellLabel = now === null ? null : localTime(nextSharedBellAt(now));

  // One fish per person here now — not everyone who sat this hour and left —
  // each keyed by its cell and its place in it, so a fish keeps its path
  // while its person stays. While you sit, your own heartbeat is among them
  // and you are not a fish: one comes off — yours by name if you share one —
  // down to the count of everybody else here (`count` includes you). Nobody
  // else here, no fish.
  const sitting = sit !== null;
  const stones = useMemo<Stone[]>(() => {
    const out: Stone[] = [];
    for (const p of world.points) {
      for (let k = 0; k < p.live && out.length < MAX_STONES; k++) {
        out.push({ key: `${p.lat},${p.lon}#${k}`, label: p.labels?.[k], lat: p.lat, lon: p.lon });
      }
    }
    if (!sitting) return out;
    const others = Math.max(0, count === null ? out.length - 1 : Math.min(out.length, count - 1));
    while (out.length > others) {
      let drop = ownLabel ? out.findIndex((s) => s.label === ownLabel) : -1;
      for (let k = out.length - 1; drop < 0 && k >= 0; k--) if (!out[k]!.label) drop = k;
      out.splice(drop < 0 ? out.length - 1 : drop, 1);
    }
    return out;
  }, [world.points, sitting, count, ownLabel]);

  // Where each question sits on this visitor's own rail, counted without
  // the arrival, which is not a question.
  const questions: readonly ScreenName[] = screens.filter((s) => s !== 'arrive');
  const stepOf = (s: ScreenName) => questions.indexOf(s) + 1;

  /** On from a question: the next one, or, after the last, the sitting. */
  const onward = useCallback(() => {
    const s = stageRef.current;
    if (s.kind === 'rail' && step(screens, s.at, 1) === null) begin(null, guidedPick);
    else next();
  }, [screens, begin, next, guidedPick]);

  const menu = signedIn ? (
    <button type="button" onClick={home} className={WORD}>
      Home
    </button>
  ) : (
    <Account
      state={auth}
      sync={sync}
      signIn={signIn}
      verify={verify}
      linkError={linkError}
      signOut={signOut}
      className={ICON}
    />
  );

  const finished = stage.kind === 'finished';
  const thrown = stage.kind === 'rail' ? null : stage.thrown;
  const onWater = stage.kind !== 'rail' || stage.at === 'arrive';
  // No fish in a guided sitting: the picture is the company there.
  const guided = stage.kind !== 'rail' && stage.sit.guided;
  const showStones = !guided && (stage.kind === 'rail' || (sit?.withOthers ?? false) || finished);
  const guideLine = onCamera.live
    ? 'Live now'
    : onCamera.next !== null
      ? `The next session starts at ${localTime(onCamera.next)}`
      : 'Nobody is guiding right now';

  return (
    <main id="main" className="relative h-dvh overflow-clip bg-paper text-ink">
      <div
        className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
          onWater ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Pond
          ref={pond}
          stones={showStones ? stones : []}
          you={stage.kind !== 'rail'}
          throwFrom={thrown}
          bellAt={finished ? stage.endedAt : null}
          reduced={reduced}
        />
      </div>

      {guidedNow && <LiveLayer src={onCamera.live?.hls ?? null} playRef={livePlay} />}

      {finished && !held && (
        <div className="absolute inset-0">
          <Afterwards
            minutes={stage.minutes}
            onAgain={() => begin(null, guidedPick)}
            onDone={
              home
                ? () => {
                    fullscreen.exit();
                    home();
                  }
                : undefined
            }
            onFinish={() => {
              fullscreen.exit();
              restart();
            }}
          />
        </div>
      )}

      {sit !== null && (
        <div
          className={`absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none ${
            landed ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          inert={!landed}
          onPointerDown={(e) => {
            livePlay.current?.();
            pond.current?.scatter({ x: e.clientX, y: e.clientY });
          }}
        >
          <Sitting
            sit={sit}
            now={now}
            mono={mono}
            count={count}
            litCount={litCount}
            labels={labels}
            ownLabel={ownLabel}
            soundMix={prefs.soundMix}
            onSound={onSound}
            onSoundOpen={mix.unmute}
            onEnd={endEarly}
            ended={finished}
            nextSession={sit.guided && !onCamera.live ? onCamera.next : null}
            onBack={endEarly}
          />
        </div>
      )}

      {(stage.kind === 'rail' || !landed) && (
        <div className="absolute inset-0" inert={stage.kind !== 'rail'}>
          <Rail
            screens={screens}
            at={stage.kind === 'rail' ? stage.at : 'arrive'}
            dir={stage.kind === 'rail' ? stage.dir : 1}
            render={(screen, current) => {
              switch (screen) {
                case 'arrive':
                  return (
                    <Arrive
                      prefs={prefs}
                      update={update}
                      // Only written down: the play button is for hearing
                      // it, and Begin brings it in for the sitting.
                      onSound={(patch) => update({ soundMix: { ...prefs.soundMix, ...patch } })}
                      onTaste={(slug) => {
                        // Inside the tap on the play button, which is what
                        // lets the browser start the audio at all.
                        unlockAudio();
                        mix.taste(slug);
                      }}
                      onHush={mix.hush}
                      bellLabel={bellLabel}
                      others={world.loaded ? stones.length : null}
                      clock={now === null ? null : localTime(now)}
                      menu={menu}
                      ready={now !== null}
                      leaving={stage.kind !== 'rail'}
                      onBegin={(at) => {
                        if (step(screens, 'arrive', 1) === null) {
                          begin({ at, t: performance.now() }, guidedPick);
                        } else next();
                      }}
                      onWater={(at) => pond.current?.flick(at)}
                      guided={guidedPick}
                      guide={guideLine}
                      onGuided={(g) => {
                        setGuidedPick(g);
                        // By yourself is among the fish, as the door was.
                        if (!g) update({ showCount: true });
                      }}
                      onPreviewBell={(kind) => {
                        unlockAudio();
                        previewBell(kind);
                      }}
                    />
                  );
                case 'name':
                  return (
                    <NameScreen
                      current={current}
                      onChange={(name) => setProfile({ name })}
                      onBack={back}
                      onNext={onward}
                      onSkip={onward}
                      step={stepOf('name')}
                      steps={questions.length}
                    />
                  );
                case 'origin':
                  return (
                    <OriginScreen
                      current={current}
                      name={profile.name}
                      value={profile.origin}
                      suggestion={origin.suggestion}
                      share={profile.share === true}
                      onChange={(o, share) => setProfile({ origin: o, share })}
                      onBack={back}
                      onNext={onward}
                      onSkip={onward}
                      step={stepOf('origin')}
                      steps={questions.length}
                    />
                  );
              }
            }}
          />
        </div>
      )}
    </main>
  );
}
