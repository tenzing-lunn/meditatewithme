'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { PRIMARY_SM, WORD } from './controls';
import { useReducedMotion } from './useReducedMotion';
import { START_MS, typingMs } from './useTypedOut';

/** A beat after the last letter, so the skip reads as following it. */
const AFTER_MS = 120;

/**
 * The way on from a typed answer, under its line: the skip under the left
 * end, and *Next* under the right end once something is typed. The name and
 * the origin both use it, so the two sit in the same places.
 *
 * Next is on the right because that is where it is on every question's
 * foot, where the eye ends a line, and where a right thumb reaches on a
 * phone; the skip is the quiet word the eye passes first and the hand does
 * not have to stretch past.
 *
 * THE SKIP COMES LAST
 * When the screen arrives the line draws and the prompt types itself on it;
 * the skip settles in only once that has finished. A way out that is there
 * before the question has finished being asked answers it for you. Under
 * reduced motion there is no typing to wait for and it is simply there.
 * Until it is there it is `inert`: the animation holds it invisible through
 * its delay, and a button that can be tabbed to while invisible is a way out
 * nobody was shown.
 *
 * It hangs below the line out of the flow, with whatever else belongs under
 * the answer (the origin's share switch) below it, so the line stays where
 * the screen put it and nothing moves when Next arrives: the row is already
 * the skip's height before there is a Next beside it.
 *
 * Next is always in the row, out of sight and `inert` until something is
 * typed, and comes up as a transition rather than a mount: a letter typed
 * and deleted moves it, where remounting it restarted its arrival on every
 * flip. It is a submit button, so it goes through the form's own submit,
 * the same as Enter.
 */
export default function LineActions({
  typed,
  active,
  prompt,
  onSkip,
  children,
}: {
  /** Something is on the line: show Next. */
  typed: boolean;
  /** The screen is in the frame: play the skip's arrival. */
  active: boolean;
  /** The line's prompt, whose typing the skip waits for. */
  prompt: string;
  onSkip: () => void;
  /** Under the row. */
  children?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const wait = reduced ? 0 : START_MS + typingMs(prompt) + AFTER_MS;
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!active) {
      setSettled(false);
      return;
    }
    const t = window.setTimeout(() => setSettled(true), wait);
    return () => window.clearTimeout(t);
  }, [active, wait]);

  return (
    <div className="absolute inset-x-0 top-full mt-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSkip}
          inert={!settled}
          className={`${active ? 'screen-settle' : ''} -ml-2 ${WORD}`}
          style={active ? ({ animationDelay: `${wait}ms` } as CSSProperties) : undefined}
        >
          Skip
        </button>
        <div
          inert={!typed}
          className={`transition-[opacity,translate] duration-[var(--settle-ms)] ease-[var(--ease-rail)] motion-reduce:transition-none ${
            typed ? '' : 'translate-y-3 opacity-0'
          }`}
        >
          <button type="submit" className={PRIMARY_SM}>
            Next
          </button>
        </div>
      </div>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
