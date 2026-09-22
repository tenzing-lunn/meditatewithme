'use client';

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { clampHeight, minutesAtHeight, waxHeight } from '@/lib/candle';
import {
  TIMER_MAX_MINUTES,
  TIMER_MIN_MINUTES,
  TIMER_STOPS,
  timerStopIndex,
} from '@/lib/timer';
import { FlameMark } from './FlameMark';
import { FOCUS_ROOM } from './controls';
import { useReducedMotion } from './useReducedMotion';

/** More lights than this and the sentence carries the number alone. */
const MAX_LIGHTS = 36;
/** How a let-go rim, or a key's step, settles onto a length. */
const SETTLE = '460ms var(--ease-rail)';

const frac = (n: number) => n - Math.floor(n);

/**
 * Where the i-th far light sits, how large, and how it breathes. From the
 * index alone, so a light keeps its place while the count around it changes;
 * the golden-ratio steps spread any number of them without clumping. Kept to
 * the two sides of the stage, clear of the candle and its reading.
 */
function light(i: number) {
  const u = frac(i * 0.618034 + 0.13);
  const v = frac(i * 0.754878 + 0.41);
  const w = frac(i * 0.381966 + 0.7);
  return {
    left: i % 2 === 0 ? 4 + u * 24 : 80 + u * 15,
    top: 6 + v * 72,
    size: 6 + w * 6,
    breathe: 3.4 + w * 3.6,
    phase: v * 6,
  };
}

/**
 * A candle whose height is the length of the sit.
 *
 * A cream candle on the room's ground, its flame lit, burning down: a taller
 * candle is a longer sit, and dragging it up or down (anywhere on the stage,
 * like a slider's track) is choosing how long. Beside the rim, the minutes
 * ride up and down with it, over a faint tick for every stop.
 *
 * Around it, far off on either side, a small light for every other person
 * on the page right now, each breathing on its own. They stand for the
 * count and nothing else: where a light sits is decoration, not where
 * anybody is, and nobody is named. More arrive and fade in; the count falls
 * and they go.
 *
 * HOW IT MOVES
 * Held, the rim follows the finger exactly, from wherever it was grabbed, so
 * pressing the middle of the wax does not make the candle jump; the length
 * underneath changes stop by stop as it passes them. Let go, the rim settles
 * onto the nearest stop with the rail's own ease. The flame flickers, its
 * glow breathes, and the drips slowly lengthen. Under reduced motion none of
 * it moves on its own and the rim goes straight to its stop.
 *
 * It is a `role="slider"` over minutes: arrows step a stop, Home and End go
 * to the ends. `touch-action: none` keeps a phone from treating the drag as
 * a scroll.
 */
