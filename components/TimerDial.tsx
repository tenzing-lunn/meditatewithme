'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { DIAL_END, DIAL_START, angleOf, clampToArc, stopAngle, stopAt } from '@/lib/dial';
import { FOCUS_ROOM } from './controls';
import { useReducedMotion } from './useReducedMotion';

/** The drawing's own units; the SVG scales to whatever width it is given. */
const SIZE = 280;
const C = SIZE / 2;
const R = 104;
/** A press nearer the centre than this is on the reading, not the ring. */
const INNER = R * 0.55;

/**
 * The spring that settles the knob onto a stop, as a response time in
 * seconds with no bounce — the shape of the system's default spring on
 * Apple's platforms. Critically damped, so it arrives as fast as it can
 * without ever passing the stop and coming back.
 */
const SETTLE_RESPONSE = 0.42;
/** Integration step. Small and fixed, so a slow frame cannot make it unstable. */
const STEP_S = 1 / 240;

function at(angle: number, radius = R) {
  const rad = (angle * Math.PI) / 180;
  return { x: C + radius * Math.sin(rad), y: C - radius * Math.cos(rad) };
}

/**
 * A timer's face: turn it to choose how long.
 *
 * A ring with a stop for every length, the chosen part of it filled in ember
 * from twelve o'clock round to the hand, and a small ember knob that a finger
 * or a pointer drags along the ring. Pressing anywhere on the ring moves the
 * hand there. The centre says the value, large, and is not itself a control.
 * `marked` is one stop drawn larger and in glow, with a word beside it
 * outside the ring — the shared bell. The word is HTML laid over the drawing,
 * not SVG text: SVG text scales with the face, and on a phone that put it
 * under 10px. Under the face, one line says to turn the dial, until it is
 * first turned or stepped by a key.
 *
 * HOW IT MOVES
 * Held, the knob is drawn exactly under the finger, on every move, and the
 * ember fill follows it continuously while the value underneath changes stop
 * by stop — the way a system slider's thumb tracks, one to one. Nothing about
 * following a finger waits for an animation frame, so a drag cannot stall.
 * Let go, a spring carries the knob from where the finger left it onto the
 * nearest stop. A key moves the value one stop and the spring glides the
 * knob there the same way. The knob swells a little while held, so the grip
 * is felt. Under reduced motion there is no spring and no swell.
 *
 * EVERY MOVE STARTS A FRESH LOOP
 * The frame loop runs only while the spring is moving. `run` cancels whatever
 * loop there is and starts a new one every time the target moves; it never
 * asks whether one is already running. It used to, by keeping the request id,
 * and that id went stale: React mounts effects twice in development and Fast
 * Refresh keeps refs across an edit, so a cancelled id survived, every later
 * `run` believed the loop was going, and the knob sat still under a drag.
 *
 * Which stop an angle means lives in `lib/dial.ts`, tested. `touch-action:
 * none` on the drawing is what keeps a drag on a phone from scrolling the
 * page instead; the rail never scrolls, but Safari would still try.
 *
 * It is a `role="slider"`: arrows move a stop, Home and End go to the ends,
 * and `aria-valuetext` says the length in words.
 */
