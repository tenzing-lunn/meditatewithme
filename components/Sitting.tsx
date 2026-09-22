'use client';

import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
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
 * Sound opens the six tiles and their Volume in a sheet over the foot of the
 * earth — the same control as the rail's Sound step; the caller raises the
 * master when it opens, since a first-timer's graph was built silent. The
 * sheet lies over the earth rather than beside it, so the earth never
 * shrinks to make room. Escape closes it and puts the keyboard back on
 * *Sound*; a tap anywhere outside it closes it and leaves the tap where it
 * landed. While it is open the earth holds its last frame.
 *
 * THE CONTROLS REST
 * Sound, End, the dawn or dusk toggle and the clock are there when the
 * sitting begins and fade after a few seconds of stillness, leaving the
 * earth, or the bowl. Any tap or key brings them back. They stay while the
 * sound sheet is open and while focus is inside them, so a keyboard never
 * tabs onto something it cannot see; resting, they cannot be pressed, and
 * the tap that wakes them lands on the sitting instead.
 *
 * ENDED
 * With `ended` the bell has rung and this is the held beat before the
 * minutes: the clock is gone, the controls are rested for good and cannot
 * be woken or reached, the sound sheet is closed, and *Come back.* sits
 * over the earth — or the bowl — while the tail rings out. The company
 * line stays: whoever was here at the bell is who you finished with.
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
  ended = false,
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
  /** The bell has rung: the held beat, before the minutes. */
  ended?: boolean;
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

  // Where each bed was when it was last silenced. Held here rather than in
  // `Sounds` because the sheet unmounts when it closes, and with it went the
  // memory: Silence, close, reopen, and Rain came back at the audition level
  // instead of where it had been.
  const remembered = useRef<Record<string, number>>({});
  const foot = useRef<HTMLDivElement | null>(null);
  const sheet = useRef<HTMLDivElement | null>(null);
  const soundButton = useRef<HTMLButtonElement | null>(null);

  // Open: the keyboard goes to the first tile. Escape closes and puts it
  // back on *Sound*, since the tile it was on is about to unmount and
  // without this the next Tab would start the page over. A press outside
  // closes too, without moving focus: whoever tapped elsewhere has already
  // put their attention there.
  useEffect(() => {
    if (!soundOpen) return;
    sheet.current?.querySelector('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      soundButton.current?.focus();
      setSoundOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!foot.current?.contains(e.target as Node)) setSoundOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [soundOpen]);

  // The bell may ring with the sheet open; it goes with the controls.
  useEffect(() => {
    if (ended) setSoundOpen(false);
  }, [ended]);

  const shown = !ended && (awake || soundOpen || focusInside);
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
          inert={ended}
          {...holdWhileFocused}
        >
          {toggle}
        </div>
      )}
      {!ended && (
        <p
          role="timer"
          aria-label="Time left"
          className={`absolute top-[calc(1rem+env(safe-area-inset-top))] right-5 z-10 text-xl tabular-nums text-room-ink-2 ${controls}`}
        >
          {mmss(remaining)}
        </p>
      )}
      {ended && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          role="status"
          aria-label="Coming back"
        >
          <p className="font-display text-[2.25rem] font-bold leading-none sm:text-[3rem]">
            Come back.
          </p>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 pt-14 pb-4">
        {sit.withOthers ? (
          <>
            {/* The earth has an aspect of its own, a shade over 2:1, so it is
                fitted to whichever runs out first: the frame's width, or the
                height left once the caption and the foot have theirs — 14rem,
                and the same 14rem while the sound sheet is open, because the
                sheet lies over the earth rather than in the foot. Until 22
                September 2026 it was in the foot and the earth gave it the
                room, dropping to half its size every time Sound was pressed. */}
            <div className="relative aspect-[2.055] max-h-full w-full max-w-[min(100%,calc((100dvh-14rem)*2.055))]">
              <WorldMap
                points={points}
                you={you}
                room={room}
                paused={soundOpen}
                className="absolute inset-0"
              />
            </div>
            <p
              // `shrink-0`: the line is two on a phone, and without this it
              // keeps its 24px box and spills the second one. Not a live
              // region: the names turn every twenty seconds for the whole
              // sitting, and a screen reader that announced each turn would
              // never let the person sit.
              className="min-h-6 max-w-md shrink-0 text-center text-[0.9375rem] text-room-ink-2"
            >
              {line ?? ''}
            </p>
          </>
        ) : (
          <Bowl dim className="w-full max-w-[14rem]" />
        )}
      </div>

      <div
        ref={foot}
        className={`relative flex justify-center gap-3 px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${controls}`}
        inert={ended}
        {...holdWhileFocused}
      >
        {soundOpen && (
          // Over the earth, not under it: absolute against this row, so it
          // sits above Sound and End and never enters the layout.
          <div ref={sheet} className="absolute inset-x-0 bottom-full mx-auto w-full max-w-md px-4 pb-3">
            {/* In the room's own colours rather than the pale card this was
                until 20 September 2026: it is the same control as the rail's
                Sound step, so it is drawn the same way and read the same way.
                At 90% so the earth it covers is still there behind it. */}
            <div className="rounded-card border border-room-edge bg-room/90 p-4">
              <Sounds mix={soundMix} onSound={onSound} remembered={remembered} tight />
            </div>
          </div>
        )}
        <button
          ref={soundButton}
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