export default function Candle({
  minutes,
  onChange,
  others,
  label,
  valueText,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
  /** People on the page besides you. */
  others: number;
  label: string;
  valueText: string;
}) {
  const reduced = useReducedMotion();
  const track = useRef<HTMLDivElement | null>(null);
  // The length as last moved, so a drag reads the stop it just set rather
  // than the one from a render ago.
  const minutesRef = useRef(minutes);
  minutesRef.current = minutes;

  const grab = useRef<{ pointer: number; from: number } | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  // Once the candle has been moved, the hint has done its job and stops.
  const [touched, setTouched] = useState(false);

  const height = dragged ?? waxHeight(minutes);
  const motion = dragged !== null || reduced ? 'none' : `height ${SETTLE}`;

  const pointerHeight = (e: PointerEvent<HTMLDivElement>) => {
    const box = track.current?.getBoundingClientRect();
    if (!box || box.height === 0) return null;
    return (box.bottom - e.clientY) / box.height;
  };

  const follow = (e: PointerEvent<HTMLDivElement>) => {
    const at = pointerHeight(e);
    if (at === null || !grab.current) return;
    const h = clampHeight(grab.current.from + at - grab.current.pointer);
    setDragged(h);
    const next = minutesAtHeight(h);
    if (next !== minutesRef.current) {
      minutesRef.current = next;
      onChange(next);
    }
  };

  const release = () => {
    if (!grab.current) return;
    grab.current = null;
    setDragged(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = timerStopIndex(minutes);
    let next: number;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = i + 1;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TIMER_STOPS.length - 1;
    else return;
    e.preventDefault();
    setTouched(true);
    const m = TIMER_STOPS[Math.min(TIMER_STOPS.length - 1, Math.max(0, next))]!;
    if (m !== minutes) onChange(m);
  };

  const lights = Math.min(Math.max(0, others), MAX_LIGHTS);

  return (
    <div className="flex flex-col items-center">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemin={TIMER_MIN_MINUTES}
        aria-valuemax={TIMER_MAX_MINUTES}
        aria-valuenow={minutes}
        aria-valuetext={valueText}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          const at = pointerHeight(e);
          if (at === null) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          grab.current = { pointer: at, from: height };
        setTouched(true);
        }}
        onPointerMove={(e) => {
          if (grab.current) follow(e);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        className={`relative h-[clamp(15rem,40vh,24rem)] w-full cursor-grab touch-none overflow-hidden rounded-card select-none active:cursor-grabbing md:h-[min(62vh,32rem)] ${FOCUS_ROOM}`}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: lights }, (_, i) => {
            const l = light(i);
            return (
              <span
                key={i}
                className="candle-light-in absolute"
                style={{ left: `${l.left}%`, top: `${l.top}%`, '--i': i } as CSSProperties}
              >
                <span
                  className="candle-light block rounded-full"
                  style={{
                    width: l.size,
                    height: l.size,
                    animationDuration: `${l.breathe}s`,
                    animationDelay: `-${l.phase}s`,
                  }}
                />
              </span>
            );
          })}
        </div>

        <span
          aria-hidden
          className="pointer-events-none absolute bottom-6 left-1/2 h-3.5 w-28 -translate-x-1/2 rounded-[50%] bg-room-ink-2/20"
        />

        <div
          ref={track}
          aria-hidden
          className="pointer-events-none absolute top-[5.5rem] bottom-8 left-1/2 w-14 -translate-x-1/2 md:w-16"
        >
          {TIMER_STOPS.map((m) => (
            <span
              key={m}
              className={`absolute left-full ml-2.5 h-0.5 w-2 translate-y-1/2 rounded-full ${
                m === minutes ? 'bg-room-action' : 'bg-room-ink-2/30'
              }`}
              style={{ bottom: `${waxHeight(m) * 100}%` }}
            />
          ))}

          <div className="absolute inset-x-0 bottom-0" style={{ height: `${height * 100}%`, transition: motion }}>
            <div className="absolute bottom-full left-1/2 flex -translate-x-1/2 flex-col items-center">
              <span className="candle-glow absolute top-1/3 left-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full" />
              <span className="candle-flame relative block origin-bottom">
                <FlameMark size={44} />
              </span>
              <span className="relative -mt-1 block h-2.5 w-0.5 rounded-full bg-ink" />
            </div>

            <div className="absolute inset-0 overflow-hidden rounded-t-[0.625rem] rounded-b-md ring-1 ring-room-ink-2/20 bg-[linear-gradient(90deg,var(--color-dusk-ink-2),var(--color-dusk-ink)_42%,var(--color-dusk-ink-2))]">
              <span className="candle-warmth absolute inset-x-0 top-0 h-16" />
              <span className="absolute inset-x-1.5 top-1 h-2 rounded-[50%] bg-dusk-ink-2/80" />
            </div>
            <span className="candle-drip absolute top-2 -left-px h-9 w-2 origin-top rounded-b-full bg-dusk-ink" />
            <span className="candle-drip absolute top-2 right-2 h-5 w-1.5 origin-top rounded-b-full bg-dusk-ink [animation-delay:-3.5s]" />

            <div className="absolute top-0 left-full ml-6 -translate-y-1/2 whitespace-nowrap">
              <span className="font-display text-masthead font-bold text-room-action tabular-nums">{minutes}</span>
              <span className="ml-1 text-caption text-room-ink-2">min</span>
            </div>
          </div>
        </div>
      </div>
      <p
        aria-hidden
        className={`mt-3 flex items-center gap-2 text-caption text-room-ink-2 ${
          touched ? '' : 'candle-hint'
        }`}
      >
        {/* A laptop: an arrow nudging up at the candle. */}
        <svg viewBox="0 0 16 16" fill="none" className="candle-hint-nudge size-4 text-room-action pointer-coarse:hidden">
          <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* A phone: a fingertip sliding up a short track. */}
        <span className="relative hidden h-5 w-2 pointer-coarse:block">
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-room-ink-2/30" />
          <span className="candle-hint-swipe absolute bottom-0 left-0 size-2 rounded-full bg-room-action" />
        </span>
        <span className="pointer-coarse:hidden">Drag the candle up or down</span>
        <span className="hidden pointer-coarse:inline">Slide the candle up or down</span>
      </p>
    </div>
  );
}
