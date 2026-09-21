'use client';

import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from 'react';
import { companyLine } from '@/lib/company';
import type { Cell, WorldPoint } from '@/lib/geo';
import type { Room } from '@/lib/room';
import { mmss, remainingMs } from '@/lib/timer';
import Bowl from './Bowl';
import { QUIET_ROOM } from './controls';
import Sounds, { type MixPatch } from './Sounds';

/**
 * The earth, loaded only here and only when somebody sits with others.
 * `ssr: false` because the map touches `document` while building its
 * sprites, and because none of the geography belongs on the path to the
 * questions.
 */
const WorldMap = dynamic(() => import('./WorldMap'), {
  ssr: false,
  loading: () => null,
});

/** Stillness, in ms, before Sound, End and the room's toggle rest. */
const CONTROLS_REST_MS = 4000;

export interface Sit {
  /** Its own id, minted at the strike. Carried into the practice log so a
   *  double-fired effect records the same sitting once. */
  id: string;
  /** Monotonic. */
  startedAt: number;
  /** Wall clock, for the practice log. */
  startedAtWall: number;
  /** Monotonic. */
  endsAt: number;
  /** Ends on the shared bell, with everyone else who chose it. */
  together: boolean;
  /** Chose the door marked With others: the earth is shown. */
  withOthers: boolean;
}

/**
 * The sitting.
 *
 * The room, dawn or dusk. With others: the earth across the frame, every person a candle on
 * it and yours marked, and under it the one sentence about who is here.
 * The clock is small and in the corner, because the earth is the thing.
 * By yourself: the bowl that was struck, faint, and the clock.
 *
 * Sound opens the six tiles and their Volume in a card at the foot — the
 * same control as the rail's Sound step; the caller raises the master when it
 * opens, since a first-timer's graph was built silent.
 *
 * THE CONTROLS REST
 * Sound, End and the dawn or dusk toggle are there when the sitting begins
 * and fade after a few seconds of stillness, leaving the earth, or the bowl,
 * and the time. Any tap or key brings them back. They stay while the sound
 * card is open and while focus is inside them, so a keyboard never tabs onto
 * something it cannot see; resting, they cannot be pressed, and the tap that
 * wakes them lands on the sitting instead.
 */
export default function Sitting({
  sit,
  now,
  mono,
  count,
  litCount,
  points,
  you,
  labels,
  ownLabel,
  soundMix,
  onSound,
  onSoundOpen,
  onEnd,
  room,
  toggle,
}: {
  sit: Sit;
  now: number | null;
  mono: number;
  count: number | null;
  litCount: number | null;
  points: WorldPoint[];
  you: Cell | null;
  /** Names on the earth right now, from `/api/world`. */
  labels: readonly string[];
  ownLabel: string | null;
  soundMix: Record<string, number>;
  onSound: (patch: MixPatch) => void;
  onSoundOpen: () => void;
  onEnd: () => void;
  room: Room;
  /** The dawn or dusk button, drawn and rested with the other controls. */
  toggle: ReactNode;
}) {
  const [soundOpen, setSoundOpen] = useState(false);
  const [awake, setAwake] = useState(true);
  const [focusInside, setFocusInside] = useState(false);
  const rest = useRef(0);
  const wake = useCallback(() => {
    setAwake(true);
    window.clearTimeout(rest.current);
    rest.current = window.setTimeout(() => setAwake(false), CONTROLS_REST_MS);
  }, []);
  useEffect(() => {
    wake();
    return () => window.clearTimeout(rest.current);
  }, [wake]);
  const shown = awake || soundOpen || focusInside;
  const controls = `transition-opacity duration-500 motion-reduce:transition-none ${
    shown ? 'opacity-100' : 'pointer-events-none opacity-0'
  }`;
  const holdWhileFocused = {
    onFocus: () => setFocusInside(true),
    onBlur: (e: FocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusInside(false);
    },
  };
  const remaining = remainingMs(sit.endsAt, mono);
  const line = sit.withOthers
    ? companyLine(labels, count, litCount, ownLabel, now ?? Date.now())
    : null;

  return (
    <div
      className="relative flex h-dvh w-full flex-col bg-room text-room-ink"
      onPointerDown={wake}
      onKeyDown={wake}
    >
      {toggle && (
        <div
          className={`absolute top-[calc(0.875rem+env(safe-area-inset-top))] left-4 z-10 ${controls}`}
          {...holdWhileFocused}
        >
          {toggle}
        </div>
      )}
      <p
        role="timer"
        aria-label="Time left"
        className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-5 z-10 text-xl tabular-nums text-room-ink-2"
      >
        {mmss(remaining)}
      </p>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 pt-14 pb-4">
        {sit.withOthers ? (
          <>
            {/* The earth has an aspect of its own, a shade over 2:1, so it is
                fitted to whichever runs out first: the frame's width, or the
                height left once the caption and the foot have theirs.

                That allowance is a variable because the sound sheet is part
                of the foot while it is open. Its width is set, so the aspect
                fixes its height and `max-h-full` cannot claw anything back:
                if nothing gave here, a 375×667 phone with the sheet open ran
                about twelve pixels over and the caption's second line went
                under the card. The earth is what gives — it comes straight
                back when the sheet closes. */}
            <div
              style={{ '--earth-foot': soundOpen ? '36rem' : '14rem' } as CSSProperties}
              className="relative aspect-[2.055] max-h-full w-full max-w-[min(100%,calc((100dvh-var(--earth-foot))*2.055))]"
            >
              <WorldMap points={points} you={you} room={room} className="absolute inset-0" />
            </div>
            <p
              // `shrink-0`: the line is two on a phone, and without this it
              // keeps its 24px box and spills the second one.
              className="min-h-6 max-w-md shrink-0 text-center text-[0.9375rem] text-room-ink-2"
              aria-live="polite"
            >
              {line ?? ''}
            </p>
          </>
        ) : (
          <Bowl dim className="w-full max-w-[14rem]" />
        )}
      </div>

      {soundOpen && (
        <div className="mx-auto w-full max-w-md px-4 pb-3">
          {/* In the room's own colours rather than the pale card this was
              until 20 September 2026: it is the same control as the rail's
              Sound step, so it is drawn the same way and read the same way. */}
          <div className="rounded-card border border-room-edge bg-room p-4">
            <Sounds mix={soundMix} onSound={onSound} tight />
          </div>
        </div>
      )}

      <div
        className={`flex justify-center gap-3 px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${controls}`}
        {...holdWhileFocused}
      >
        <button
          type="button"
          onClick={() => {
            if (!soundOpen) onSoundOpen();
            setSoundOpen((v) => !v);
          }}
          aria-expanded={soundOpen}
          className={QUIET_ROOM}
        >
          Sound
        </button>
        <button type="button" onClick={onEnd} className={QUIET_ROOM}>
          End
        </button>
      </div>
    </div>
  );
}