export default function TimerDial({
  count,
  index,
  marked,
  markLabel,
  onChange,
  label,
  valueText,
  centre,
}: {
  count: number;
  index: number;
  /** A stop to draw as special, or -1. */
  marked: number;
  markLabel: string;
  onChange: (index: number) => void;
  label: string;
  valueText: string;
  centre: ReactNode;
}) {
  const reduced = useReducedMotion();
  const svgRef = useRef<SVGSVGElement | null>(null);
  // The value as it was last moved, so a drag reads the stop it just set
  // rather than the one from a render ago.
  const indexRef = useRef(index);
  indexRef.current = index;

  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);
  // Once the dial has been turned, the hint has done its job and goes.
  const [touched, setTouched] = useState(false);

  // The spring. Its state is in refs and stepped in a frame loop; only the
  // angle it has reached is state, because only that is drawn.
  const [angle, setAngle] = useState(() => stopAngle(index, count));
  const position = useRef(angle);
  const velocity = useRef(0);
  const target = useRef(angle);
  const response = useRef(SETTLE_RESPONSE);
  const frame = useRef(0);

  const run = useCallback(() => {
    // Always a fresh loop, never "is one already running?" — see the note
    // at the top of this component.
    cancelAnimationFrame(frame.current);
    let last = performance.now();
    let carry = 0;
    const tick = (now: number) => {
      carry += Math.min(Math.max(0, now - last) / 1000, 0.1);
      last = now;
      const w = (2 * Math.PI) / response.current;
      while (carry >= STEP_S) {
        const pull = -w * w * (position.current - target.current) - 2 * w * velocity.current;
        velocity.current += pull * STEP_S;
        position.current += velocity.current * STEP_S;
        carry -= STEP_S;
      }
      const resting =
        Math.abs(position.current - target.current) < 0.05 && Math.abs(velocity.current) < 0.5;
      if (resting) {
        position.current = target.current;
        velocity.current = 0;
        frame.current = 0;
      } else {
        frame.current = requestAnimationFrame(tick);
      }
      setAngle(position.current);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);

  const aim = useCallback(
    (to: number, seconds: number) => {
      target.current = to;
      response.current = seconds;
      if (reduced) {
        position.current = to;
        velocity.current = 0;
        setAngle(to);
        return;
      }
      run();
    },
    [reduced, run],
  );

  // A value set from outside the finger — a key, a stored preference, the
  // bell moving as the clock passes a stop — is settled onto.
  useEffect(() => {
    if (!heldRef.current) aim(stopAngle(index, count), SETTLE_RESPONSE);
  }, [index, count, aim]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );

  const offset = (e: PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return null;
    return {
      dx: ((e.clientX - box.left) / box.width) * SIZE - C,
      dy: ((e.clientY - box.top) / box.height) * SIZE - C,
    };
  };

  const follow = (e: PointerEvent<SVGSVGElement>) => {
    const o = offset(e);
    if (!o) return;
    const raw = angleOf(o.dx, o.dy);
    // Straight to the finger: no spring and no frame loop between them.
    const to = clampToArc(raw, position.current);
    cancelAnimationFrame(frame.current);
    position.current = to;
    target.current = to;
    velocity.current = 0;
    setAngle(to);
    const next = stopAt(raw, count, indexRef.current);
    if (next !== indexRef.current) {
      indexRef.current = next;
      onChange(next);
    }
  };

  const release = () => {
    if (!heldRef.current) return;
    heldRef.current = false;
    setHeld(false);
    aim(stopAngle(indexRef.current, count), SETTLE_RESPONSE);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = index + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else return;
    e.preventDefault();
    setTouched(true);
    next = Math.min(count - 1, Math.max(0, next));
    if (next !== index) onChange(next);
  };

  const start = at(DIAL_START);
  const end = at(DIAL_END);
  const hand = at(angle);
  const markAt = marked >= 0 ? at(stopAngle(marked, count), R + 26) : null;

  return (
    <div className="flex flex-col items-center">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={index}
        aria-valuetext={valueText}
        onKeyDown={onKeyDown}
        className={`relative aspect-square w-full rounded-full ${FOCUS_ROOM}`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block size-full cursor-pointer touch-none select-none"
          aria-hidden
          onPointerDown={(e) => {
            const o = offset(e);
            if (!o || Math.hypot(o.dx, o.dy) < INNER) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            heldRef.current = true;
            setHeld(true);
            setTouched(true);
            follow(e);
          }}
          onPointerMove={(e) => {
            if (heldRef.current) follow(e);
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          <path
            d={`M ${start.x} ${start.y} A ${R} ${R} 0 1 1 ${end.x} ${end.y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={14}
            strokeLinecap="round"
            className="text-room-ink-2/25"
          />
          {angle - DIAL_START > 0.5 && (
            <path
              d={`M ${start.x} ${start.y} A ${R} ${R} 0 ${angle - DIAL_START > 180 ? 1 : 0} 1 ${hand.x} ${hand.y}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={14}
              strokeLinecap="round"
              className="text-room-action"
            />
          )}
          {Array.from({ length: count }, (_, i) => {
            const a = stopAngle(i, count);
            const p = at(a);
            const isMark = i === marked;
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={isMark ? 5 : 2.25}
                fill="currentColor"
                className={isMark ? 'text-glow' : a < angle - 1 ? 'text-room/70' : 'text-room-ink-2/50'}
              />
            );
          })}
          <g
            transform={`translate(${hand.x} ${hand.y})`}
          >
            <g
              className={`transition-transform duration-200 ease-out motion-reduce:transition-none ${
                held ? 'scale-[1.15]' : 'scale-100'
              }`}
            >
              <circle r={14} fill="currentColor" className="text-room-action" />
              <circle r={14} fill="none" stroke="currentColor" strokeWidth={3.5} className="text-room" />
            </g>
          </g>
        </svg>
        {markAt && (
          <span
            aria-hidden
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[0.8125rem] text-room-ink-2"
            style={{ left: `${(markAt.x / SIZE) * 100}%`, top: `${(markAt.y / SIZE) * 100}%` }}
          >
            {markLabel}
          </span>
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centre}
        </div>
      </div>
      <p
        aria-hidden
        className={`mt-3 text-[0.8125rem] text-room-ink-2 transition-opacity duration-200 motion-reduce:transition-none ${
          touched ? 'opacity-0' : ''
        }`}
      >
        Turn the dial
      </p>
    </div>
  );
}
