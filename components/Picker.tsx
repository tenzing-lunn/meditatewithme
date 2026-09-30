'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { FOCUS, PRIMARY_SM } from './controls';
import { useReducedMotion } from './useReducedMotion';

/**
 * One phrase of the arrival's sentence, chosen on a wheel in the middle of
 * the screen.
 *
 * Tap a phrase and the water goes pale behind this; the choices stand in a
 * column that scrolls with the phone's own scrolling (momentum, and a snap
 * to each row), the middle row between two hairlines. Tap the middle row or
 * Done to take it; tap a faint row and it comes to the middle; tap outside,
 * or Escape, and nothing changes. The wheel is what shows there is a choice
 * at all: the neighbours are in view, faint, above and below.
 *
 * A row that makes a sound carries a play button on the right while it is
 * in the middle: a few seconds of it, then the button again. Moving to
 * another row stops it. Nothing is written until the choice is taken.
 */

export interface PickerOption {
  value: string;
  label: string;
  /** Has a play button: a bell, or a bed that is not silence. */
  audible?: boolean;
}

const ROW = 52;
const VISIBLE = 5;

export default function Picker({
  title,
  options,
  value,
  onConfirm,
  onCancel,
  onPlay,
  onStop,
  playMs = 6500,
}: {
  title: string;
  options: readonly PickerOption[];
  value: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  onPlay?: (value: string) => void;
  onStop?: () => void;
  /** How long a taste lasts, so the button comes back when it has gone quiet. */
  playMs?: number;
}) {
  const reduced = useReducedMotion();
  const wheel = useRef<HTMLDivElement | null>(null);
  const start = Math.max(0, options.findIndex((o) => o.value === value));
  const [cur, setCur] = useState(start);
  const [playing, setPlaying] = useState<string | null>(null);
  const playTimer = useRef(0);

  // Opened on the current choice, before the first paint so it never scrolls there.
  useLayoutEffect(() => {
    if (wheel.current) wheel.current.scrollTop = start * ROW;
    wheel.current?.focus({ preventScroll: true });
    // Only ever on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = () => {
    window.clearTimeout(playTimer.current);
    if (playingRef.current !== null) onStop?.();
    playingRef.current = null;
    setPlaying(null);
  };

  // Closing stops it too, whichever way it closes.
  const stopRef = useRef(onStop);
  stopRef.current = onStop;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  useEffect(
    () => () => {
      window.clearTimeout(playTimer.current);
      if (playingRef.current !== null) stopRef.current?.();
    },
    [],
  );

  const goTo = (i: number) => {
    const j = Math.max(0, Math.min(options.length - 1, i));
    if (j !== cur) stop();
    wheel.current?.scrollTo({ top: j * ROW, behavior: reduced ? 'auto' : 'smooth' });
  };

  const take = () => onConfirm(options[cur]!.value);

  const play = () => {
    const o = options[cur]!;
    if (playing === o.value) {
      stop();
      return;
    }
    window.clearTimeout(playTimer.current);
    onPlay?.(o.value);
    playingRef.current = o.value;
    setPlaying(o.value);
    playTimer.current = window.setTimeout(stop, playMs);
  };

  const centre = options[cur];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="screen-settle absolute inset-0 z-40 flex flex-col items-center justify-center bg-paper/95 px-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <p className="mb-3 text-caption text-ink-3">{title}</p>
      <div className="relative w-full max-w-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 border-y border-rule"
          style={{ height: ROW }}
        />
        <div
          ref={wheel}
          role="listbox"
          aria-label={title}
          aria-activedescendant={`pick-${cur}`}
          tabIndex={0}
          onScroll={(e) => {
            const i = Math.round(e.currentTarget.scrollTop / ROW);
            if (i !== cur && i >= 0 && i < options.length) {
              stop();
              setCur(i);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') goTo(cur + 1);
            else if (e.key === 'ArrowUp') goTo(cur - 1);
            else if (e.key === 'Enter' || e.key === ' ') take();
            else if (e.key === 'Escape') onCancel();
            else return;
            e.preventDefault();
          }}
          className="snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-card font-display outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:ring-2 focus-visible:ring-ember"
          style={{
            height: ROW * VISIBLE,
            paddingBlock: ROW * 2,
            maskImage: 'linear-gradient(transparent, #000 30%, #000 70%, transparent)',
            WebkitMaskImage: 'linear-gradient(transparent, #000 30%, #000 70%, transparent)',
          }}
        >
          {options.map((o, j) => {
            const d = Math.abs(j - cur);
            return (
              <div
                key={o.value}
                id={`pick-${j}`}
                role="option"
                aria-selected={j === cur}
                onClick={() => (j === cur ? take() : goTo(j))}
                className={`flex snap-center items-center justify-center px-16 text-center text-answer transition-[color,opacity] duration-200 motion-reduce:transition-none sm:text-answer-sm ${
                  j === cur ? 'text-ink' : 'text-ink-3'
                }`}
                style={{ height: ROW, opacity: d === 0 ? 1 : Math.max(0.3, 1 - d * 0.3), cursor: 'pointer' }}
              >
                <span className="truncate">{o.label}</span>
              </div>
            );
          })}
        </div>
        {centre?.audible && onPlay && (
          <button
            type="button"
            onClick={play}
            aria-label={playing === centre.value ? `Stop ${centre.label}` : `Play ${centre.label}`}
            className={`absolute top-1/2 right-7 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-surface text-ink transition-colors duration-200 motion-reduce:transition-none ${FOCUS}`}
          >
            {playing === centre.value ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M3 1.8v8.4a.6.6 0 0 0 .9.5l7-4.2a.6.6 0 0 0 0-1l-7-4.2a.6.6 0 0 0-.9.5z" fill="currentColor" />
              </svg>
            )}
          </button>
        )}
      </div>
      <button type="button" onClick={take} className={`mt-6 ${PRIMARY_SM}`}>
        Done
      </button>
    </div>
  );
}
