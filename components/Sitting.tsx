'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
} from 'react';
import { companyLine } from '@/lib/company';
import { localTime } from '@/lib/format';
import { mmss, remainingMs } from '@/lib/timer';
import Brand from './Brand';
import { WORD } from './controls';
import Sounds, { type MixPatch } from './Sounds';

/** Stillness, in ms, before Sound and End rest. */
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
  /** Chose the door marked With others: the other stones are shown. */
  withOthers: boolean;
}

/**
 * The sitting.
 *
 * Pale water (22 September 2026): the pond is drawn underneath by
 * `Journey`, so this is only what lies on it. With others, their stones and
 * one sentence about who is here; by yourself, your own rings alone. The mark
 * is faint in the corner and the clock small beside it, because the water is
 * the thing. When someone is on camera `Journey` frames them on the water
 * (`LiveLayer`); between two of them the line says when the next starts.
 *
 * Sound opens the six tiles and their Volume in a sheet above the foot; the
 * caller raises the master when it opens, since a first-timer's graph was
 * built silent. Escape closes it and puts the keyboard back on *Sound*; a tap
 * anywhere outside it closes it and leaves the tap where it landed.
 *
 * THE CONTROLS REST
 * Sound, End, the mark and the clock are there when the
 * sitting begins and fade after a few seconds of stillness, leaving the
 * water. Any tap or key brings them back. They stay while the
 * sound sheet is open and while focus is inside them, so a keyboard never
 * tabs onto something it cannot see; resting, they cannot be pressed, and
 * the tap that wakes them lands on the sitting instead.
 *
 * ENDED
 * With `ended` the bell has rung and this is the held beat before the
 * minutes: the clock is gone, the controls are rested for good and cannot
 * be woken or reached, the sound sheet is closed, and *Come back.* sits
 * over the water while the tail rings out. The company
 * line stays: whoever was here at the bell is who you finished with.
 */
export default function Sitting({
  sit,
  now,
  mono,
  count,
  litCount,
  labels,
  ownLabel,
  soundMix,
  onSound,
  onSoundOpen,
  onEnd,
  ended = false,
  nextSession = null,
}: {
  sit: Sit;
  now: number | null;
  mono: number;
  count: number | null;
  litCount: number | null;
  /** Names on the water right now, from `/api/world`. */
  labels: readonly string[];
  ownLabel: string | null;
  soundMix: Record<string, number>;
  onSound: (patch: MixPatch) => void;
  onSoundOpen: () => void;
  onEnd: () => void;
  /** The bell has rung: the held beat, before the minutes. */
  ended?: boolean;
  /** Between two people on camera: when the next goes on, ms. */
  nextSession?: number | null;
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
  // Between two people on camera, that is what the line says; otherwise
  // it is who is here.
  const line = !sit.withOthers
    ? null
    : nextSession !== null && !ended
      ? `The next session starts at ${localTime(nextSession)}.`
      : companyLine(labels, count, litCount, ownLabel, now ?? Date.now());

  // Over the pond, which `Journey` draws underneath: nothing here has a
  // ground of its own, so the water shows through everywhere.
  return (
    <div
      className="relative flex h-dvh w-full flex-col text-ink"
      onPointerDown={wake}
      onKeyDown={wake}
    >
      <div className={`flex items-center justify-between px-6 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-14 lg:px-24 ${controls}`}>
        <Brand word={false} />
        {!ended && (
          <p role="timer" aria-label="Time left" className="text-caption tabular-nums text-ink-3">
            {mmss(remaining)}
          </p>
        )}
      </div>
      {ended && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center pb-[22dvh]"
          role="status"
          aria-label="Coming back"
        >
          <p className="font-display text-question leading-none text-ink sm:text-question-lg">
            Come back.
          </p>
        </div>
      )}
      <div className="flex-1" />
      <div
        ref={foot}
        className="relative flex flex-col items-center gap-2 px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-end sm:px-14 lg:px-24"
      >
        {soundOpen && (
          <div ref={sheet} className="absolute inset-x-0 bottom-full mx-auto w-full max-w-md px-4 pb-3 sm:right-10 sm:left-auto">
            <div className="rounded-card border border-rule bg-surface/90 p-4 shadow-menu">
              <Sounds mix={soundMix} onSound={onSound} tight />
            </div>
          </div>
        )}
        <p className="min-h-6 max-w-md text-center text-body text-balance text-ink-2 sm:flex-1 sm:max-w-none">
          {line ?? ''}
        </p>
        <div
          className={`flex gap-6 sm:absolute sm:right-14 sm:bottom-[calc(0.75rem+env(safe-area-inset-bottom))] lg:right-24 ${controls}`}
          inert={ended}
          {...holdWhileFocused}
        >
          <button
            ref={soundButton}
            type="button"
            onClick={() => {
              if (!soundOpen) onSoundOpen();
              setSoundOpen((v) => !v);
            }}
            aria-expanded={soundOpen}
            className={WORD}
          >
            Sound
          </button>
          <button type="button" onClick={onEnd} className={WORD}>
            End
          </button>
        </div>
      </div>
    </div>
  );

}
