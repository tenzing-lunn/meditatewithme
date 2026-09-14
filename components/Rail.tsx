'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Screen } from '@/lib/journey';

/**
 * The screens, side by side, and the frame that shows one of them.
 *
 * Every screen of the journey is mounted on one track; the track slides so
 * the current one is in the frame. Moving on is moving right, going back is
 * moving left, and the eye keeps its place: the question you answered is
 * still there, just off to the side, which is what makes the questions read
 * as a sequence rather than as panels appearing.
 *
 * Only the current screen is in the tab order or read out. The others are
 * `inert` and hidden from assistive technology the moment they leave, and
 * `visibility: hidden` once the slide has finished, so nothing can be
 * scrolled or focused into from off-screen. Focus goes to the new screen's
 * heading, so a keyboard walks the rail from the top of each question.
 *
 * Under reduced motion `--rail-ms` is zero and the track jumps.
 *
 * `overflow-clip`, not `overflow-hidden`. A hidden overflow can still be
 * scrolled by the browser itself: focusing a field while the track is
 * mid-slide scrolled the frame a whole screen sideways to bring the field
 * into view, and left the next screen's hidden panel in the frame. Clip
 * cannot be scrolled by anything.
 */
export default function Rail({
  screens,
  at,
  render,
}: {
  screens: readonly Screen[];
  at: Screen;
  render: (screen: Screen, current: boolean) => ReactNode;
}) {
  const index = Math.max(0, screens.indexOf(at));

  // The screen that was current when the slide began. Both it and the new
  // one stay visible until the track has settled, then only the new one.
  const [settled, setSettled] = useState(index);

  useEffect(() => {
    // A fallback for the case where `transitionend` never fires: a zero
    // duration under reduced motion, or a tab that was hidden mid-slide.
    const t = window.setTimeout(() => setSettled(index), 800);
    return () => window.clearTimeout(t);
  }, [index]);

  useEffect(() => {
    const heading = document.querySelector<HTMLElement>(
      `[data-screen="${at}"] h2`,
    );
    heading?.focus({ preventScroll: true });
  }, [at]);

  return (
    <div className="h-dvh w-full overflow-clip">
      <div
        className="flex h-full w-full"
        style={{
          transform: `translateX(${-index * 100}%)`,
          transition: 'transform var(--rail-ms) var(--ease-rail)',
        }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && e.propertyName === 'transform') {
            setSettled(index);
          }
        }}
      >
        {screens.map((screen, i) => {
          const current = i === index;
          const shown = current || i === settled;
          return (
            <div
              key={screen}
              data-screen={screen}
              className="h-full w-full shrink-0"
              inert={!current}
              aria-hidden={!current}
              style={{ visibility: shown ? 'visible' : 'hidden' }}
            >
              {render(screen, current)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
