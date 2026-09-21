'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/** As the rail brings the screen in; the line starts drawing at the same moment. */
export const START_MS = 200;
const CHAR_MS = 55;
/** A beat after each word, the way a person types. */
const SPACE_MS = 45;

/** From the first letter to the last, so a line drawn alongside ends with it. */
export function typingMs(text: string): number {
  let ms = 0;
  for (let i = 1; i < text.length; i += 1) {
    ms += CHAR_MS + (text[i - 1] === ' ' ? SPACE_MS : 0);
  }
  return ms;
}

/**
 * A prompt typing itself out, once each time its screen arrives.
 *
 * It is a placeholder that shows where the words go by writing some there
 * first. It runs on arrival and not on every empty field, so clearing what
 * you typed brings the whole prompt back rather than a second performance.
 * Under reduced motion the text is simply there.
 */
export function useTypedOut(text: string, run: boolean): string {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!run || reduced) return;
    setShown(0);
    let i = 0;
    let timer = 0;
    const tick = () => {
      i += 1;
      setShown(i);
      if (i < text.length) {
        timer = window.setTimeout(tick, CHAR_MS + (text[i - 1] === ' ' ? SPACE_MS : 0));
      }
    };
    timer = window.setTimeout(tick, START_MS);
    return () => window.clearTimeout(timer);
  }, [text, run, reduced]);

  return reduced ? text : text.slice(0, shown);
}
