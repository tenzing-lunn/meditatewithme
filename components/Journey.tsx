'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { serverNow } from '@/lib/clock';
import { localTime } from '@/lib/format';
import { composeLabel } from '@/lib/label';
import {
  doorPatch,
  screensFor,
  step,
  togetherLine,
  type Screen as ScreenName,
} from '@/lib/journey';
import type { PracticeEntry } from '@/lib/practice';
import {
  endsAt as computeEndsAt,
  hasEnded,
  monotonicEndAtFromServerTarget,
  nextSharedBellAt,
} from '@/lib/timer';
import type { UserPreferences } from '@/lib/types';
import Account from './Account';
import Afterwards, { COOLDOWN_MS } from './Afterwards';
import BellScreen from './BellScreen';
import BowlScreen from './BowlScreen';
import ModeScreen from './ModeScreen';
import NameScreen from './NameScreen';
import OriginScreen from './OriginScreen';
import Rail from './Rail';
import RoomToggle from './RoomToggle';
import Sitting, { type Sit } from './Sitting';
import SoundScreen from './SoundScreen';
import type { MixPatch } from './Sounds';
import TimeScreen from './TimeScreen';
import { openingBell, scheduleBell, unlockAudio, type ScheduledBell } from './audio';
import { ICON, ICON_ROOM } from './controls';
import { settingsLine } from './settingsLine';
import { displayName, type AuthState } from './useAuth';
import { useClock } from './useClock';
import { useFullscreen } from './useFullscreen';
import { useWakeLock } from './useWakeLock';
import type { Mix } from './useMix';
import { useOrigin } from './useOrigin';
import { usePresence } from './usePresence';
import { useProfile } from './useProfile';
import { useReducedMotion } from './useReducedMotion';
import { useRoom } from './useRoom';
import type { SyncStatus } from './useSyncPreferences';
import { useUsual } from './useUsual';
import { useWorld } from './useWorld';

/**
 * The journey: the rail of questions, the bowl, the sitting, and after.
 *
 * ONE STAGE AT A TIME
 * The rail holds every question in one frame and switches between them; the
 * bowl is its last screen. The guest's menu is pinned over it until the strike. Striking the bowl is the only way a sitting
 * begins, and that is deliberate: it is a real gesture, so the audio can
 * start inside it, and it is the same gesture for a guest, for somebody
 * signed in, and for Sit again at the end. There is no auto-start and no
 * other door.
 *
 * TWO CLOCKS, KEPT APART
 * The session clock is absolute, shared and corrected against the server.
 * The personal timer is relative, private and monotonic. `now` and `mono`
 * come from `useClock` on the same tick and are never substituted for one
 * another. A sitting may run through the top of the hour and is not
 * interrupted.
 *
 * WHAT MAKES SOUND, AND WHEN
 * The first click — a door on the first screen — unlocks the audio and
 * builds the graph silent. The Bell
 * screen strikes the bell you pick, straight to the context. The Sound
 * screen's switch unmutes the beds. The bowl restores the stored mix and
 * rings the opening bell. Nothing else does.
 */

/**
 * The screens drawn in the room, dawn or dusk, rather than on paper: from
 * the choice onward. Paper is for who you are; the room is where you sit.
 */
const ROOM_SCREENS: readonly ScreenName[] = ['mode', 'time', 'bell', 'sound', 'bowl'];

type Stage =
  | { kind: 'rail'; at: ScreenName; dir: 1 | -1 }
  | { kind: 'sitting'; sit: Sit; bell: ScheduledBell | null; opening: ScheduledBell | null }
  | {
      kind: 'finished';
      /** Kept for the held beat: the earth stays until the bell's tail has gone. */
      sit: Sit;
      minutes: number;
      /** Monotonic, at the bell. */
      endedAt: number;
      /** Everyone who lit this hour minus you, read once at the bell. */
      withOthers: number | null;
    };

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
   * Present when signed in, and it carries the whole difference: the rail
   * begins past the doors, Back off its first screen goes here, and Done at
   * the end goes here. Absent for a guest, whose way out is the doors.
   */
  home?: () => void;
  /** Where the rail begins, when not at its first screen. */
  start?: ScreenName;
  /** Through a door on the home: the rail begins just past the mode screen. */
  afterMode?: boolean;
}

