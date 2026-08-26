'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { serverNow, syncClock } from '@/lib/clock';
import {
  hourStart,
  msLeftInSession,
  msUntilNextSession,
  nextHourStart,
  sessionPhase,
} from '@/lib/session';
import { endsAt as computeEndsAt, hasEnded, mmss, remainingMs } from '@/lib/timer';
import Candle from './Candle';
import SessionSetup from './SessionSetup';
import { usePresence } from './usePresence';
import { usePreferences } from './usePreferences';
import { scheduleBell, unlockAudio, type ScheduledBell } from './audio';

/**
 * The room (build steps 03 + 04).
 *
 * TWO CLOCKS, KEPT APART
 * The session clock is absolute, shared and corrected against the server. The
 * personal timer is relative, private and monotonic. Conflating them is,
 * per the architecture notes, the most likely source of confusing bugs here —
 * so `now` and `mono` are read from different sources on the same tick and
 * never substituted for one another.
 *
 * A SIT OUTLIVES ITS SESSION
 * You can start a ten-minute sit at :44, and the session's forty-five minutes
 * end under you. The sit continues to its bell: the commitment you made was to
 * sit for ten minutes, and blowing the candle out mid-breath to honour a
 * schedule you did not set would be the wrong way round. The session clock
 * quietly changes to the next session behind you.
 */

type Sitting = {
  startedAt: number;
  endsAt: number;
  bell: ScheduledBell | null;
};

type Activity =
  | { kind: 'idle' }
  | { kind: 'sitting'; sit: Sitting }
  | { kind: 'finished' };

export default function Room() {
  // Null until mounted — the server cannot know the viewer's clock, so
  // rendering any time during SSR guarantees a hydration mismatch.
  const [now, setNow] = useState<number | null>(null);
  const [mono, setMono] = useState(0);
  const [activity, setActivity] = useState<Activity>({ kind: 'idle' });

  const { prefs, update } = usePreferences();
  const { count } = usePresence();

  // Read in cleanup, where a stale closure would otherwise leave a bell
  // scheduled after the component is gone.
  const activityRef = useRef(activity);
  activityRef.current = activity;

  useEffect(() => {
    let frame: number;

    const tick = () => {
      setNow(serverNow());
      setMono(performance.now());
      frame = window.setTimeout(tick, 250) as unknown as number;
    };

    void syncClock().then(tick);

    const onFocus = () => void syncClock();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearTimeout(frame);
      window.removeEventListener('focus', onFocus);
      const a = activityRef.current;
      if (a.kind === 'sitting') a.sit.bell?.cancel();
    };
  }, []);

  const begin = useCallback(() => {
    // Must happen inside the click. Autoplay policy will not let an
    // AudioContext start any other way, which is exactly why Begin exists as a
    // deliberate gesture rather than sound arriving unannounced.
    unlockAudio();

    const startedAt = performance.now();
    const end = computeEndsAt(startedAt, prefs.timerMinutes);

    // Scheduled on the AUDIO clock, not a JS timer — background tabs throttle
    // timers to roughly one tick a minute, and a bell ninety seconds late has
    // failed at its one job.
    const bell = scheduleBell((end - startedAt) / 1000, prefs.endBell);

    setActivity({ kind: 'sitting', sit: { startedAt, endsAt: end, bell } });
  }, [prefs.timerMinutes, prefs.endBell]);

  const endEarly = useCallback(() => {
    setActivity((a) => {
      if (a.kind === 'sitting') a.sit.bell?.cancel();
      return { kind: 'idle' };
    });
  }, []);

  // The bell rings itself, on the audio clock. This only moves the UI on.
  useEffect(() => {
    if (activity.kind !== 'sitting') return;
    if (hasEnded(activity.sit.endsAt, mono)) setActivity({ kind: 'finished' });
  }, [activity, mono]);

  if (now === null) {
    return (
      <p className="text-ink-3 font-mono text-sm tracking-[0.13em] uppercase">
        Finding the hour…
      </p>
    );
  }

  const phase = sessionPhase(now);
  const sitting = activity.kind === 'sitting';

  return (
    <div className="flex w-full flex-col items-center text-center">
      {sitting ? (
        <SittingClock remaining={remainingMs(activity.sit.endsAt, mono)} />
      ) : (
        <SessionClock now={now} phase={phase} />
      )}

      <div className="mt-8">
        <Candle lit={sitting} />
      </div>

      <div className="mt-6 flex w-full flex-col items-center">
        {activity.kind === 'idle' && (
          <>
            <SessionSetup prefs={prefs} update={update} />

            <div className="mt-7">
              {phase === 'active' ? (
                <button
                  type="button"
                  onClick={begin}
                  className="border-ember text-ember hover:bg-ember focus-visible:ring-ember focus-visible:ring-offset-paper rounded-full border px-9 py-3 font-mono text-sm tracking-[0.18em] uppercase transition-colors duration-500 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Begin
                </button>
              ) : (
                // Deliberately not a disabled Begin. There is nothing wrong to
                // fix, you are simply early — so the room says when, and the
                // button arrives on its own at the top of the hour.
                <p className="text-ink-3 font-mono text-xs tracking-[0.13em] uppercase">
                  Begin opens at {localTime(nextHourStart(now))}
                </p>
              )}
            </div>
          </>
        )}

        {sitting && (
          <button
            type="button"
            onClick={endEarly}
            className="text-ink-3 hover:text-ink-2 font-mono text-xs tracking-[0.13em] uppercase transition-colors"
          >
            End this sitting
          </button>
        )}

        {activity.kind === 'finished' && (
          <Afterwards
            onAgain={() => setActivity({ kind: 'idle' })}
            minutes={prefs.timerMinutes}
          />
        )}

        {prefs.showCount && activity.kind !== 'finished' && (
          <PresenceLine count={count} phase={phase} sitting={sitting} />
        )}
      </div>
    </div>
  );
}

function localTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** The personal timer. Takes the large type once a sit is running. */
function SittingClock({ remaining }: { remaining: number }) {
  return (
    <div className="space-y-3">
      <p className="text-ember font-mono text-sm tracking-[0.13em] uppercase">
        Sitting
      </p>
      <p className="font-serif text-6xl leading-none tabular-nums sm:text-7xl">
        {mmss(remaining)}
      </p>
      <p className="text-ink-2">remaining in your sitting</p>
    </div>
  );
}

/** The session's own clock, always shown in the viewer's local time. */
function SessionClock({
  now,
  phase,
}: {
  now: number;
  phase: 'active' | 'interlude';
}) {
  const active = phase === 'active';

  return (
    <div className="space-y-3">
      <p className="text-ember font-mono text-sm tracking-[0.13em] uppercase">
        {active ? 'Session in progress' : 'Next session'}
      </p>

      <p className="font-serif text-6xl leading-none tabular-nums sm:text-7xl">
        {mmss(active ? msLeftInSession(now) : msUntilNextSession(now))}
      </p>

      {/*
        These times are the entire point of the product: one global session
        anchored to UTC, shown to each person in their own zone. Someone's 3pm
        and someone else's 10pm are the same room, and saying so out loud is
        what makes that legible.
      */}
      <p className="text-ink-2">
        {active ? (
          <>remaining · began at {localTime(hourStart(now))} your time</>
        ) : (
          <>begins at {localTime(nextHourStart(now))} your time</>
        )}
      </p>
    </div>
  );
}

/**
 * After the bell.
 *
 * The proposal is explicit that nothing should appear on screen for a moment
 * once the bell sounds, and that whatever follows is "a single line
 * acknowledging the sit, and nothing more". So the acknowledgement fades in
 * after the strike rather than landing on top of it.
 *
 * Signing in to log the sitting belongs here and is not built: accounts are
 * step 07, and a practice log is a table, a policy and a view that nobody has
 * quoted for yet.
 */
function Afterwards({
  onAgain,
  minutes,
}: {
  onAgain: () => void;
  minutes: number;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 2600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className={`flex flex-col items-center transition-opacity duration-1000 ${shown ? 'opacity-100' : 'opacity-0'}`}
    >
      <p className="text-ink-2">
        You sat for {minutes} {minutes === 1 ? 'minute' : 'minutes'}.
      </p>

      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={onAgain}
          className="border-ember text-ember hover:bg-ember hover:text-white rounded-full border px-7 py-2.5 font-mono text-xs tracking-[0.15em] uppercase transition-colors duration-500"
        >
          Sit again
        </button>
        <button
          type="button"
          onClick={onAgain}
          className="border-rule text-ink-3 hover:border-ink-3 rounded-full border px-7 py-2.5 font-mono text-xs tracking-[0.15em] uppercase transition-colors"
        >
          Finish
        </button>
      </div>
    </div>
  );
}

/**
 * How many people are present.
 *
 * Counts everyone on the page, not only those who have begun — so the wording
 * is "here", which is true of both. Claiming they were all meditating would
 * not be.
 *
 * Renders nothing when the count is unknown or degraded. Somebody sitting down
 * to meditate should never be shown an error, and a missing number costs far
 * less than a wrong one.
 */
function PresenceLine({
  count,
  phase,
  sitting,
}: {
  count: number | null;
  phase: 'active' | 'interlude';
  sitting: boolean;
}) {
  if (count === null) return null;

  const others = Math.max(0, count - 1);

  const text =
    phase === 'interlude' && !sitting
      ? others === 0
        ? 'You are the first one waiting'
        : `${others} ${others === 1 ? 'other is' : 'others are'} waiting`
      : others === 0
        ? sitting
          ? 'You are sitting alone right now'
          : 'Nobody else is here yet'
        : `${others} ${others === 1 ? 'other is' : 'others are'} here`;

  return (
    <p className="text-ink-3 mt-8 font-mono text-xs tracking-[0.13em] uppercase">
      {text}
    </p>
  );
}
