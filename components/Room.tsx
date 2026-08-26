'use client';

import { useEffect, useState } from 'react';
import { serverNow, syncClock } from '@/lib/clock';
import {
  hourStart,
  msLeftInSession,
  msUntilNextSession,
  nextHourStart,
  sessionPhase,
} from '@/lib/session';
import Candle from './Candle';
import { usePresence } from './usePresence';

/**
 * The room (build step 03).
 *
 * Three states, and the hour decides which — not a router, not a reducer, just
 * the clock read on every tick:
 *
 *   interlude          the session is over, the next one is coming
 *   active, unbegun    a session is running and you haven't joined it
 *   active, begun      you have joined it
 *
 * That is deliberately a derived state rather than a stored one. Nothing has to
 * fire at the top of the hour for the room to roll over — no cron, no socket,
 * no timer that could be throttled in a background tab. The room is simply what
 * the clock says it is, so a laptop that slept through the boundary is correct
 * the instant it wakes.
 *
 * The v2 seam is here too: `kind === 'live'` swaps <Candle> for a player and
 * nothing else in this file changes.
 */

function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function localTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function Room() {
  // Null until mounted. Rendering any time on the server guarantees a
  // hydration mismatch, because the server cannot know the viewer's clock.
  const [now, setNow] = useState<number | null>(null);
  const [begun, setBegun] = useState(false);
  const { count } = usePresence();

  useEffect(() => {
    let frame: number;

    const tick = () => {
      setNow(serverNow());
      frame = window.setTimeout(tick, 250) as unknown as number;
    };

    void syncClock().then(tick);

    // Laptops wake with a clock NTP may have corrected while they slept.
    const onFocus = () => void syncClock();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearTimeout(frame);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const phase = now === null ? null : sessionPhase(now);

  // Leaving a session standing after its hour ends would be a lie — the people
  // you were sitting with have gone. Reset on the boundary rather than letting
  // a lit candle outlive the session that lit it.
  useEffect(() => {
    if (phase === 'interlude' && begun) setBegun(false);
  }, [phase, begun]);

  if (now === null || phase === null) {
    return (
      <p className="text-ink-3 font-mono text-sm tracking-[0.13em] uppercase">
        Finding the hour…
      </p>
    );
  }

  const lit = phase === 'active' && begun;

  return (
    <div className="flex flex-col items-center text-center">
      <SessionClock now={now} phase={phase} />

      <div className="mt-10 sm:mt-12">
        <Candle lit={lit} />
      </div>

      <div className="mt-10 flex min-h-[3.5rem] flex-col items-center sm:mt-12">
        {phase === 'active' && !begun && (
          <button
            type="button"
            onClick={() => setBegun(true)}
            className="border-ember text-ember hover:bg-ember focus-visible:ring-ember focus-visible:ring-offset-paper rounded-full border px-9 py-3 font-mono text-sm tracking-[0.18em] uppercase transition-colors duration-500 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Begin
          </button>
        )}

        <PresenceLine count={count} phase={phase} begun={begun} />
      </div>
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
        The times below are the entire point of the product: one global session,
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
 * How many people are present.
 *
 * Counts everyone on the page, not only those who have pressed Begin — so the
 * wording is "here", which is true of both. Claiming they were all meditating
 * would not be.
 *
 * Renders nothing at all when the count is unknown or degraded. Somebody
 * sitting down to meditate should never be shown an error, and a missing number
 * is far less costly than a wrong one.
 */
function PresenceLine({
  count,
  phase,
  begun,
}: {
  count: number | null;
  phase: 'active' | 'interlude';
  begun: boolean;
}) {
  if (count === null) return null;

  const others = Math.max(0, count - 1);

  const text =
    phase === 'interlude'
      ? others === 0
        ? 'You are the first one waiting'
        : `${others} ${others === 1 ? 'other is' : 'others are'} waiting`
      : others === 0
        ? begun
          ? 'You are sitting alone right now'
          : 'Nobody else is here yet'
        : `${others} ${others === 1 ? 'other is' : 'others are'} here`;

  return (
    <p className="text-ink-3 mt-8 font-mono text-xs tracking-[0.13em] uppercase">
      {text}
    </p>
  );
}