export default function Journey({
  prefs,
  update,
  onSound,
  mix,
  record,
  auth,
  sync,
  signIn,
  verify,
  linkError,
  signOut,
  home,
  start,
  afterMode = false,
}: JourneyProps) {
  const { now, mono } = useClock();
  const { profile, setProfile } = useProfile({
    userId: auth.status === 'signed-in' ? auth.user.id : null,
    name: auth.status === 'signed-in' ? displayName(auth.user) : undefined,
  });
  const { usual, setUsual, afterFirstSitting } = useUsual(prefs);
  const origin = useOrigin();
  const fullscreen = useFullscreen();
  const wakeLock = useWakeLock();
  const reduced = useReducedMotion();
  const signedIn = Boolean(home);
  const { room, toggle: toggleRoom } = useRoom();

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
        usual,
        hasSat,
        originAsked: profile.share !== null,
      }),
    [signedIn, usual, hasSat, profile.share],
  );
  const [screens, setScreens] = useState<readonly ScreenName[]>(decide);

  const [stage, setStage] = useState<Stage>(() => {
    const first = afterMode ? step(screens, 'mode', 1) : null;
    return {
      kind: 'rail',
      at: first ?? (start && screens.includes(start) ? start : screens[0]!),
      dir: 1,
    };
  });
  const [struck, setStruck] = useState(0);

  /**
   * The bowl's screen is kept mounted under the sitting for the length of
   * the lift, falling away as the sitting settles in, then let go.
   */
  const [lifting, setLifting] = useState(false);
  useEffect(() => {
    if (stage.kind !== 'sitting') return;
    setLifting(true);
    const t = window.setTimeout(() => setLifting(false), reduced ? 400 : 1400);
    return () => window.clearTimeout(t);
  }, [stage.kind, reduced]);

  // The bell has rung and its tail has not gone: the sitting stays on screen,
  // ended, before the minutes are said.
  const held = stage.kind === 'finished' && mono - stage.endedAt < COOLDOWN_MS;
  const sit = stage.kind === 'sitting' || held ? stage.sit : null;

  // The earth, only while sitting with others, and through the held beat.
  const withOthersNow = sit !== null && sit.withOthers;
  // And on the doors, which open on the earth.
  const world = useWorld(withOthersNow || (stage.kind === 'rail' && stage.at === 'mode'));
  const labels = world.points.flatMap((p) => p.labels ?? []);
  const ownLabel = profile.share ? composeLabel(profile.name, profile.origin) : null;

  // Seen by name only while sitting with others, and only if they said so.
  const { count, litCount, begin: recordBegin } = usePresence({
    label: withOthersNow ? ownLabel : null,
    sitting: sit !== null,
  });

  // Read in cleanup and at the bell, where a stale closure would otherwise
  // leave a bell scheduled after the component is gone, or read a count
  // from a render ago.
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const litRef = useRef(litCount);
  litRef.current = litCount;

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

  const goTo = useCallback((at: ScreenName) => {
    setStage((s) => (s.kind === 'rail' ? { kind: 'rail', at, dir: -1 } : s));
  }, []);

  /** Back off the first screen: home for somebody signed in, nothing for a guest. */
  const back = useCallback(() => {
    const s = stageRef.current;
    if (s.kind !== 'rail') return;
    if (step(screens, s.at, -1) === null) home?.();
    else go(-1);
  }, [screens, go, home]);

  /**
   * A guest coming back to the doors after a sitting is starting a new
   * journey, so the list is decided again: the sitting is in the log now, so
   * the name and place are asked, once, and never twice.
   */
  const restart = useCallback(() => {
    const next = decide();
    setScreens(next);
    setStage({ kind: 'rail', at: next[0]!, dir: -1 });
  }, [decide]);

  /**
   * The first gesture of the journey. Autoplay policy only lets an
   * AudioContext start inside a click, and the Bell and Sound screens need
   * one to exist; building it silent here means neither of them is ever the
   * first thing the browser is asked to allow.
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

  const begin = useCallback(() => {
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
    const together = prefs.showCount && prefs.untilBell;
    const end = together
      ? monotonicEndAtFromServerTarget(nextSharedBellAt(sessionNow), sessionNow, startedAt)
      : computeEndsAt(startedAt, prefs.timerMinutes);

    // On the audio clock, not a JS timer: background tabs throttle timers to
    // about one tick a minute, and a bell ninety seconds late has failed.
    const seconds = (end - startedAt) / 1000;
    const bell = scheduleBell(seconds, prefs.endBell);
    // Bounded at both ends by the same sound.
    const opening = openingBell(prefs.endBell, seconds);

    setStruck((n) => n + 1);
    setStage({
      kind: 'sitting',
      sit: {
        id: newSittingId(),
        startedAt,
        startedAtWall: Date.now(),
        endsAt: end,
        together,
        withOthers: prefs.showCount,
      },
      bell,
      opening,
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
      // Everyone who lit this hour, minus you. Somebody who sat the first
      // ten minutes and left was still in it with you.
      withOthers: litRef.current === null ? null : Math.max(0, litRef.current - 1),
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

  const inRoom = stage.kind !== 'rail' || ROOM_SCREENS.includes(stage.at);
  const roomToggle = (
    <RoomToggle room={room} onToggle={toggleRoom} variant={inRoom ? 'room' : 'paper'} />
  );

  // Where each question sits on this visitor's own rail. A guest's doors are
  // the front page and have no mark; a returning guest whose name and place
  // are known walks a shorter rail and is told so.
  const questions: readonly ScreenName[] = signedIn ? screens : screens.filter((s) => s !== 'mode');
  const stepOf = (s: ScreenName) => questions.indexOf(s) + 1;

  const menu = !signedIn ? (
    <Account
      state={auth}
      sync={sync}
      signIn={signIn}
      verify={verify}
      linkError={linkError}
      signOut={signOut}
      className={inRoom ? ICON_ROOM : ICON}
      menu
    />
  ) : undefined;

  const sitting =
    sit !== null ? (
      <Sitting
        sit={sit}
        now={now}
        mono={mono}
        count={count}
        litCount={litCount}
        points={world.points}
        you={origin.cell}
        labels={labels}
        ownLabel={ownLabel}
        soundMix={prefs.soundMix}
        onSound={onSound}
        onSoundOpen={mix.unmute}
        onEnd={endEarly}
        room={room}
        toggle={roomToggle}
        ended={stage.kind === 'finished'}
      />
    ) : null;

  // Past the held beat. Until then the finished stage is drawn below, in the
  // frame the sitting was in, so the earth does not leave at the bell.
  if (stage.kind === 'finished' && !held) {
    return (
      <div data-room={room} className="contents">
      <Afterwards
        minutes={stage.minutes}
        withOthers={stage.sit.withOthers ? stage.withOthers : null}
        onAgain={begin}
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
    );
  }

  const at = stage.kind === 'rail' ? stage.at : 'bowl';
  const showRail = stage.kind === 'rail' || lifting;

  // The ground changes over the lift at the strike; stepping into or out of
  // the room on the rail takes half as long, so it changes under the question
  // rather than after it.
  return (
    <main
      data-room={room}
      className={`relative h-dvh overflow-clip text-ink transition-colors ease-[var(--ease-lift)] ${
        inRoom ? 'bg-room' : 'bg-paper'
      }`}
      style={{
        transitionDuration: stage.kind === 'rail' ? 'calc(var(--lift-ms) / 2)' : 'var(--lift-ms)',
      }}
    >
      {sitting && (
        <div className="lift-in absolute inset-0">{sitting}</div>
      )}
      {/* Pinned over the rail rather than drawn on a screen, so it stays
          put while the questions change under it, and gone at the strike. */}
      {stage.kind === 'rail' && (menu || roomToggle) && (
        <div className="absolute top-[calc(0.875rem+env(safe-area-inset-top))] right-4 z-20 flex items-center gap-2 sm:right-10 md:right-14 lg:right-20 xl:right-24">
          {roomToggle}
          {menu}
        </div>
      )}
      {showRail && (
      <div className={`absolute inset-0 ${stage.kind === 'sitting' ? 'lift-out' : ''}`} inert={stage.kind !== 'rail'}>
      <Rail
        screens={screens}
        at={at}
        dir={stage.kind === 'rail' ? stage.dir : 1}
        render={(screen, current) => {
          switch (screen) {
            case 'name':
              return (
                <NameScreen
                  current={current}
                  onChange={(name) => setProfile({ name })}
                  onBack={back}
                  onNext={next}
                  onSkip={next}
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
                  onNext={next}
                  onSkip={next}
                  step={stepOf('origin')}
                  steps={questions.length}
                />
              );
            case 'mode':
              return (
                <ModeScreen
                  current={current}
                  room={room}
                  step={stepOf('mode')}
                  steps={questions.length}
                  togetherLine={togetherLine(prefs, bellLabel)}
                  others={count === null ? null : Math.max(0, count - 1)}
                  points={world.points}
                  you={origin.cell}
                  onChoose={(m) => {
                    const patch = doorPatch(m, prefs);
                    update(patch);
                    // The door is not a changed answer: the skip keeps up
                    // with it, as it does with the drawer.
                    if (usual) setUsual(true, { ...prefs, ...patch });
                    next();
                  }}
                  onBack={signedIn || step(screens, 'mode', -1) ? back : undefined}
                  landing={
                    signedIn
                      ? undefined
                      : {
                          usualLine: hasSat ? settingsLine(prefs, now) : null,
                          usual,
                          onUsual: setUsual,
                        }
                  }
                />
              );
            case 'time':
              return (
                <TimeScreen
                  current={current}
                  prefs={prefs}
                  update={update}
                  now={now}
                  count={count}
                  step={stepOf('time')}
                  steps={questions.length}
                  onBack={back}
                  onNext={next}
                />
              );
            case 'bell':
              return (
                <BellScreen
                  current={current}
                  endBell={prefs.endBell}
                  onPick={(endBell) => update({ endBell })}
                  onBack={back}
                  onNext={next}
                  step={stepOf('bell')}
                  steps={questions.length}
                />
              );
            case 'sound':
              return (
                <SoundScreen
                  current={current}
                  prefs={prefs}
                  onSound={onSound}
                  onUnmute={mix.unmute}
                  onBack={back}
                  onNext={next}
                  step={stepOf('sound')}
                  steps={questions.length}
                />
              );
            case 'bowl':
              return (
                <BowlScreen
                  current={current}
                  line={settingsLine(prefs, now)}
                  ready={now !== null}
                  struck={struck}
                  onStrike={begin}
                  onChange={() =>
                    goTo(screens.includes('time') ? 'time' : 'mode')
                  }
                  onBack={back}
                  step={stepOf('bowl')}
                  steps={questions.length}
                  fullscreen={
                    fullscreen.supported
                      ? { wanted: fullscreen.wanted, setWanted: fullscreen.setWanted }
                      : null
                  }
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
