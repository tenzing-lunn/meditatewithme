'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { serverNow, syncClock } from '@/lib/clock';
import { candleBurn, hourKey, hourStart, nextHourStart } from '@/lib/session';
import { endsAt as computeEndsAt, hasEnded, mmss, remainingMs } from '@/lib/timer';
import type { Session } from '@/lib/types';
import { currentStreak, type PracticeEntry } from '@/lib/practice';
import Candle from './Candle';
import Practice from './Practice';
import SessionSetup from './SessionSetup';
import SignIn from './SignIn';
import { useAuth } from './useAuth';
import { usePractice } from './usePractice';
import { usePresence } from './usePresence';
import { usePreferences } from './usePreferences';
import { useSession } from './useSession';
import { useSyncPreferences } from './useSyncPreferences';
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
  /** Its own id, minted at Begin. Carried into the practice log so that a
   *  double-fired effect records the same sitting twice and de-duplicates to
   *  one, rather than counting it twice. */
  id: string;
  startedAt: number;
  /** Wall clock, for the practice log. `startedAt` is monotonic and says
   *  nothing about what day it is. */
  startedAtWall: number;
  endsAt: number;
  bell: ScheduledBell | null;
};

type Activity =
  | { kind: 'idle' }
  | { kind: 'sitting'; sit: Sitting }
  | { kind: 'finished' };

function newSittingId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export default function Room() {
  // Null until mounted — the server cannot know the viewer's clock, so
  // rendering any time during SSR guarantees a hydration mismatch.
  const [now, setNow] = useState<number | null>(null);
  const [mono, setMono] = useState(0);
  const [activity, setActivity] = useState<Activity>({ kind: 'idle' });

  const { prefs, update, replace, loaded } = usePreferences();
  const { count } = usePresence();

  // Accounts are optional and cuttable. Removing these two lines and the
  // <SignIn> below leaves a complete product — which is the promise the scope
  // table makes with the word "optional", kept at runtime rather than on paper.
  const { state: auth, signIn, signOut } = useAuth();
  const userId = auth.status === 'signed-in' ? auth.user.id : null;

  const sync = useSyncPreferences({ userId, prefs, replace, loaded });

  // The log works signed out. Signing in only carries it between devices.
  const { entries, record } = usePractice(userId);

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

    setActivity({
      kind: 'sitting',
      sit: {
        id: newSittingId(),
        startedAt,
        startedAtWall: Date.now(),
        endsAt: end,
        bell,
      },
    });
  }, [prefs.timerMinutes, prefs.endBell]);

  const endEarly = useCallback(() => {
    setActivity((a) => {
      if (a.kind === 'sitting') {
        a.sit.bell?.cancel();
        // Stopping early still counts, and counts for what was actually sat.
        // Someone who set an hour and stopped at twenty sat for twenty —
        // recording the intention instead would make the totals a wish list.
        // Under a minute records nothing; that was a mis-tap.
        record({
          id: a.sit.id,
          startedAt: a.sit.startedAtWall,
          seconds: (performance.now() - a.sit.startedAt) / 1000,
          completed: false,
        });
      }
      return { kind: 'idle' };
    });
  }, [record]);

  // The bell rings itself, on the audio clock. This only moves the UI on.
  useEffect(() => {
    if (activity.kind !== 'sitting') return;
    if (!hasEnded(activity.sit.endsAt, mono)) return;

    // Passing the sitting's own id makes this safe to run twice — React runs
    // effects twice in development, and the log de-duplicates by id rather than
    // counting the same sitting again.
    record({
      id: activity.sit.id,
      startedAt: activity.sit.startedAtWall,
      seconds: (activity.sit.endsAt - activity.sit.startedAt) / 1000,
      completed: true,
    });

    setActivity({ kind: 'finished' });
  }, [activity, mono, record]);

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
            entries={entries}
            now={now}
          />
        )}

        {activity.kind === 'idle' && <PracticePanel entries={entries} now={now} />}

        {/* Not during a sitting. The one moment nobody should be offered an
            account is while they are sitting with their eyes closed. */}
        {!sitting && (
          <SignIn
            state={auth}
            sync={sync}
            signIn={signIn}
            signOut={signOut}
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
  entries,
  now,
}: {
  onAgain: () => void;
  minutes: number;
  entries: PracticeEntry[];
  now: number;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 2600);
    return () => window.clearTimeout(t);
  }, []);

  const streak = currentStreak(entries, now);

  return (
    <div
      className={`flex flex-col items-center transition-opacity duration-1000 ${shown ? 'opacity-100' : 'opacity-0'}`}
    >
      <p className="text-ink-2">
        You sat for {minutes} minutes.
        {/* One clause, only once it is true of more than today. The proposal
            asks for "a single line acknowledging the sit, and nothing more",
            so the streak joins that line rather than becoming a panel of its
            own at the one moment the page should be quietest. */}
        {streak > 1 && (
          <>
            {' '}
            <span className="text-ink-3">
              That is {streak} days in a row.
            </span>
          </>
        )}
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
 * Your practice, folded away.
 *
 * Collapsed by default, and absent entirely until there is something to show.
 * The page's job is to get somebody sitting; a history is what you look at
 * afterwards, or on a day you are deciding whether to bother. Opening with it
 * would put a record of your consistency between you and the act of starting,
 * which is the wrong order for a meditation site and would quietly make the
 * page about performance.
 */
function PracticePanel({
  entries,
  now,
}: {
  entries: PracticeEntry[];
  now: number;
}) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="mt-10 flex w-full flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-ink-3 hover:text-ink-2 focus-visible:ring-ember focus-visible:ring-offset-paper rounded-sm font-mono text-xs tracking-[0.13em] uppercase underline underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {open ? 'Hide your practice' : 'Your practice'}
      </button>

      {open && (
        <div className="mt-6">
          <Practice entries={entries} now={now} />
        </div>
      )}
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
