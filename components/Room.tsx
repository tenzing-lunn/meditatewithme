'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { serverNow, syncClock } from '@/lib/clock';
import { candleBurn, hourKey, hourStart, nextHourStart } from '@/lib/session';
import { endsAt as computeEndsAt, hasEnded, mmss, remainingMs } from '@/lib/timer';
import type { Session } from '@/lib/types';
import Candle from './Candle';
import SessionSetup from './SessionSetup';
import { usePresence } from './usePresence';
import { usePreferences } from './usePreferences';
import { useSession } from './useSession';
import { scheduleBell, unlockAudio, type ScheduledBell } from './audio';

/**
 * The room.
 *
 * NOBODY IS EVER TURNED AWAY
 * An earlier version ran a forty-five minute session and refused to start a
 * sitting for the other fifteen, which meant a meditation site told a quarter
 * of its arrivals to come back later. The hour is not permission. A candle is
 * lit at the top of every hour and burns down across it; you sit whenever you
 * like, against whatever is left of it.
 *
 * What is shared is the candle's state, not the right to begin. Two people in
 * different timezones opening this in the same second see the same height of
 * wax — and someone arriving at :50 gets a stub, which says "you are late"
 * far more gently than a locked button.
 *
 * TWO CLOCKS, KEPT APART
 * The session clock is absolute, shared and corrected against the server. The
 * personal timer is relative, private and monotonic. Conflating them is the
 * most likely source of confusing bugs here, so `now` and `mono` are read from
 * different sources on the same tick and never substituted for one another.
 *
 * A sitting may run through the top of the hour. It is not interrupted — a new
 * candle is simply lit under it, which needs no code because the burn is a
 * function of the clock.
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

  // Re-resolves only when the clock rolls into a new hour, which is the only
  // moment the answer can change.
  const session = useSession(now === null ? null : hourKey(now));

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
    // AudioContext start any other way, which is why Begin is a deliberate
    // gesture rather than sound arriving unannounced.
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

  const sitting = activity.kind === 'sitting';

  return (
    <div className="flex w-full flex-col items-center text-center">
      {sitting ? (
        <SittingClock remaining={remainingMs(activity.sit.endsAt, mono)} />
      ) : (
        <Masthead now={now} />
      )}

      <div className="mt-6">
        <Focus session={session} burn={candleBurn(now)} />
      </div>

      <div className="mt-4 flex w-full flex-col items-center">
        {activity.kind === 'idle' && (
          <>
            <SessionSetup prefs={prefs} update={update} />

            {/* Always available. There is no wrong minute to start meditating. */}
            <button
              type="button"
              onClick={begin}
              className="border-ember text-ember hover:bg-ember focus-visible:ring-ember focus-visible:ring-offset-paper mt-7 rounded-full border px-9 py-3 font-mono text-sm tracking-[0.18em] uppercase transition-colors duration-500 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Begin
            </button>
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
          <PresenceLine count={count} sitting={sitting} />
        )}
      </div>
    </div>
  );
}

/**
 * Whatever this hour asks you to look at.
 *
 * This is the branch the whole session architecture exists to make possible,
 * and it is deliberately the only one. The room does not ask "are we live?" —
 * it hands the session here and renders what it says.
 *
 * In v1 that is always the candle: `sessions` is empty, so every hour resolves
 * ambient. The two remaining focus loops from the spec, and v2's live video,
 * both arrive as cases in this function and a row in a table — not as changes
 * to the clock, the timer, the presence count or anything else in this file.
 *
 * `session` is null only in the instant before the first tick. The candle is
 * right for that instant too, so there is nothing to wait for.
 */
function Focus({ session, burn }: { session: Session | null; burn: number }) {
  switch (session?.focusSlug) {
    // 'water' and 'hourglass' from the spec are cases here once the client
    // sources the loops. Anything unrecognised falls through on purpose: a
    // typo in a database row should show a candle, not an empty page.
    case 'candle':
    default:
      return <Candle burn={burn} />;
  }
}

function localTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * The name, and the one sentence that explains the whole thing.
 *
 * This replaces a large countdown to the next session. The countdown implied
 * you were waiting for permission, which was never true and is now not even
 * structurally possible — so it is a sentence instead, and the candle carries
 * the sense of where you are in the hour.
 */
function Masthead({ now }: { now: number }) {
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl leading-none tracking-tight sm:text-5xl">
        Meditate <em className="text-ember italic">With Me</em>
      </h1>

      <p className="text-ink-2 mx-auto max-w-[38ch] text-pretty">
        A candle is lit at the top of every hour and burns down until the next
        one. Sit whenever you like — everyone worldwide is watching the same
        candle.
      </p>

      <p className="text-ink-3 font-mono text-xs tracking-[0.13em] uppercase">
        Lit at {localTime(hourStart(now))} · next at {localTime(nextHourStart(now))}
      </p>
    </div>
  );
}

/** The personal timer. Takes the large type once a sitting is running. */
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

/**
 * After the bell.
 *
 * The proposal is explicit that nothing should appear on screen for a moment
 * once the bell sounds, and that whatever follows is "a single line
 * acknowledging the sit, and nothing more". So the acknowledgement fades in
 * after the strike rather than landing on top of it.
 *
 * Signing in to log the sitting belongs here and is not built: accounts are
 * step 07, and a practice log is a table, a policy and a view nobody has quoted
 * for yet.
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
        You sat for {minutes} minutes.
      </p>

      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={onAgain}
          className="border-ember text-ember hover:bg-ember rounded-full border px-7 py-2.5 font-mono text-xs tracking-[0.15em] uppercase transition-colors duration-500 hover:text-white"
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
  sitting,
}: {
  count: number | null;
  sitting: boolean;
}) {
  if (count === null) return null;

  const others = Math.max(0, count - 1);

  const text =
    others === 0
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
